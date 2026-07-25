package com.ratestack.app.ui.schemes

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ratestack.app.data.SchemeEnrollmentDto
import com.ratestack.app.data.SchemePlanDto
import java.util.Locale

@Composable
fun SchemesListingScreen(
    plans: List<SchemePlanDto>,
    userSchemes: List<SchemeEnrollmentDto>,
    isLoggedIn: Boolean,
    userName: String?,
    isLoading: Boolean,
    onLoginClick: () -> Unit,
    onRegisterClick: () -> Unit,
    onJoinScheme: (planId: String, monthlyAmount: Double) -> Unit,
    onSelectScheme: (enrollmentId: String) -> Unit,
    onProfileClick: () -> Unit = {},
    onLogoutClick: () -> Unit,
) {
    var selectedAmounts by remember { mutableStateOf(mapOf<String, Double>()) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF0F0D0B),
    ) {
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFFD97706))
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                // 1. Header Card (Guest or Customer Welcome)
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1C1917)),
                        shape = RoundedCornerShape(18.dp),
                        border = BorderStroke(1.dp, Color(0xFF44403C)),
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = if (isLoggedIn) "Welcome, ${userName ?: "Customer"}" else "Coin Savings Scheme",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFFEF3C7),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                    Text(
                                        text = if (isLoggedIn) "RateStack Scheme Portal" else "Disciplined Gold & Silver Savings",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color(0xFFA8A29E),
                                    )
                                }

                                Spacer(modifier = Modifier.width(8.dp))

                                if (isLoggedIn) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        OutlinedButton(
                                            onClick = onProfileClick,
                                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFFBBF24)),
                                            border = BorderStroke(1.dp, Color(0xFFD97706)),
                                            shape = RoundedCornerShape(10.dp),
                                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        ) {
                                            Text("Profile", fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                                        }
                                        Button(
                                            onClick = onLogoutClick,
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
                                            shape = RoundedCornerShape(10.dp),
                                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        ) {
                                            Text("Logout", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 1)
                                        }
                                    }
                                } else {
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        OutlinedButton(
                                            onClick = onLoginClick,
                                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFFBBF24)),
                                            border = BorderStroke(1.dp, Color(0xFFD97706)),
                                            shape = RoundedCornerShape(10.dp),
                                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        ) {
                                            Text("Login", fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                                        }
                                        Button(
                                            onClick = onRegisterClick,
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                            shape = RoundedCornerShape(10.dp),
                                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        ) {
                                            Text("Register", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Black, maxLines = 1)
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = "Accumulate physical 22K Gold and 999 Fine Silver coins with fixed monthly installments. Get 100% bonus on your 12th installment.",
                                fontSize = 12.sp,
                                color = Color(0xFFD6D3D1),
                                lineHeight = 16.sp,
                            )
                        }
                    }
                }

                // 2. Logged-In User Experience (Above Public Plans)
                if (isLoggedIn) {
                    if (userSchemes.isNotEmpty()) {
                        // Summary Bar
                        item {
                            val totalBalance = userSchemes.sumOf { it.schemePurchaseBalance ?: 0.0 }
                            val totalRemaining = userSchemes.sumOf { it.remainingAmount ?: 0.0 }

                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF271C0C)),
                                shape = RoundedCornerShape(16.dp),
                                border = BorderStroke(1.dp, Color(0xFFB45309)),
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Text(
                                        text = "MY SAVINGS DASHBOARD SUMMARY",
                                        color = Color(0xFFFBBF24),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Black,
                                        letterSpacing = 0.8.sp,
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Column {
                                            Text("Scheme Purchase Balance", fontSize = 10.sp, color = Color.Gray)
                                            Text(
                                                "₹${String.format(Locale.US, "%,.0f", totalBalance)}",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 20.sp,
                                                color = Color(0xFFFEF3C7),
                                            )
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text("Active Schemes", fontSize = 10.sp, color = Color.Gray)
                                            Text(
                                                "${userSchemes.size} Active",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 16.sp,
                                                color = Color(0xFF34D399),
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Text("Total Paid: ₹${String.format(Locale.US, "%,.0f", totalBalance)}", fontSize = 11.sp, color = Color.LightGray)
                                        Text("Remaining: ₹${String.format(Locale.US, "%,.0f", totalRemaining)}", fontSize = 11.sp, color = Color(0xFFFBBF24))
                                    }
                                }
                            }
                        }

                        item {
                            Text(
                                text = "MY ENROLLED SCHEMES",
                                color = Color(0xFFFBBF24),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 1.sp,
                            )
                        }

                        items(userSchemes) { scheme ->
                            val isGold = scheme.metalType == "GOLD"
                            val tenure = scheme.tenureMonths ?: 12
                            val paid = scheme.paidInstallmentCount ?: 0
                            val remainingMonths = (tenure - paid).coerceAtLeast(0)
                            val progressPercent = if (tenure > 0) (paid.toFloat() / tenure.toFloat()).coerceIn(0f, 1f) else 0f

                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onSelectScheme(scheme.id ?: "") },
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isGold) Color(0xFF1E1912) else Color(0xFF16191E)
                                ),
                                shape = RoundedCornerShape(16.dp),
                                border = BorderStroke(
                                    1.dp,
                                    if (isGold) Color(0xFF78350F) else Color(0xFF334155)
                                ),
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = scheme.productName ?: "Savings Scheme",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 15.sp,
                                                color = Color.White,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis,
                                            )
                                            Text(
                                                text = "Account #${scheme.accountNumber}",
                                                fontSize = 11.sp,
                                                color = Color(0xFFF59E0B),
                                                fontWeight = FontWeight.Bold,
                                            )
                                        }

                                        Spacer(modifier = Modifier.width(6.dp))

                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = if (scheme.status == "MATURED") Color(0xFF065F46) else Color(0xFF1E3A8A),
                                        ) {
                                            Text(
                                                text = scheme.status ?: "ACTIVE",
                                                color = Color.White,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(10.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Column {
                                            Text("Scheme Purchase Balance", fontSize = 10.sp, color = Color.Gray)
                                            Text(
                                                "₹${String.format(Locale.US, "%,.0f", scheme.schemePurchaseBalance ?: 0.0)}",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 17.sp,
                                                color = Color(0xFFFEF3C7),
                                            )
                                        }

                                        Column(horizontalAlignment = Alignment.End) {
                                            Text("Installments Progress", fontSize = 10.sp, color = Color.Gray)
                                            Text(
                                                "$paid / $tenure Paid ($remainingMonths Left)",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp,
                                                color = Color(0xFF34D399),
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))

                                    LinearProgressIndicator(
                                        progress = progressPercent,
                                        modifier = Modifier.fillMaxWidth().height(6.dp),
                                        color = if (isGold) Color(0xFFD97706) else Color(0xFF38BDF8),
                                        trackColor = Color(0xFF292524),
                                    )

                                    Spacer(modifier = Modifier.height(10.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Button(
                                            onClick = { onSelectScheme(scheme.id ?: "") },
                                            modifier = Modifier.weight(1f),
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                            shape = RoundedCornerShape(10.dp),
                                            contentPadding = PaddingValues(vertical = 8.dp),
                                        ) {
                                            Text("View Details & Pay →", fontWeight = FontWeight.Bold, color = Color.Black, fontSize = 12.sp)
                                        }
                                    }
                                }
                            }
                        }

                        item { Spacer(modifier = Modifier.height(4.dp)) }
                    } else {
                        // Clean No-Scheme Message for Logged-In User
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF1C1917)),
                                shape = RoundedCornerShape(16.dp),
                                border = BorderStroke(1.dp, Color(0xFF44403C)),
                            ) {
                                Column(
                                    modifier = Modifier.padding(18.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    Text(
                                        text = "You have not joined any savings scheme yet.",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = Color(0xFFFEF3C7),
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Select a Gold or Silver coin scheme below to begin your savings journey.",
                                        fontSize = 11.sp,
                                        color = Color(0xFFA8A29E),
                                    )
                                }
                            }
                        }
                    }
                }

                // 3. Available Public Schemes Header
                item {
                    Text(
                        text = "AVAILABLE SAVINGS SCHEMES",
                        color = Color(0xFFFBBF24),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp,
                    )
                }

                // 4. Public Scheme Plans List (Visible to Guests & Logged-In Users)
                items(plans) { plan ->
                    val isGold = plan.metalType == "GOLD"
                    val minAmount = plan.minMonthlyAmount ?: 500.0
                    val currentSelectedAmount = selectedAmounts[plan.id] ?: minAmount

                    val presetAmounts = listOf(500.0, 1000.0, 2000.0, 5000.0, 10000.0).filter { it >= minAmount }

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isGold) Color(0xFF181512) else Color(0xFF141619)
                        ),
                        border = BorderStroke(
                            1.dp,
                            if (isGold) Color(0xFFD97706) else Color(0xFF475569)
                        ),
                        shape = RoundedCornerShape(16.dp),
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            // Header Row with Strict Single-Line Horizontal Tenure Badge
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = plan.name ?: if (isGold) "22K Gold Coin Savings Scheme" else "Silver 999 Coin Savings Scheme",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp,
                                        color = Color.White,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                    Text(
                                        text = if (isGold) "Gold Purity: 22K (916 Hallmarked)" else "Silver Purity: 999 (Fine Silver)",
                                        fontSize = 11.sp,
                                        color = if (isGold) Color(0xFFF59E0B) else Color(0xFF94A3B8),
                                    )
                                }

                                Spacer(modifier = Modifier.width(6.dp))

                                // FIXED UI: Strict Horizontal Single-Line Tenure Badge
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (isGold) Color(0xFF78350F) else Color(0xFF334155),
                                ) {
                                    Text(
                                        text = "${plan.tenureMonths ?: 12} Months",
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                        softWrap = false,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            // Highlights / Badges Row
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = Color(0xFF292524),
                                ) {
                                    Text(
                                        text = "Min ₹${minAmount.toInt()}/mo",
                                        color = Color.LightGray,
                                        fontSize = 10.sp,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                                    )
                                }
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = Color(0xFF065F46),
                                ) {
                                    Text(
                                        text = "100% 12th Month Bonus",
                                        color = Color(0xFF34D399),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Monthly Contribution Selector Chips
                            Text(
                                text = "Select Monthly Installment Amount:",
                                fontSize = 11.sp,
                                color = Color.Gray,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(modifier = Modifier.height(6.dp))

                            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                items(presetAmounts) { amt ->
                                    val isAmtSelected = amt == currentSelectedAmount
                                    Surface(
                                        modifier = Modifier.clickable {
                                            selectedAmounts = selectedAmounts + (plan.id.orEmpty() to amt)
                                        },
                                        shape = RoundedCornerShape(8.dp),
                                        color = if (isAmtSelected) (if (isGold) Color(0xFFD97706) else Color(0xFF475569)) else Color(0xFF262320),
                                        border = BorderStroke(
                                            1.dp,
                                            if (isAmtSelected) Color.White else Color(0xFF44403C)
                                        ),
                                    ) {
                                        Text(
                                            text = "₹${amt.toInt()}",
                                            color = if (isAmtSelected) (if (isGold) Color.Black else Color.White) else Color.LightGray,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Key Scheme Terms & Benefits List
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFF0F0D0B), RoundedCornerShape(10.dp))
                                    .padding(10.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Text("• Tenure: Pay 11 installments, RateStack pays the 12th installment bonus.", fontSize = 11.sp, color = Color(0xFFD6D3D1))
                                Text("• Maturity: Redeem for physical ${if (isGold) "22K BIS Hallmarked Gold" else "999 Fine Silver"} coins.", fontSize = 11.sp, color = Color(0xFFD6D3D1))
                                Text("• Purchase Balance: 100% of payments credited with 0% deduction.", fontSize = 11.sp, color = Color(0xFFD6D3D1))
                                Text("• GST & Charges: 3% GST + minting/delivery calculated at redemption.", fontSize = 11.sp, color = Color(0xFFA8A29E))
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Join Scheme Button CTA
                            Button(
                                onClick = {
                                    if (!isLoggedIn) {
                                        onLoginClick()
                                    } else {
                                        onJoinScheme(plan.id ?: "", currentSelectedAmount)
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isGold) Color(0xFFD97706) else Color(0xFF475569)
                                ),
                                shape = RoundedCornerShape(12.dp),
                                contentPadding = PaddingValues(vertical = 10.dp),
                            ) {
                                Text(
                                    text = if (isLoggedIn) "Join Scheme (₹${currentSelectedAmount.toInt()}/mo) →" else "Login to Join Scheme →",
                                    fontWeight = FontWeight.Bold,
                                    color = if (isGold) Color.Black else Color.White,
                                    fontSize = 13.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
