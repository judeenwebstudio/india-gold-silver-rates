package com.ratestack.app.ui.schemes

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun ShopLandingScreen(
    isLoggedIn: Boolean,
    onLogin: () -> Unit,
    onRegister: () -> Unit,
    onOpenShop: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Shop", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black)
        Text("Direct coin purchase using the live Trichy rate for every customer.", color = Color.Gray)
        listOf(
            Triple("Gold 22K Coin", "1g · 2g · 4g · 8g · 10g · 20g · 50g", Color(0xFFFFF3C4)),
            Triple("Silver Coin", "10g · 20g · 50g · 100g · 250g · 500g · 1kg", Color(0xFFE2E8F0)),
        ).forEach { product ->
            Card(colors = CardDefaults.cardColors(containerColor = product.third), shape = RoundedCornerShape(20.dp)) {
                Column(modifier = Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(product.first, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Text(product.second)
                    Text("Metal value + 5% service charge + 3% GST", style = MaterialTheme.typography.bodySmall)
                    Button(onClick = if (isLoggedIn) onOpenShop else onLogin, modifier = Modifier.fillMaxWidth()) {
                        Text(if (isLoggedIn) "Select Weight & Buy Now" else "Login to Buy")
                    }
                }
            }
        }
        if (!isLoggedIn) {
            OutlinedButton(onClick = onRegister, modifier = Modifier.fillMaxWidth()) { Text("Don't have an account? Register") }
        }
    }
}
