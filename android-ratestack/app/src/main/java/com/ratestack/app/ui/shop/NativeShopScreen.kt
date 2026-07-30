package com.ratestack.app.ui.shop

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
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
import java.util.UUID

@Composable
fun NativeShopScreen(
    token: String?,
    onLogin: () -> Unit,
    onRegister: () -> Unit,
    onGoogleLogin: () -> Unit,
    onOrders: () -> Unit,
    modifier: Modifier = Modifier,
    embedded: Boolean = false,
) {
    var products by remember { mutableStateOf<List<ShopProductDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf<String?>(null) }
    var checkoutSelection by remember { mutableStateOf<Triple<ShopProductDto, Double, Int>?>(null) }
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
    fun checkout(product: ShopProductDto, request: ShopCheckoutRequestDto) {
        if (token.isNullOrBlank()) { onLogin(); return }
        val productId = product.productId ?: return
        if (busy != null) return
        busy = productId; errorMessage = null
        scope.launch {
            try {
                val config = ApiProvider.service.getPaymentConfig().body()
                if (config?.activeGateway.isNullOrBlank()) throw IllegalStateException("Payment service is not configured yet.")
                val response = ApiProvider.service.createShopCheckout("Bearer $token", request)
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
    val catalogueModifier = if (embedded) {
        modifier.fillMaxWidth()
    } else {
        modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 112.dp)
    }
    Column(catalogueModifier, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
            "Buy Certified Gold & Silver Coins at Live Trichy Rates",
            style = if (embedded) MaterialTheme.typography.headlineSmall else MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Black,
        )
        Text("Shop 22K Gold and Silver Coins at the current Tiruchirappalli market rate.")
        if (token.isNullOrBlank()) Column(Modifier.padding(top = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { Button(onClick = onLogin) { Text("Login") }; OutlinedButton(onClick = onRegister) { Text("Register") } }
            OutlinedButton(onClick = onGoogleLogin) { Text("Continue with Google") }
        }
        errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        if (loading) CircularProgressIndicator()
        products.forEach { product ->
            val id = product.productId.orEmpty()
            val weights = product.availableWeights.orEmpty()
            val selected = selections[id] ?: ((weights.firstOrNull() ?: 10.0) to 1)
            val key = if (selected.first % 1.0 == 0.0) selected.first.toInt().toString() else selected.first.toString()
            ShopCard(product, weights, selected.first, selected.second, product.prices?.get(key), busy == id,
                { selections[id] = it to selected.second }, { selections[id] = selected.first to it.coerceIn(1, 10) },
                { if (token.isNullOrBlank()) onLogin() else checkoutSelection = Triple(product, selected.first, selected.second) })
        }
    }
    checkoutSelection?.let { selected ->
        ShopCheckoutDialog(
            token = token.orEmpty(), product = selected.first, weight = selected.second, quantity = selected.third,
            onDismiss = { checkoutSelection = null },
            onConfirm = { request -> checkoutSelection = null; checkout(selected.first, request) },
        )
    }
}

@Composable
private fun ShopCheckoutDialog(token: String, product: ShopProductDto, weight: Double, quantity: Int, onDismiss: () -> Unit, onConfirm: (ShopCheckoutRequestDto) -> Unit) {
    var profile by remember { mutableStateOf(CustomerProfileDto(null, null, null, null, null, null)) }
    var saved by remember { mutableStateOf<List<ShopAddressDto>>(emptyList()) }
    var address by remember { mutableStateOf(ShopAddressDto(addressLine1="", city="", district="", state="", pincode="")) }
    var name by remember { mutableStateOf("") }; var mobile by remember { mutableStateOf("") }; var email by remember { mutableStateOf("") }
    var review by remember { mutableStateOf(false) }; var error by remember { mutableStateOf<String?>(null) }
    var gateway by remember { mutableStateOf("RAZORPAY") }
    LaunchedEffect(Unit) {
        runCatching {
            val auth = "Bearer $token"
            profile = ApiProvider.service.getCustomerProfile(auth).body()?.data ?: profile
            saved = ApiProvider.service.getDeliveryAddresses(auth).body()?.data.orEmpty()
        }.onSuccess {
            name = profile.fullName.orEmpty(); mobile = profile.phone.orEmpty(); email = profile.email.orEmpty()
            saved.firstOrNull()?.let { address = it }
            gateway = ApiProvider.service.getPaymentConfig().body()?.activeGateway ?: "RAZORPAY"
        }
    }
    val valid = name.trim().length >= 2 && Regex("^(?:\\+91)?[6-9]\\d{9}$").matches(mobile.trim()) &&
        android.util.Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches() && address.addressLine1.trim().length >= 3 &&
        address.city.isNotBlank() && address.district.isNotBlank() && address.state.isNotBlank() && Regex("^[1-9]\\d{5}$").matches(address.pincode)
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (review) "Review & Payment" else "Checkout Details", fontWeight = FontWeight.Black) },
        text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Text("Customer Details • Delivery Address • Order Review • Payment", style = MaterialTheme.typography.bodySmall)
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            if (!review) {
                CheckoutField("Full Name", name) { name = it }; CheckoutField("Indian Mobile Number", mobile) { mobile = it }
                CheckoutField("Email Address", email) { email = it }
                if (saved.isNotEmpty()) {
                    Text("Saved addresses", fontWeight = FontWeight.Bold)
                    saved.forEach { item -> OutlinedButton({ address = item }, Modifier.fillMaxWidth()) { Text("${item.addressType}: ${item.addressLine1}, ${item.city}") } }
                    OutlinedButton({ address = ShopAddressDto(addressLine1="", city="", district="", state="", pincode="") }, Modifier.fillMaxWidth()) { Text("Add a new address") }
                }
                CheckoutField("Address Line 1", address.addressLine1) { address = address.copy(addressLine1=it) }
                CheckoutField("Address Line 2 (optional)", address.addressLine2) { address = address.copy(addressLine2=it) }
                CheckoutField("Landmark (optional)", address.landmark) { address = address.copy(landmark=it) }
                CheckoutField("City", address.city) { address = address.copy(city=it) }; CheckoutField("District", address.district) { address = address.copy(district=it) }
                CheckoutField("State", address.state) { address = address.copy(state=it) }; CheckoutField("PIN Code", address.pincode) { address = address.copy(pincode=it.filter(Char::isDigit).take(6)) }
            } else {
                Text("${product.name} • ${weight.toInt()}g × $quantity", fontWeight = FontWeight.Black)
                Text("Purity: ${product.purity} • Live Trichy rate: ${money(product.ratePerGram ?: 0.0)}/g")
                Text("Source: ${product.rateSource ?: "Previous verified rate"} • ${product.rateDate ?: "Latest"}")
                Text("$name • $mobile • $email"); Text("${address.addressLine1}, ${address.city}, ${address.district}, ${address.state} – ${address.pincode}, India")
                Text("Payment method: $gateway", fontWeight = FontWeight.Bold)
                Text("Gateway opens only after you confirm below.", style = MaterialTheme.typography.bodySmall)
            }
        } },
        confirmButton = { Button({
            if (!review) { if (valid) { error = null; review = true } else error = "Complete all required fields with a valid mobile number and six-digit PIN code." }
            else onConfirm(ShopCheckoutRequestDto(product.productId.orEmpty(), weight, quantity, gateway, UUID.randomUUID().toString(), ShopCustomerDto(name.trim(), mobile.trim(), email.trim()), address.copy(saveAddress = address.id == null)))
        }, enabled = review || valid) { Text(if (review) "Confirm & Pay" else "Review Order") } },
        dismissButton = { TextButton(if (review) ({ review = false }) else onDismiss) { Text(if (review) "Edit Details" else "Cancel") } },
    )
}

