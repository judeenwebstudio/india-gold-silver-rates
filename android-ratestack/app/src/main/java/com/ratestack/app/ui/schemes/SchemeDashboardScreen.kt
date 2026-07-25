package com.ratestack.app.ui.schemes

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ratestack.app.data.SchemeDashboardDto

@Composable
fun SchemeDashboardScreen(
    dashboard: SchemeDashboardDto?,
    isLoading: Boolean,
    onPayInstallment: () -> Unit,
    onRequestRedemption: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFFFBFAF7),
    ) {
        if (isLoading || dashboard == null) {
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
                // Account Header
                item {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "Account #${dashboard.accountNumber}",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF78716C),
                            )
                            Text(
                                text = dashboard.status ?: "ACTIVE",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = if (dashboard.status == "MATURED") Color(0xFF047857) else Color(0xFFB45309),
                            )
                        }
                        Text(
                            text = dashboard.productName ?: "Savings Scheme",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1C1917),
                        )
                    }
                }

                // Scheme Purchase Balance Card (Mandatory Terminology)
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFDE68A)),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "Scheme Purchase Balance",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF92400E),
                            )
                            Text(
                                text = "₹${(dashboard.schemePurchaseBalance ?: 0.0).toInt()}",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF78350F),
                            )
                            Text(
                                text = "Eligible Purchase Value towards ${dashboard.metalType ?: "Metal"} Coin",
                                fontSize = 10.sp,
                                color = Color(0xFFB45309),
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Column {
                                    Text("Monthly Contribution", fontSize = 10.sp, color = Color(0xFF78716C))
                                    Text("₹${(dashboard.monthlyAmount ?: 0.0).toInt()}", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                                Column {
                                    Text("Total Scheduled", fontSize = 10.sp, color = Color(0xFF78716C))
                                    Text("₹${(dashboard.totalScheduledAmount ?: 0.0).toInt()}", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                                Column {
                                    Text("Next Due Date", fontSize = 10.sp, color = Color(0xFF78716C))
                                    Text(dashboard.nextDueDate ?: "Matured", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }

                // Progress Bar
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE7E5E4)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text("Progress", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1C1917))
                                Text("${(dashboard.progressPercent ?: 0.0).toInt()}%", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFFB45309))
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            LinearProgressIndicator(
                                progress = ((dashboard.progressPercent ?: 0.0) / 100.0).toFloat().coerceIn(0f, 1f),
                                modifier = Modifier.fillMaxWidth(),
                                color = Color(0xFFD97706),
                                trackColor = Color(0xFFF5F5F4),
                            )
                        }
                    }
                }

                // Action Buttons
                item {
                    if (dashboard.status == "MATURED") {
                        Button(
                            onClick = onRequestRedemption,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF047857)),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Text("Request Maturity Redemption \u2192", fontWeight = FontWeight.Bold)
                        }
                    } else if (dashboard.status == "ACTIVE") {
                        Button(
                            onClick = onPayInstallment,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB45309)),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Text("Pay Due Installment (₹${(dashboard.monthlyAmount ?: 0.0).toInt()})", fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Installments List
                item {
                    Text("Installment Timeline", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1C1917))
                }

                items(dashboard.installments ?: emptyList()) { inst ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF5F5F4)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text("Installment #${inst.installmentNo}", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                Text("Due: ${inst.dueDate}", fontSize = 10.sp, color = Color(0xFF78716C))
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text("₹${(inst.amount ?: 0.0).toInt()}", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                Text(
                                    text = if (inst.status == "PAID") "PAID" else "PENDING",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (inst.status == "PAID") Color(0xFF047857) else Color(0xFFB45309)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
