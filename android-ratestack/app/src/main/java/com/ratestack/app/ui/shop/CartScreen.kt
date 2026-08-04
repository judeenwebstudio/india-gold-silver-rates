package com.ratestack.app.ui.shop

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.rememberAsyncImagePainter
import com.ratestack.app.data.CartItem
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartScreen(
    items: List<CartItem>,
    liveRatesMap: Map<String, Double>,
    onUpdateQuantity: (String, Double, Int) -> Unit,
    onRemoveItem: (String, Double) -> Unit,
    onProceedToCheckout: () -> Unit,
    onShopMore: () -> Unit,
    onBack: () -> Unit,
) {
    val grandTotal = items.sumOf { item ->
        val metalKey = item.product.metalType?.uppercase().orEmpty()
        val rate = liveRatesMap[metalKey] ?: (item.product.ratePerGram ?: 0.0)
        item.calculateTotal(rate)
    }
    val formattedGrandTotal = NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(grandTotal)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A)),
    ) {
        TopAppBar(
            title = { Text("Your Cart (${items.size})", fontWeight = FontWeight.Bold, color = Color.White) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E2638)),
        )

        if (items.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = Color(0xFFE2AD3D), modifier = Modifier.size(64.dp))
                Spacer(modifier = Modifier.height(16.dp))
                Text("Your Cart is Empty", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color.White)
                Text("Explore live rates and gold/silver products in our Shop.", color = Color(0xFF94A3B8), modifier = Modifier.padding(top = 8.dp, bottom = 24.dp))
                Button(
                    onClick = onShopMore,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE2AD3D)),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Text("Explore Shop", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 16.dp),
                contentPadding = PaddingValues(top = 16.dp, bottom = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(items) { item ->
                    val metalKey = item.product.metalType?.uppercase().orEmpty()
                    val rate = liveRatesMap[metalKey] ?: (item.product.ratePerGram ?: 0.0)
                    val itemTotal = item.calculateTotal(rate)
                    val formattedItemTotal = NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(itemTotal)
                    val pId = item.product.productId.orEmpty()
                    val pName = item.product.name.orEmpty()

                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2638)),
                        border = BorderStroke(1.dp, Color(0x33E2AD3D)),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Image(
                                painter = rememberAsyncImagePainter(item.product.imageUrl),
                                contentDescription = pName,
                                modifier = Modifier
                                    .size(70.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFF1C1917)),
                                contentScale = ContentScale.Fit,
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(pName, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp, maxLines = 1)
                                Text("${item.product.metalType.orEmpty()} • ${item.product.purity.orEmpty()} • ${item.selectedWeightGrams}g", color = Color(0xFF94A3B8), fontSize = 12.sp)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(formattedItemTotal, fontWeight = FontWeight.Black, color = Color(0xFFE2AD3D), fontSize = 15.sp)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                IconButton(onClick = { onRemoveItem(pId, item.selectedWeightGrams) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Remove", tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconButton(
                                        onClick = { onUpdateQuantity(pId, item.selectedWeightGrams, item.quantity - 1) },
                                        modifier = Modifier.size(28.dp),
                                    ) {
                                        Text("-", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                    }
                                    Text("${item.quantity}", color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp))
                                    IconButton(
                                        onClick = { onUpdateQuantity(pId, item.selectedWeightGrams, item.quantity + 1) },
                                        modifier = Modifier.size(28.dp),
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = "Increase", tint = Color.White, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Surface(
                color = Color(0xFF1E2638),
                tonalElevation = 8.dp,
                border = BorderStroke(1.dp, Color(0x33E2AD3D)),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text("Subtotal", color = Color(0xFF94A3B8))
                        Text(formattedGrandTotal, fontWeight = FontWeight.Black, color = Color(0xFFE2AD3D), fontSize = 18.sp)
                    }
                    Button(
                        onClick = onProceedToCheckout,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE2AD3D)),
                    ) {
                        Text("Proceed to Checkout", color = Color.Black, fontWeight = FontWeight.Black, fontSize = 16.sp)
                    }
                }
            }
        }
    }
}
