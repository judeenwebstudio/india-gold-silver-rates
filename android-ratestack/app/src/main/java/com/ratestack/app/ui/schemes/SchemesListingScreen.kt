package com.ratestack.app.ui.schemes

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ratestack.app.data.SchemePlanDto

@Composable
fun SchemesListingScreen(
    plans: List<SchemePlanDto>,
    isLoading: Boolean,
    onJoinScheme: (String, Double) -> Unit,
    onViewMySchemes: () -> Unit,
) {
    var selectedPlanId by remember { mutableStateOf(plans.firstOrNull()?.id ?: "") }
    var monthlyAmount by remember { mutableStateOf(1000.0) }

    val selectedPlan = plans.find { it.id == selectedPlanId } ?: plans.firstOrNull()
    val tenure = selectedPlan?.tenureMonths ?: 12
    val totalScheduled = monthlyAmount * tenure
    val minCoinPrice = selectedPlan?.minCoinEstPriceInr ?: 0.0
    val showWarning = totalScheduled > 0 && minCoinPrice > 0 && totalScheduled < minCoinPrice

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFFFBFAF7),
    ) {
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFFB45309))
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Header & My Schemes Quick Action
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(
                                text = "Coin Savings Scheme",
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1C1917),
                            )
                            Text(
                                text = "Disciplined Savings for 22K Gold & 999 Silver Coins",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF78716C),
                            )
                        }
                        Button(
                            onClick = onViewMySchemes,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB45309)),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Text("My Schemes", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Compliance Badge
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "🛡️ Scheme Purchase Balance Model",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = Color(0xFF78350F),
                            )
                            Text(
                                text = "Non-withdrawable coin purchase savings plan. Zero interest or guaranteed returns.",
                                fontSize = 11.sp,
                                color = Color(0xFF92400E),
                            )
                        }
                    }
                }

                // Scheme Products Cards
                items(plans) { plan ->
                    val isSelected = plan.id == selectedPlanId
                    val isGold = plan.metalType == "GOLD"

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                selectedPlanId = plan.id ?: ""
                            },
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) Color(0xFFFFFBEB) else Color.White
                        ),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isSelected) Color(0xFFD97706) else Color(0xFFE7E5E4)
                        ),
                        shape = RoundedCornerShape(16.dp),
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    text = plan.name ?: "Savings Scheme",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = Color(0xFF1C1917),
                                )
                                if (isSelected) {
                                    Text(
                                        text = "Selected",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 10.sp,
                                        color = Color(0xFFB45309),
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Text(
                                text = "Tenure: ${plan.tenureMonths} Months | Grace Period: ${plan.gracePeriodDays} Days",
                                fontSize = 12.sp,
                                color = Color(0xFF57534E),
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            Button(
                                onClick = { onJoinScheme(plan.id ?: "", monthlyAmount) },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isGold) Color(0xFFB45309) else Color(0xFF334155)
                                ),
                                shape = RoundedCornerShape(12.dp),
                            ) {
                                Text("Join Scheme (${plan.tenureMonths}M) \u2192", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // Dynamic Calculator Component
                if (selectedPlan != null) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE7E5E4)),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "🧮 Savings Calculator",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = Color(0xFF1C1917),
                                )

                                Spacer(modifier = Modifier.height(12.dp))

                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    listOf(500.0, 1000.0, 2000.0, 5000.0).forEach { amt ->
                                        Button(
                                            onClick = { monthlyAmount = amt },
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = if (monthlyAmount == amt) Color(0xFFB45309) else Color(0xFFF5F5F4)
                                            ),
                                            shape = RoundedCornerShape(8.dp),
                                            modifier = Modifier.weight(1f),
                                        ) {
                                            Text(
                                                "₹${amt.toInt()}",
                                                fontSize = 10.sp,
                                                color = if (monthlyAmount == amt) Color.White else Color(0xFF44403C)
                                            )
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(16.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text("Monthly Contribution:", fontSize = 12.sp, color = Color(0xFF57534E))
                                    Text("₹${monthlyAmount.toInt()}", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text("Scheduled Purchase Balance:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1C1917))
                                    Text("₹${totalScheduled.toInt()}", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF78350F))
                                }

                                if (showWarning) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "⚠️ Total scheduled balance (₹${totalScheduled.toInt()}) is below lowest coin cost (₹${minCoinPrice.toInt()}). Additional difference payment may be required at maturity.",
                                        fontSize = 11.sp,
                                        color = Color(0xFFB45309),
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