@Composable private fun CheckoutField(label: String, value: String, onValue: (String) -> Unit) {
    OutlinedTextField(value, onValue, Modifier.fillMaxWidth(), label = { Text(label) }, singleLine = true)
}

@Composable
private fun ShopCard(product: ShopProductDto, weights: List<Double>, weight: Double, quantity: Int, unit: ShopPriceDto?, busy: Boolean, onWeight: (Double) -> Unit, onQuantity: (Int) -> Unit, onBuy: () -> Unit) {
    Card(Modifier.fillMaxWidth(), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val raw = product.imageUrl.orEmpty()
            AsyncImage(if (raw.startsWith("http")) raw else BuildConfig.WEBSITE_URL.trimEnd('/') + raw, product.name, Modifier.fillMaxWidth().height(220.dp).padding(22.dp), contentScale = ContentScale.Fit)
            Text(product.name.orEmpty(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
            Text(product.description.orEmpty())
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Purity: ${product.purity ?: "Verified"}", fontWeight = FontWeight.Bold)
                Text("In stock", color = Color(0xFF15803D), fontWeight = FontWeight.Bold)
            }
            Text("Weight: ${weight.toInt()}g", fontWeight = FontWeight.Bold)
            Text("Live Trichy rate: ${money(product.ratePerGram ?: 0.0)} / g", fontWeight = FontWeight.Bold)
            Text("Source: ${product.rateSource ?: "Previous verified rate"}")
            Text("${product.rateSourceType?.replace('_', ' ') ?: "Market reference rate"} - ${product.rateDate ?: "Date unavailable"}")
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
