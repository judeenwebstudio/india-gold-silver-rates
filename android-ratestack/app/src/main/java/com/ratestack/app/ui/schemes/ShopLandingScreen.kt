package com.ratestack.app.ui.schemes

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.painter.ColorPainter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.ratestack.app.BuildConfig
import com.ratestack.app.data.ApiProvider
import com.ratestack.app.data.ShopProductDto
import java.text.NumberFormat
import java.util.Locale

@Composable
fun ShopLandingScreen(
    isLoggedIn: Boolean,
    onLogin: () -> Unit,
    onRegister: () -> Unit,
    onOpenShop: () -> Unit,
) {
    var products by remember { mutableStateOf<List<ShopProductDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var openingProductId by remember { mutableStateOf<String?>(null) }
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
            ShopProductDto("shop-gold-22k", "Gold 22K Coin", "GOLD", "22K", "Hallmarked 22K gold coin.", "/products/gold-22k-coin.webp", listOf(1.0,2.0,4.0,8.0,10.0,20.0,50.0), 5.0, 3.0, true),
            ShopProductDto("shop-silver-999", "Silver Coin", "SILVER", "999", "Fine silver coin.", "/products/silver-coin.webp", listOf(1.0,2.0,4.0,8.0,10.0,20.0,50.0,100.0,250.0,500.0,1000.0), 5.0, 3.0, true),
        ) }
        visibleProducts.forEach { product ->
            val isGold = product.name?.contains("Gold") == true
            Card(
                modifier = Modifier.fillMaxWidth().shadow(7.dp, RoundedCornerShape(20.dp)),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, Color(0xFFE7E5E4)),
            ) {
                Column(modifier = Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    val rawImage = product.imageUrl ?: if (isGold) "/products/gold-22k-coin.webp" else "/products/silver-coin.webp"
                    val imageUrl = if (rawImage.startsWith("http")) rawImage else "${BuildConfig.WEBSITE_URL.trimEnd('/')}$rawImage"
                    Surface(
                        modifier = Modifier.shadow(5.dp, RoundedCornerShape(16.dp)),
                        color = Color(0xFFFAFAF9),
                        shape = RoundedCornerShape(16.dp),
                    ) {
                        Box(
                            modifier = Modifier.fillMaxWidth().height(220.dp).padding(24.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            AsyncImage(
                                model = imageUrl,
                                contentDescription = product.name,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Fit,
                                placeholder = ColorPainter(Color(0xFFE7E5E4)),
                                error = ColorPainter(if (isGold) Color(0xFFFDE68A) else Color(0xFFCBD5E1)),
                            )
                            Box(
                                modifier = Modifier
                                    .matchParentSize()
                                    .background(
                                        Brush.linearGradient(
                                            listOf(Color.Transparent, Color.White.copy(alpha = 0.10f), Color.Transparent),
                                        ),
                                    ),
                            )
                        }
                    }
                    Text(product.name.orEmpty(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Text(product.availableWeights.orEmpty().joinToString(" · ") { if (it >= 1000) "${it / 1000}kg" else "${it.toInt()}g" })
                    val firstWeight = product.availableWeights.orEmpty().firstOrNull()
                    val priceKey = firstWeight?.let { if (it % 1.0 == 0.0) it.toInt().toString() else it.toString() }
                    val price = priceKey?.let { product.prices?.get(it) }
                    if (price != null) {
                        Surface(
                            color = Color(0xFF1C1917),
                            shape = RoundedCornerShape(14.dp),
                        ) {
                            Column(
                                modifier = Modifier.fillMaxWidth().padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(7.dp),
                            ) {
                                ShopPriceRow("Metal Value", formatShopAmount(price.metalValue))
                                ShopPriceRow("Service Charge", formatShopAmount(price.serviceCharge))
                                ShopPriceRow("GST (3%)", formatShopAmount(price.gst))
                                ShopPriceRow(
                                    "Shipping Cost",
                                    if ((price.shipping ?: 0.0) == 0.0) "FREE" else formatShopAmount(price.shipping),
                                    valueColor = Color(0xFF6EE7B7),
                                )
                                Divider(color = Color(0xFF57534E))
                                ShopPriceRow(
                                    "Total Payable",
                                    formatShopAmount(price.total),
                                    valueColor = Color(0xFFFCD34D),
                                    bold = true,
                                )
                            }
                        }
                    }
                    PremiumShopButton(
                        text = if (isLoggedIn) "Select Weight & Buy Now" else "Login to Buy",
                        loading = openingProductId == product.productId,
                        enabled = openingProductId == null,
                        onClick = {
                            if (openingProductId == null) {
                                openingProductId = product.productId
                                if (isLoggedIn) onOpenShop() else onLogin()
                            }
                        },
                    )
                }
            }
        }
        if (!isLoggedIn) {
            OutlinedButton(onClick = onRegister, modifier = Modifier.fillMaxWidth()) { Text("Don't have an account? Register") }
        }
    }
}

@Composable
private fun ShopPriceRow(
    label: String,
    value: String,
    valueColor: Color = Color.White,
    bold: Boolean = false,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, color = Color(0xFFE7E5E4), fontWeight = if (bold) FontWeight.Black else FontWeight.Normal)
        Text(value, color = valueColor, fontWeight = FontWeight.Black)
    }
}

private fun formatShopAmount(amount: Double?): String =
    NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(amount ?: 0.0)

@Composable
private fun PremiumShopButton(
    text: String,
    loading: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.985f else 1f, label = "shopButtonPress")
    val shape = RoundedCornerShape(14.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 50.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .shadow(if (pressed) 4.dp else 9.dp, shape)
            .clip(shape)
            .background(
                Brush.horizontalGradient(
                    listOf(Color(0xFFB97912), Color(0xFFE2AD3D), Color(0xFFF2CC72)),
                ),
            )
            .clickable(
                enabled = enabled,
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick,
            )
            .padding(horizontal = 20.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                strokeWidth = 2.dp,
                color = Color(0xFF292015),
            )
            Spacer(Modifier.width(9.dp))
        } else {
            Icon(
                imageVector = Icons.Default.ShoppingCart,
                contentDescription = null,
                tint = Color(0xFF292015),
            )
            Spacer(Modifier.width(8.dp))
        }
        Text(
            if (loading) "Preparing…" else text,
            color = Color(0xFF292015),
            fontWeight = FontWeight.Black,
        )
    }
}
