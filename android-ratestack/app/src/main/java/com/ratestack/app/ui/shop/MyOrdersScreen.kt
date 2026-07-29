package com.ratestack.app.ui.shop

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ratestack.app.data.ApiProvider
import com.ratestack.app.data.ShopOrderDto
import java.text.NumberFormat
import java.util.Locale

@Composable
fun MyOrdersScreen(token: String?, onLogin: () -> Unit, onRegister: () -> Unit, onGoogleLogin: () -> Unit) {
    var orders by remember { mutableStateOf<List<ShopOrderDto>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(token) {
        if (token.isNullOrBlank()) return@LaunchedEffect
        loading = true
        runCatching { ApiProvider.service.getShopOrders("Bearer $token") }
            .onSuccess { response -> if (response.isSuccessful) orders = response.body()?.data.orEmpty() else error = response.body()?.error?.message ?: "Unable to load orders." }
            .onFailure { error = "Unable to load orders." }
        loading = false
    }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 112.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("My Orders", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black)
            if (token.isNullOrBlank()) {
                Text("Login or register to view your direct coin orders.", Modifier.padding(vertical = 12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { Button(onLogin) { Text("Login") }; OutlinedButton(onRegister) { Text("Register") } }
                OutlinedButton(onGoogleLogin) { Text("Continue with Google") }
            }
            if (loading) CircularProgressIndicator(Modifier.padding(top = 12.dp))
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            if (!token.isNullOrBlank() && !loading && orders.isEmpty()) Text("No Shop orders yet.", Modifier.padding(top = 16.dp))
        }
        items(orders, key = { it.id.orEmpty() }) { order ->
            Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text(order.orderNumber.orEmpty(), fontWeight = FontWeight.Black)
                Text("${order.product} · ${order.weightGrams?.toInt()}g × ${order.quantity}")
                Text(NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(order.total ?: 0.0), fontWeight = FontWeight.Bold)
                Text("Payment: ${order.paymentStatus} · Order: ${order.orderStatus}")
                Text("Date: ${order.createdAt ?: "—"}")
                Text("Invoice: ${order.invoiceNumber ?: "Pending"}")
            } }
        }
    }
}
