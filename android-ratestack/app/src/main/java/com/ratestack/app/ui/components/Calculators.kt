package com.ratestack.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ratestack.app.data.GoldRate
import com.ratestack.app.data.SILVER_WEIGHT_OPTIONS
import com.ratestack.app.data.SilverRate
import com.ratestack.app.data.silverWeightLabel
import java.math.BigDecimal
import java.math.RoundingMode
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoldCalculatorCard(
    goldRates: List<GoldRate>,
    modifier: Modifier = Modifier,
) {
    var selectedPurity by remember(goldRates) { mutableStateOf(goldRates.firstOrNull()?.purity ?: "24K") }
    var weightInput by remember { mutableStateOf("10") }

    val activeRate = goldRates.firstOrNull { it.purity.equals(selectedPurity, ignoreCase = true) }
        ?: goldRates.firstOrNull()
    val ratePerGram = activeRate?.pricePerGram ?: 0.0

    val weight = weightInput.toDoubleOrNull()?.coerceAtLeast(0.0) ?: 0.0
    val estimatedValue = BigDecimal.valueOf(ratePerGram)
        .multiply(BigDecimal.valueOf(weight))
        .setScale(0, RoundingMode.HALF_UP)
        .toDouble()

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = Color(0xFF201C18),
        border = BorderStroke(1.dp, Color(0x33E2AD3D)),
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(
                "Gold Price Calculator",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
                color = Color(0xFFF5C96A),
            )
            Text(
                "Estimate metal value using current indicative rate (excluding making & GST).",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFFD6D3D1),
            )

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(Modifier.weight(1f)) {
                    Text("Purity", style = MaterialTheme.typography.labelMedium, color = Color.Gray)
                    Spacer(Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        goldRates.forEach { rate ->
                            val isSelected = rate.purity.equals(selectedPurity, ignoreCase = true)
                            FilterChip(
                                selected = isSelected,
                                onClick = { selectedPurity = rate.purity },
                                label = { Text(rate.purity, fontWeight = FontWeight.Bold) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Color(0xFFE2AD3D),
                                    selectedLabelColor = Color(0xFF141210),
                                    containerColor = Color(0xFF2A241F),
                                    labelColor = Color.White,
                                ),
                            )
                        }
                    }
                }
            }

            OutlinedTextField(
                value = weightInput,
                onValueChange = { input ->
                    if (input.isEmpty() || input.matches(Regex("^\\d*\\.?\\d*$"))) {
                        weightInput = input
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Weight (grams)") },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFFE2AD3D),
                    unfocusedBorderColor = Color(0x66E2AD3D),
                    focusedLabelColor = Color(0xFFF5C96A),
                    unfocusedLabelColor = Color.Gray,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                ),
            )

            Surface(
                color = Color(0xFF141210),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, Color(0x33E2AD3D)),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text("Estimated Metal Value", color = Color(0xFFF5C96A), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("Rate: ₹${formatInr(ratePerGram)}/g", color = Color.Gray, fontSize = 11.sp)
                    }
                    Text(
                        "₹${formatInr(estimatedValue)}",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SilverCalculatorCard(
    silverRate: SilverRate?,
    cityName: String,
    modifier: Modifier = Modifier,
) {
    var selectedWeightGrams by remember { mutableStateOf(10) }
    val pricePerGram = silverRate?.pricePerGram ?: 0.0

    val estimatedValue = BigDecimal.valueOf(pricePerGram)
        .multiply(BigDecimal.valueOf(selectedWeightGrams.toLong()))
        .setScale(0, RoundingMode.HALF_UP)
        .toDouble()

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = Color(0xFF1E2638),
        border = BorderStroke(1.dp, Color(0x3394A3B8)),
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text(
                        "Silver 999 Calculator",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF93C5FD),
                    )
                    Text(
                        "Flexible silver weight calculator for $cityName",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF94A3B8),
                    )
                }
            }

            Text("Select Weight", style = MaterialTheme.typography.labelMedium, color = Color.Gray)
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                SILVER_WEIGHT_OPTIONS.forEach { grams ->
                    val isSelected = grams == selectedWeightGrams
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedWeightGrams = grams },
                        label = { Text(silverWeightLabel(grams), fontWeight = FontWeight.Bold) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFF38BDF8),
                            selectedLabelColor = Color(0xFF0F172A),
                            containerColor = Color(0xFF0F172A),
                            labelColor = Color.White,
                        ),
                    )
                }
            }

            Surface(
                color = Color(0xFF0F172A),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, Color(0x3338BDF8)),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Selected Weight", color = Color.Gray, fontSize = 12.sp)
                        Text(silverWeightLabel(selectedWeightGrams), color = Color.White, fontWeight = FontWeight.Bold)
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Price Per Gram", color = Color.Gray, fontSize = 12.sp)
                        Text("₹${formatInr(pricePerGram)}", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                    Divider(color = Color(0x2238BDF8))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Calculated Silver Value", color = Color(0xFF38BDF8), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text("₹${formatInr(estimatedValue)}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black, color = Color(0xFF38BDF8))
                    }
                }
            }
        }
    }
}
