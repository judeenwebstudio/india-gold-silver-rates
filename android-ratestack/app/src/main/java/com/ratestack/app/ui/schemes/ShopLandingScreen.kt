package com.ratestack.app.ui.schemes

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.painter.ColorPainter
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.ratestack.app.BuildConfig
import com.ratestack.app.data.ApiProvider
import com.ratestack.app.data.ShopProductDto

@Composable
fun ShopLandingScreen(
    isLoggedIn: Boolean,
    onLogin: () -> Unit,
    onRegister: () -> Unit,
    onOpenShop: () -> Unit,
) {
    var products by remember { mutableStateOf<List<ShopProductDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        runCatching { ApiProvider.service.getShop() }
            .onSuccess { products = it.body()?.data?.products.orEmpty().filter { product -> product.enabled != false } }
        loading = false
    }
    Column(modifier = Modifier.fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Shop", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black)
        Text("Direct coin purchase using the live Trichy rate for every customer.", color = Color.Gray)
        if (loading) CircularProgressIndicator()
        val visibleProducts = products.ifEmpty { listOf(
            ShopProductDto("shop-gold-22k", "Gold 22K Coin", "Hallmarked 22K gold coin.", "/products/gold-22k-coin.webp", listOf(1.0,2.0,4.0,8.0,10.0,20.0,50.0), 5.0, 3.0, true),
            ShopProductDto("shop-silver-999", "Silver Coin", "Fine silver coin.", "/products/silver-coin.webp", listOf(10.0,20.0,50.0,100.0,250.0,500.0,1000.0), 5.0, 3.0, true),
        ) }
        visibleProducts.forEach { product ->
            val isGold = product.name?.contains("Gold") == true
            Card(colors = CardDefaults.cardColors(containerColor = if (isGold) Color(0xFFFFF3C4) else Color(0xFFE2E8F0)), shape = RoundedCornerShape(20.dp)) {
                Column(modifier = Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    val rawImage = product.imageUrl ?: if (isGold) "/products/gold-22k-coin.webp" else "/products/silver-coin.webp"
                    val imageUrl = if (rawImage.startsWith("http")) rawImage else "${BuildConfig.WEBSITE_URL.trimEnd('/')}$rawImage"
                    AsyncImage(model = imageUrl, contentDescription = product.name, modifier = Modifier.fillMaxWidth().aspectRatio(1f), contentScale = androidx.compose.ui.layout.ContentScale.Fit, placeholder = ColorPainter(Color(0xFFE7E5E4)), error = ColorPainter(if (isGold) Color(0xFFFDE68A) else Color(0xFFCBD5E1)))
                    Text(product.name.orEmpty(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Text(product.availableWeights.orEmpty().joinToString(" · ") { if (it >= 1000) "${it / 1000}kg" else "${it.toInt()}g" })
                    Text("Metal value + ${product.serviceChargePercent ?: 5.0}% service charge + ${product.gstPercent ?: 3.0}% GST", style = MaterialTheme.typography.bodySmall)
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
