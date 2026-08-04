package com.ratestack.app.ui.shop

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.rememberAsyncImagePainter
import com.ratestack.app.data.ShopProductDto
import java.math.BigDecimal
import java.math.RoundingMode
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailsScreen(
    product: ShopProductDto,
    cityName: String,
    liveRatePerGram: Double,
    isWishlisted: Boolean,
    onToggleWishlist: () -> Unit,
    onAddToCart: (ShopProductDto, Double, Int) -> Unit,
    onBuyNow: (ShopProductDto, Double, Int) -> Unit,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val weights = product.availableWeights ?: listOf(1.0)
    var selectedWeightGrams by remember {
        mutableDoubleStateOf(weights.firstOrNull() ?: 1.0)
    }
    var quantity by remember { mutableIntStateOf(1) }

    val rate = if (liveRatePerGram > 0) liveRatePerGram else (product.ratePerGram ?: 0.0)
    val metalValue = BigDecimal.valueOf(rate).multiply(BigDecimal.valueOf(selectedWeightGrams)).setScale(2, RoundingMode.HALF_UP).toDouble()
    val serviceCharge = ((product.serviceChargePercent ?: 0.0) / 100.0) * metalValue
    val gst = BigDecimal.valueOf(metalValue + serviceCharge).multiply(BigDecimal.valueOf(0.03)).setScale(2, RoundingMode.HALF_UP).toDouble()
    val totalPerUnit = metalValue + serviceCharge + gst
    val grandTotal = totalPerUnit * quantity

    val formattedTotal = NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(grandTotal)
    val formattedRate = NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(rate)
    val productName = product.name.orEmpty()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A)),
    ) {
        TopAppBar(
            title = { Text(productName, maxLines = 1, fontWeight = FontWeight.Bold, color = Color.White) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
            },
            actions = {
                IconButton(onClick = onToggleWishlist) {
                    Icon(
                        imageVector = if (isWishlisted) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "Wishlist",
                        tint = if (isWishlisted) Color(0xFFEF4444) else Color.White,
                    )
                }
                IconButton(onClick = {
                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_SUBJECT, productName)
                        putExtra(Intent.EXTRA_TEXT, "Check out $productName on RateStack: $formattedTotal")
                    }
                    context.startActivity(Intent.createChooser(shareIntent, "Share product"))
                }) {
                    Icon(Icons.Default.Share, contentDescription = "Share", tint = Color.White)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E2638)),
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Image Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2638)),
                border = BorderStroke(1.dp, Color(0x33E2AD3D)),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(240.dp)
                        .background(Color(0xFF1C1917)),
                    contentAlignment = Alignment.Center,
                ) {
                    Image(
                        painter = rememberAsyncImagePainter(product.imageUrl),
                        contentDescription = productName,
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(16.dp)),
                        contentScale = ContentScale.Fit,
                    )
                }
            }

            // Title & Metal Specs
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = Color(0xFF334155),
                    ) {
                        Text(
                            text = "${product.metalType.orEmpty()} • ${product.purity.orEmpty()}",
                            style = MaterialTheme.typography.labelMedium,
                            color = Color(0xFFE2AD3D),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    Text("Live: $formattedRate/g", color = Color(0xFF38BDF8), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(productName, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color.White)
                Text("Indicative pricing for $cityName", style = MaterialTheme.typography.bodySmall, color = Color(0xFF94A3B8))
            }

            // Weight Selector
            if (weights.isNotEmpty()) {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2638)),
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Select Weight", style = MaterialTheme.typography.labelLarge, color = Color.White, fontWeight = FontWeight.Bold)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            weights.forEach { w ->
                                val selected = w == selectedWeightGrams
                                FilterChip(
                                    selected = selected,
                                    onClick = { selectedWeightGrams = w },
                                    label = { Text("${w}g", fontWeight = FontWeight.Bold) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = Color(0xFFE2AD3D),
                                        selectedLabelColor = Color.Black,
                                        containerColor = Color(0xFF0F172A),
                                        labelColor = Color.White,
                                    ),
                                )
                            }
                        }
                    }
                }
            }

            // Price Breakdown Card
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2638)),
                border = BorderStroke(1.dp, Color(0x3338BDF8)),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Price Breakdown (${selectedWeightGrams}g x $quantity)", style = MaterialTheme.typography.titleMedium, color = Color(0xFF38BDF8), fontWeight = FontWeight.Bold)
                    PriceRow("Metal Value", NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(metalValue * quantity))
                    PriceRow("Service Charge", NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(serviceCharge * quantity))
                    PriceRow("GST (3%)", NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(gst * quantity))
                    PriceRow("Shipping", "FREE")
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text("Grand Total", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp)
                        Text(formattedTotal, fontWeight = FontWeight.Black, color = Color(0xFFE2AD3D), fontSize = 18.sp)
                    }
                }
            }

            // Product Description & Trust Badges
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2638)),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Description & Trust Guarantee", style = MaterialTheme.typography.titleSmall, color = Color.White, fontWeight = FontWeight.Bold)
                    Text(
                        product.description ?: "100% BIS Hallmarked certified genuine gold & silver directly sourced from verified Indian refiners.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFFCBD5E1),
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF22C55E), modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("BIS Hallmarked • Fully Insured Delivery • Tamper Proof", style = MaterialTheme.typography.bodySmall, color = Color(0xFF94A3B8))
                    }
                }
            }
        }

        // Bottom CTA Bar
        Surface(
            color = Color(0xFF1E2638),
            tonalElevation = 8.dp,
            border = BorderStroke(1.dp, Color(0x33E2AD3D)),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                OutlinedButton(
                    onClick = { onAddToCart(product, selectedWeightGrams, quantity) },
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color(0xFFE2AD3D)),
                ) {
                    Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = Color(0xFFE2AD3D), modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Add to Cart", color = Color(0xFFE2AD3D), fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = { onBuyNow(product, selectedWeightGrams, quantity) },
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE2AD3D)),
                ) {
                    Text("Buy Now", color = Color.Black, fontWeight = FontWeight.Black, fontSize = 16.sp)
                }
            }
        }
    }
}

@Composable
private fun PriceRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, color = Color(0xFF94A3B8), fontSize = 13.sp)
        Text(value, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}
