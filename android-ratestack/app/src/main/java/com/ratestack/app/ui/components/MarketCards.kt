package com.ratestack.app.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ratestack.app.data.DEFAULT_SILVER_WEIGHT_GRAMS
import com.ratestack.app.data.GoldRate
import com.ratestack.app.data.PreferencesRepository
import com.ratestack.app.data.SILVER_WEIGHT_OPTIONS
import com.ratestack.app.data.SilverRate
import com.ratestack.app.data.silverValuePaise
import com.ratestack.app.data.silverWeightLabel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun ProminentGoldHeroCard(
    goldRates: List<GoldRate>,
    modifier: Modifier = Modifier,
    initialPurity: String = "22K",
) {
    var selectedPurity by remember { mutableStateOf(initialPurity) }
    val currentRate = goldRates.firstOrNull { it.purity.equals(selectedPurity, ignoreCase = true) }
        ?: goldRates.firstOrNull()

    val purityOrder = listOf("22K", "24K", "18K")
    val sortedPurities = goldRates.map { it.purity }.sortedBy { purity ->
        val idx = purityOrder.indexOf(purity.uppercase(Locale.ENGLISH))
        if (idx >= 0) idx else 99
    }

    val isDark = isSystemInDarkTheme()
    val goldBgBrush = if (isDark) {
        Brush.verticalGradient(listOf(Color(0xFF241E15), Color(0xFF18140E)))
    } else {
        Brush.verticalGradient(listOf(Color(0xFFFFFBEB), Color(0xFFFEF3C7)))
    }
    val textColor = if (isDark) Color(0xFFF5C96A) else Color(0xFF78350F)
    val bodyColor = if (isDark) Color(0xFFE7E5E4) else Color(0xFF451A03)

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = BorderStroke(1.dp, Color(0x40E2AD3D)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Box(modifier = Modifier.background(goldBgBrush).padding(16.dp)) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFFE2AD3D),
                        ) {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = null,
                                tint = Color(0xFF141210),
                                modifier = Modifier
                                    .padding(4.dp)
                                    .size(16.dp),
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Gold Rate",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                            ),
                            color = textColor,
                        )
                    }

                    currentRate?.let {
                        PriceDeltaBadge(change = it.change, percent = it.changePercent)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                PuritySelector(
                    selectedPurity = selectedPurity,
                    onPuritySelected = { selectedPurity = it },
                    purities = sortedPurities.ifEmpty { listOf("22K", "24K", "18K") },
                )

                Spacer(modifier = Modifier.height(14.dp))

                if (currentRate != null) {
                    AnimatedContent(
                        targetState = currentRate,
                        transitionSpec = { fadeIn() togetherWith fadeOut() },
                        label = "goldPriceAnim",
                    ) { rate ->
                        Column {
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(
                                    text = formatInr(rate.pricePerGram),
                                    style = MaterialTheme.typography.headlineLarge.copy(
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 32.sp,
                                        letterSpacing = (-0.5).sp,
                                    ),
                                    color = bodyColor,
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "/ gram",
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        fontWeight = FontWeight.Medium,
                                    ),
                                    color = bodyColor.copy(alpha = 0.7f),
                                    modifier = Modifier.padding(bottom = 4.dp),
                                )
                            }

                            rate.previousPricePerGram?.let { prev ->
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Previous: ${formatInr(prev)} / gram",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = bodyColor.copy(alpha = 0.65f),
                                )
                            }
                        }
                    }
                } else {
                    Text(
                        text = "Gold rate unavailable",
                        style = MaterialTheme.typography.bodyMedium,
                        color = bodyColor.copy(alpha = 0.6f),
                    )
                }
            }
        }
    }
}

