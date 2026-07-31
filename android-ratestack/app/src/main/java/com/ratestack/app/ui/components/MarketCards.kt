package com.ratestack.app.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ratestack.app.data.GoldRate
import com.ratestack.app.data.SilverRate
import com.ratestack.app.data.DEFAULT_SILVER_WEIGHT_GRAMS
import com.ratestack.app.data.PreferencesRepository
import com.ratestack.app.data.SILVER_WEIGHT_OPTIONS
import com.ratestack.app.data.silverValuePaise
import com.ratestack.app.data.silverWeightLabel
import com.ratestack.app.ui.theme.GoldContainerDark
import com.ratestack.app.ui.theme.GoldContainerLight
import com.ratestack.app.ui.theme.GoldPrimary
import com.ratestack.app.ui.theme.OnGoldContainerDark
import com.ratestack.app.ui.theme.OnGoldContainerLight
import com.ratestack.app.ui.theme.SilverContainerDark
import com.ratestack.app.ui.theme.SilverContainerLight
import com.ratestack.app.ui.theme.SilverPrimary
import kotlinx.coroutines.launch

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
        val idx = purityOrder.indexOf(purity.uppercase())
        if (idx >= 0) idx else 99
    }

    val isDark = isSystemInDarkTheme()
    val cardBgColor = if (isDark) GoldContainerDark else GoldContainerLight
    val textColor = if (isDark) OnGoldContainerDark else OnGoldContainerLight

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = cardBgColor),
        border = BorderStroke(1.dp, GoldPrimary.copy(alpha = 0.3f)),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = GoldPrimary,
                    ) {
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = null,
                            tint = Color.White,
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
                            fontSize = 17.sp,
                        ),
                        color = textColor,
                    )
                }

                currentRate?.let {
                    PriceDeltaBadge(change = it.change, percent = it.changePercent)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            PuritySelector(
                selectedPurity = selectedPurity,
                onPuritySelected = { selectedPurity = it },
                purities = sortedPurities.ifEmpty { listOf("22K", "24K", "18K") },
            )

            Spacer(modifier = Modifier.height(20.dp))

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
                                    fontSize = 34.sp,
                                    letterSpacing = (-0.5).sp,
                                ),
                                color = textColor,
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "/ gram",
                                style = MaterialTheme.typography.bodyLarge.copy(
                                    fontWeight = FontWeight.Medium,
                                ),
                                color = textColor.copy(alpha = 0.7f),
                                modifier = Modifier.padding(bottom = 4.dp),
                            )
                        }

                        rate.previousPricePerGram?.let { prev ->
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Previous: ${formatInr(prev)} / gram",
                                style = MaterialTheme.typography.bodySmall,
                                color = textColor.copy(alpha = 0.6f),
                            )
                        }
                    }
                }
            } else {
                Text(
                    text = "Gold rate unavailable",
                    style = MaterialTheme.typography.bodyLarge,
                    color = textColor.copy(alpha = 0.6f),
                )
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
    val cardBgColor = if (isDark) SilverContainerDark else SilverContainerLight
    val textColor = MaterialTheme.colorScheme.onSurface

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = cardBgColor),
        border = BorderStroke(1.dp, SilverPrimary.copy(alpha = 0.3f)),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = SilverPrimary,
                    ) {
                        Text(
                            text = "Ag",
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                            ),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Silver ${silverRate.purity}",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp,
                        ),
                        color = textColor,
                    )
                }

                PriceDeltaBadge(change = silverRate.changePerGram, percent = silverRate.changePercent)
            }

            Spacer(modifier = Modifier.height(16.dp))

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
                        shape = RoundedCornerShape(18.dp),
                        color = if (selected) SilverPrimary else MaterialTheme.colorScheme.surface,
                        border = BorderStroke(1.dp, SilverPrimary.copy(alpha = if (selected) 1f else .35f)),
                    ) { Text(silverWeightLabel(grams).replace(" ", ""), modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), color = if (selected) Color.White else textColor, fontWeight = FontWeight.Bold) }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text("${silverWeightLabel(selectedWeight)} silver value", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(selectedPaise?.let { formatInr(it / 100.0) } ?: "Rate unavailable", style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.ExtraBold), color = textColor)
            Text("Price per gram ${formatInr(silverRate.pricePerGram)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("$cityName${sourceUpdatedAt?.let { " • Source updated ${formatDate(it)}" } ?: ""}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

            Spacer(modifier = Modifier.height(12.dp))

            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    text = formatInr(silverRate.pricePerGram),
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 28.sp,
                    ),
                    color = textColor,
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "/ gram",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 2.dp),
                )
            }

            silverRate.pricePerKilogram?.let { kgPrice ->
                Spacer(modifier = Modifier.height(6.dp))
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.5f),
                ) {
                    Text(
                        text = "1 Kg = ${formatInr(kgPrice)}",
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                        ),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    )
                }
            }
        }
    }
}
