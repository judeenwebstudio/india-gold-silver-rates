package com.ratestack.app.ui.schemes

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
    onViewReceipt: (String) -> Unit = {},
    onRetryPayment: (String) -> Unit = {},
    isOffline: Boolean = false,
) {
    if (isLoading) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF0F0D0B)),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator(color = Color(0xFFD97706))
        }
        return
    }

    if (dashboard == null) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF0F0D0B)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "Scheme dashboard data unavailable",
                color = Color.LightGray,
                fontSize = 14.sp,
            )
        }
        return
    }

    val enrollment = dashboard.enrollment
    val isGold = enrollment?.metalType == "GOLD"
    val balance = dashboard.schemePurchaseBalance ?: 0.0
    val progress = ((dashboard.progressPercent ?: 0.0) / 100.0).toFloat().coerceIn(0f, 1f)
    val nextInst = dashboard.nextInstallment
    val rateInfo = dashboard.relevantCurrentMetalRate
    val isEligibleRedemption = dashboard.redemptionEligibility?.isEligible == true

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F0D0B)),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Offline Cache Warning Banner
        if (isOffline) {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF451A03),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFB45309)),
                ) {
                    Text(
                        text = "⚡ Viewing cached data offline (Read-Only). Payment and redemption require an active network connection.",
                        color = Color(0xFFFDE68A),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
        }

        // Account Header Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = if (isGold) Color(0xFF1E1912) else Color(0xFF16191E)
                ),
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (isGold) Color(0xFF78350F) else Color(0xFF334155)
                ),
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = "Account #${enrollment?.accountNumber ?: ""}",
                            color = Color(0xFFF59E0B),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (enrollment?.status == "MATURED") Color(0xFF065F46) else Color(0xFF1E3A8A),
                        ) {
                            Text(
                                text = enrollment?.status ?: "ACTIVE",
                                color = Color.White,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = enrollment?.productName ?: "Coin Savings Scheme",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Tenure: ${enrollment?.tenureMonths ?: 12} Months • Monthly: ₹${enrollment?.monthlyAmount?.toInt() ?: 0}",
                        color = Color.Gray,
                        fontSize = 12.sp,
                    )
                }
            }
        }

        // Scheme Purchase Balance Card (Terminology: Scheme Purchase Balance)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF271C0C)),
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFB45309)),
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "SCHEME PURCHASE BALANCE",
                        color = Color(0xFFFBBF24),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "₹${String.format("%,.2f", balance)}",
                        color = Color(0xFFFEF3C7),
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraBold,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Verified Eligible Purchase Value for Coin Redemption",
                        color = Color(0xFFFDE68A).copy(alpha = 0.8f),
                        fontSize = 11.sp,
                    )
                }
            }
        }

        // Metric Breakdown Cards Grid (Amount Paid / Remaining / Next Due)
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Card(
                    modifier = Modifier.weight(1f),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF181512)),
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF292524)),
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = "Amount Paid", color = Color.Gray, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "₹${String.format("%,.0f", dashboard.verifiedContributionTotal ?: 0.0)}",
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = "${dashboard.paidInstallmentCount ?: 0} / ${dashboard.totalInstallments ?: 12} Paid",
                            color = Color(0xFF34D399),
                            fontSize = 10.sp,
                        )
                    }
                }

                Card(
                    modifier = Modifier.weight(1f),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF181512)),
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF292524)),
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = "Remaining", color = Color.Gray, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "₹${String.format("%,.0f", dashboard.remainingScheduledAmount ?: 0.0)}",
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = "${dashboard.remainingInstallmentCount ?: 0} Left",
                            color = Color(0xFFFBBF24),
                            fontSize = 10.sp,
                        )
                    }
                }
            }
        }

        // Benchmark Metal Rate Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF141210)),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF292524)),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "TODAY'S BENCHMARK METAL RATE",
                        color = Color(0xFFF59E0B),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    if (rateInfo != null) {
                        Text(
                            text = "${rateInfo.metalType ?: "GOLD"} ${rateInfo.purity ?: "K22"}",
                            color = Color.LightGray,
                            fontSize = 11.sp,
                        )
                        Text(
                            text = "₹${String.format("%,.0f", rateInfo.pricePerGramInr ?: 0.0)} / gram",
                            color = Color.White,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = "Source: ${rateInfo.source ?: "IBJA Benchmark"}",
                            color = Color.Gray,
                            fontSize = 10.sp,
                        )
                    } else {
                        Text(text = "Rate update pending", color = Color.Gray, fontSize = 12.sp)
                    }
                }
            }
        }

        // Verified Savings Progress Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF181512)),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF292524)),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(text = "Savings Progress", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Text(text = "${String.format("%.1f", (dashboard.progressPercent ?: 0.0))}%", color = Color(0xFFF59E0B), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = progress,
                        modifier = Modifier.fillMaxWidth().height(8.dp),
                        color = Color(0xFFD97706),
                        trackColor = Color(0xFF292524),
                    )
                }
            }
        }

        // Action Buttons (Pay Installment / Redeem Coin)
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (enrollment?.status == "ACTIVE" && !isOffline) {
                    Button(
                        onClick = onPayInstallment,
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        Text(
                            text = "Pay Installment (₹${enrollment.monthlyAmount?.toInt() ?: 0})",
                            color = Color.Black,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }

                if (isEligibleRedemption && !isOffline) {
                    Button(
                        onClick = onRequestRedemption,
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        Text(
                            text = "Request Coin Redemption",
                            color = Color.White,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                } else if (enrollment?.status != "ACTIVE") {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFF1F1D1A),
                    ) {
                        Text(
                            text = dashboard.redemptionEligibility?.reasonIfNotEligible ?: "Redemption available after maturity",
                            color = Color(0xFFF59E0B),
                            fontSize = 12.sp,
                            modifier = Modifier.padding(14.dp),
                        )
                    }
                }
            }
        }

        // Installments Timeline Header
        item {
            Text(
                text = "INSTALLMENT SCHEDULE",
                color = Color.Gray,
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.sp,
            )
        }

        // Installment Items
        items(dashboard.installments ?: emptyList()) { inst ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF141210)),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF262320)),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = if (inst.status == "PAID") Color(0xFF065F46) else Color(0xFF292524),
                        ) {
                            Text(
                                text = "${inst.installmentNo ?: 1}",
                                color = if (inst.status == "PAID") Color(0xFF34D399) else Color.Gray,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            )
                        }
                        Column {
                            Text(text = "Installment #${inst.installmentNo}", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            Text(text = "Due: ${inst.dueDate ?: ""}", color = Color.Gray, fontSize = 11.sp)
                        }
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(text = "₹${inst.amount?.toInt() ?: 0}", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        Text(
                            text = if (inst.status == "PAID") "Paid" else "Pending",
                            color = if (inst.status == "PAID") Color(0xFF34D399) else Color(0xFFF59E0B),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }
    }
}