@Composable
fun SilverRateCard(
    silverRate: SilverRate,
    modifier: Modifier = Modifier,
    cityName: String = "Current city",
    sourceUpdatedAt: String? = null,
) {
    val context = LocalContext.current
    val preferences = remember(context) { PreferencesRepository(context.applicationContext) }
    val scope = rememberCoroutineScope()
    var selectedWeight by remember { mutableIntStateOf(DEFAULT_SILVER_WEIGHT_GRAMS) }
    LaunchedEffect(Unit) { selectedWeight = preferences.readSilverWeight() }
    val selectedPaise = silverValuePaise(silverRate.pricePerGram.toString(), selectedWeight)
    val isDark = isSystemInDarkTheme()

    val silverBgBrush = if (isDark) {
        Brush.verticalGradient(listOf(Color(0xFF1E2638), Color(0xFF111827)))
    } else {
        Brush.verticalGradient(listOf(Color(0xFFF1F5F9), Color(0xFFE2E8F0)))
    }
    val textColor = if (isDark) Color(0xFF93C5FD) else Color(0xFF1E3A8A)
    val bodyColor = if (isDark) Color(0xFFF1F5F9) else Color(0xFF0F172A)

    val perGram = silverRate.pricePerGram
    val per10g = perGram * 10.0
    val perKg = silverRate.pricePerKilogram ?: (perGram * 1000.0)

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = BorderStroke(1.dp, Color(0x3394A3B8)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Box(modifier = Modifier.background(silverBgBrush).padding(16.dp)) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF38BDF8),
                        ) {
                            Text(
                                text = "Ag",
                                style = MaterialTheme.typography.labelMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF0F172A),
                                ),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Silver ${silverRate.purity}",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                            ),
                            color = textColor,
                        )
                    }

                    PriceDeltaBadge(change = silverRate.changePerGram, percent = silverRate.changePercent)
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    SILVER_WEIGHT_OPTIONS.forEach { grams ->
                        val selected = grams == selectedWeight
                        Surface(
                            modifier = Modifier.clickable {
                                selectedWeight = grams
                                scope.launch { preferences.saveSilverWeight(grams) }
                            },
                            shape = RoundedCornerShape(12.dp),
                            color = if (selected) Color(0xFF38BDF8) else Color(0x1F94A3B8),
                            border = BorderStroke(1.dp, Color(0x3338BDF8)),
                        ) {
                            Text(
                                text = silverWeightLabel(grams).replace(" ", ""),
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                color = if (selected) Color(0xFF0F172A) else bodyColor,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Surface(
                    color = if (isDark) Color(0xFF0F172A) else Color.White,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color(0x2238BDF8)),
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "${silverWeightLabel(selectedWeight)} Value",
                            style = MaterialTheme.typography.labelSmall,
                            color = bodyColor.copy(alpha = 0.6f),
                        )
                        Text(
                            text = selectedPaise?.let { formatInr(it / 100.0) } ?: "Rate unavailable",
                            style = MaterialTheme.typography.headlineMedium.copy(
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 24.sp,
                            ),
                            color = bodyColor,
                        )

                        Divider(modifier = Modifier.padding(vertical = 8.dp), color = Color(0x1594A3B8))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Column {
                                Text("1 Gram", style = MaterialTheme.typography.labelSmall, color = bodyColor.copy(alpha = 0.6f))
                                Text(formatInr(perGram), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = bodyColor)
                            }
                            Column {
                                Text("10 Grams", style = MaterialTheme.typography.labelSmall, color = bodyColor.copy(alpha = 0.6f))
                                Text(formatInr(per10g), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = bodyColor)
                            }
                            Column {
                                Text("1 Kilogram", style = MaterialTheme.typography.labelSmall, color = bodyColor.copy(alpha = 0.6f))
                                Text(formatInr(perKg), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = bodyColor)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "$cityName${sourceUpdatedAt?.let { " • Source: IBJA (${formatDate(it)})" } ?: ""}",
                    style = MaterialTheme.typography.labelSmall,
                    color = bodyColor.copy(alpha = 0.6f),
                )
            }
        }
    }
}
