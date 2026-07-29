package com.ratestack.app.ui.shop

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.ratestack.app.BuildConfig
import com.ratestack.app.MainActivity
import com.ratestack.app.data.*
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

@Composable
fun NativeShopScreen(token: String?, onLogin: () -> Unit, onRegister: () -> Unit, onGoogleLogin: () -> Unit, onOrders: () -> Unit) {
    var products by remember { mutableStateOf<List<ShopProductDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf<String?>(null) }
    val selections = remember { mutableStateMapOf<String, Pair<Double, Int>>() }
    val scope = rememberCoroutineScope()
    val activity = LocalContext.current as? MainActivity
    LaunchedEffect(Unit) {
        runCatching { ApiProvider.service.getShop() }.onSuccess { response ->
            products = response.body()?.data?.products.orEmpty().filter { it.enabled != false }
            products.forEach { p -> p.productId?.let { selections[it] = (p.availableWeights?.firstOrNull() ?: 10.0) to 1 } }
        }.onFailure { errorMessage = "Unable to load Shop products." }
        loading = false
    }
    fun checkout(product: ShopProductDto, weight: Double, quantity: Int) {
        if (token.isNullOrBlank()) { onLogin(); return }
        val productId = product.productId ?: return
        if (busy != null) return
        busy = productId; errorMessage = null
        scope.launch {
            try {
                val config = ApiProvider.service.getPaymentConfig().body()
                if (config?.activeGateway.isNullOrBlank()) throw IllegalStateException("Payment service is not configured yet.")
                val response = ApiProvider.service.createShopCheckout("Bearer $token", ShopCheckoutRequestDto(productId, weight, quantity))
                val order = response.body()?.data
                if (!response.isSuccessful || order == null) throw IllegalStateException(response.body()?.error?.message ?: "Unable to create Shop order.")
                if (order.gateway == "RAZORPAY") {
                    if (activity == null || order.keyId.isNullOrBlank() || order.gatewayOrderId.isNullOrBlank() || order.shopOrderId.isNullOrBlank()) throw IllegalStateException("Razorpay is not configured.")
                    activity.startRazorpayCheckout(order.keyId, order.gatewayOrderId, ((order.amount ?: 0.0) * 100).toLong(), { paymentId, signature ->
                        scope.launch {
                            val verified = ApiProvider.service.verifyShopPayment("Bearer $token", ShopVerifyRequestDto(order.shopOrderId, paymentId, signature))
                            if (verified.isSuccessful && verified.body()?.success == true) onOrders() else errorMessage = verified.body()?.error?.message ?: "Payment verification failed."
                            busy = null
                        }
                    }, { message -> errorMessage = message ?: "Payment failed."; busy = null })
                } else {
                    val redirect = order.redirectUrl ?: throw IllegalStateException("PhonePe checkout is unavailable.")
                    activity?.startPhonePePaymentSheet(redirect, order.gatewayOrderId.orEmpty(), { onOrders(); busy = null }, { message -> errorMessage = message; busy = null })
                        ?: throw IllegalStateException("PhonePe checkout is unavailable.")
                }
            } catch (exception: Exception) { errorMessage = exception.message ?: "Checkout failed."; busy = null }
        }
    }
    LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 112.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Text("Shop", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black)
            Text("Gold and Silver coins priced using the live Tiruchirappalli rate.")
            if (token.isNullOrBlank()) Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { Button(onClick = onLogin) { Text("Login") }; OutlinedButton(onClick = onRegister) { Text("Register") } }
                OutlinedButton(onClick = onGoogleLogin) { Text("Continue with Google") }
            }
            errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            if (loading) CircularProgressIndicator()
        }
        items(products, key = { it.productId.orEmpty() }) { product ->
            val id = product.productId.orEmpty()
            val weights = product.availableWeights.orEmpty()
            val selected = selections[id] ?: ((weights.firstOrNull() ?: 10.0) to 1)
            val key = if (selected.first % 1.0 == 0.0) selected.first.toInt().toString() else selected.first.toString()
            ShopCard(product, weights, selected.first, selected.second, product.prices?.get(key), busy == id,
                { selections[id] = it to selected.second }, { selections[id] = selected.first to it.coerceIn(1, 10) },
                { checkout(product, selected.first, selected.second) })
        }
    }
}

@Composable
private fun ShopCard(product: ShopProductDto, weights: List<Double>, weight: Double, quantity: Int, unit: ShopPriceDto?, busy: Boolean, onWeight: (Double) -> Unit, onQuantity: (Int) -> Unit, onBuy: () -> Unit) {
    Card(Modifier.fillMaxWidth(), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val raw = product.imageUrl.orEmpty()
            AsyncImage(if (raw.startsWith("http")) raw else BuildConfig.WEBSITE_URL.trimEnd('/') + raw, product.name, Modifier.fillMaxWidth().height(220.dp).padding(22.dp), contentScale = ContentScale.Fit)
            Text(product.name.orEmpty(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
            Text(product.description.orEmpty())
            Text("Live Trichy rate: ${money(product.ratePerGram ?: 0.0)} / g", fontWeight = FontWeight.Bold)
            Text("Available weights", fontWeight = FontWeight.Bold)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { weights.forEach { option -> if (option == weight) Button({ onWeight(option) }) { Text("${option.toInt()}g") } else OutlinedButton({ onWeight(option) }) { Text("${option.toInt()}g") } } }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Quantity", fontWeight = FontWeight.Bold); OutlinedButton({ onQuantity(quantity - 1) }, enabled = quantity > 1) { Text("−") }; Text("$quantity", fontWeight = FontWeight.Black); OutlinedButton({ onQuantity(quantity + 1) }, enabled = quantity < 10) { Text("+") }
            }
            unit?.let { price ->
                Surface(color = Color(0xFF1C1917)) { Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    PriceRow("Metal Value", money((price.metalValue ?: 0.0) * quantity)); PriceRow("Service Charge", money((price.serviceCharge ?: 0.0) * quantity)); PriceRow("GST (3%)", money((price.gst ?: 0.0) * quantity)); PriceRow("Shipping Cost", "FREE", Color(0xFF6EE7B7)); Divider(); PriceRow("Total Payable", money((price.total ?: 0.0) * quantity), Color(0xFFFCD34D))
                } }
            }
            Button(onBuy, Modifier.fillMaxWidth().heightIn(min = 52.dp), enabled = !busy, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE2AD3D), contentColor = Color(0xFF292015))) {
                if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Icon(Icons.Default.ShoppingCart, null); Spacer(Modifier.width(8.dp)); Text(if (busy) "Preparing…" else "Buy Now", fontWeight = FontWeight.Black)
            }
        }
    }
}
@Composable private fun PriceRow(label: String, value: String, color: Color = Color.White) { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(label, color = Color.White); Text(value, color = color, fontWeight = FontWeight.Bold) } }
private fun money(value: Double) = NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(value)
