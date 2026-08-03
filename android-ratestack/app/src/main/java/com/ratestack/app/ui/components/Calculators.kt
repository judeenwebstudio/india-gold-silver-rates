package com.ratestack.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoldCalculatorCard(
    goldRates: List<GoldRate>,
    modifier: Modifier = Modifier,
) {
    var selectedPurity by remember(goldRates) { mutableStateOf(goldRates.firstOrNull()?.purity ?: "22K") }
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
        shape = RoundedCornerShape(16.dp),
        color = Color(0xFF201C18),
        border = BorderStroke(1.dp, Color(0x33E2AD3D)),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Gold Price Calculator",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, fontSize = 16.sp),
                    color = Color(0xFFF5C96A),
                )
                Text(
                    "Excl. making & GST",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.Gray,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    listOf("22K", "24K", "18K").forEach { purity ->
                        val isSelected = purity.equals(selectedPurity, ignoreCase = true)
                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedPurity = purity },
                            label = { Text(purity, fontWeight = FontWeight.Bold, fontSize = 12.sp) },
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

            OutlinedTextField(
                value = weightInput,
                onValueChange = { input ->
                    if (input.isEmpty() || input.matches(Regex("^\\d*\\.?\\d*$"))) {
                        weightInput = input
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Weight in grams") },
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
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Color(0x33E2AD3D)),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text("Estimated Value", color = Color(0xFFF5C96A), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("Rate: ${formatInr(ratePerGram)}/g", color = Color.Gray, fontSize = 11.sp)
                    }
                    Text(
                        formatInr(estimatedValue),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.ExtraBold,
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
    var selectedWeightGrams by remember { mutableIntStateOf(10) }
    val pricePerGram = silverRate?.pricePerGram ?: 0.0

    val estimatedValue = BigDecimal.valueOf(pricePerGram)
        .multiply(BigDecimal.valueOf(selectedWeightGrams.toLong()))
        .setScale(0, RoundingMode.HALF_UP)
        .toDouble()

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = Color(0xFF1E2638),
        border = BorderStroke(1.dp, Color(0x3394A3B8)),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Silver 999 Calculator",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, fontSize = 16.sp),
                    color = Color(0xFF93C5FD),
                )
                Text(
                    cityName,
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFF94A3B8),
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                SILVER_WEIGHT_OPTIONS.forEach { grams ->
                    val isSelected = grams == selectedWeightGrams
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedWeightGrams = grams },
                        label = { Text(silverWeightLabel(grams).replace(" ", ""), fontWeight = FontWeight.Bold, fontSize = 12.sp) },
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
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Color(0x3338BDF8)),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text("${silverWeightLabel(selectedWeightGrams)} Value", color = Color(0xFF38BDF8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("Rate: ${formatInr(pricePerGram)}/g", color = Color.Gray, fontSize = 11.sp)
                    }
                    Text(
                        formatInr(estimatedValue),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color(0xFF38BDF8),
                    )
                }
            }
        }
    }
}
