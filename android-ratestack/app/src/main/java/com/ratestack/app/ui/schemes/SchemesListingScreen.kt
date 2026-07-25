package com.ratestack.app.ui.schemes

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
    onLogoutClick: () -> Unit,
) {
    var selectedPlanId by remember { mutableStateOf(plans.firstOrNull()?.id ?: "") }
    var monthlyAmount by remember { mutableStateOf(1000.0) }

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
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Header & Auth Action Row
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1C1917)),
                        shape = RoundedCornerShape(20.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF44403C)),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
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
                                Button(
                                    onClick = onLogoutClick,
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
                                    shape = RoundedCornerShape(12.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                ) {
                                    Text("Logout", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 1)
                                }
                            } else {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    OutlinedButton(
                                        onClick = onLoginClick,
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFFBBF24)),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFD97706)),
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
                    }
                }

                // If Logged In & Has Enrolled Schemes -> Display My Schemes Cards
                if (isLoggedIn && userSchemes.isNotEmpty()) {
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
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelectScheme(scheme.id ?: "") },
                            colors = CardDefaults.cardColors(
                                containerColor = if (isGold) Color(0xFF1E1912) else Color(0xFF16191E)
                            ),
                            shape = RoundedCornerShape(18.dp),
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isGold) Color(0xFF78350F) else Color(0xFF334155)
                            ),
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        text = scheme.productName ?: "Savings Scheme",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp,
                                        color = Color.White,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
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

                                Text(
                                    text = "Account #${scheme.accountNumber}",
                                    fontSize = 11.sp,
                                    color = Color(0xFFF59E0B),
                                    fontWeight = FontWeight.Bold,
                                )

                                Spacer(modifier = Modifier.height(12.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Column {
                                        Text("Scheme Purchase Balance", fontSize = 10.sp, color = Color.Gray)
                                        Text(
                                            "₹${String.format(Locale.US, "%,.0f", scheme.schemePurchaseBalance ?: 0.0)}",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 18.sp,
                                            color = Color(0xFFFEF3C7),
                                        )
                                    }

                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("Installments", fontSize = 10.sp, color = Color.Gray)
                                        Text(
                                            "${scheme.paidInstallmentCount ?: 0} / ${scheme.tenureMonths ?: 12} Paid",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = Color(0xFF34D399),
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                Button(
                                    onClick = { onSelectScheme(scheme.id ?: "") },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                    shape = RoundedCornerShape(12.dp),
                                ) {
                                    Text("Open Scheme Dashboard →", fontWeight = FontWeight.Bold, color = Color.Black, fontSize = 12.sp)
                                }
                            }
                        }
                    }

                    item { Spacer(modifier = Modifier.height(8.dp)) }
                }

                // If Logged In & NO Schemes -> Display Clean No-Scheme Message
                if (isLoggedIn && userSchemes.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1C1917)),
                            shape = RoundedCornerShape(18.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF44403C)),
                        ) {
                            Column(
                                modifier = Modifier.padding(20.dp),
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

                // Available Scheme Plans List
                item {
                    Text(
                        text = "AVAILABLE SAVINGS SCHEMES",
                        color = Color(0xFFFBBF24),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp,
                    )
                }

                items(plans) { plan ->
                    val isSelected = plan.id == selectedPlanId
                    val isGold = plan.metalType == "GOLD"

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedPlanId = plan.id ?: "" },
                        colors = CardDefaults.cardColors(
                            containerColor = if (isGold) Color(0xFF181512) else Color(0xFF141619)
                        ),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isSelected) Color(0xFFD97706) else Color(0xFF292524)
                        ),
                        shape = RoundedCornerShape(18.dp),
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
                                    color = Color.White,
                                )
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (isGold) Color(0xFF78350F) else Color(0xFF334155),
                                ) {
                                    Text(
                                        text = "${plan.tenureMonths} Months",
                                        color = Color.White,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Purity: ${plan.purity ?: "22K"} • Min Monthly: ₹${plan.minMonthlyAmount?.toInt() ?: 1000}",
                                fontSize = 12.sp,
                                color = Color.Gray,
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            Button(
                                onClick = {
                                    if (!isLoggedIn) {
                                        onLoginClick()
                                    } else {
                                        onJoinScheme(plan.id ?: "", monthlyAmount)
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isGold) Color(0xFFD97706) else Color(0xFF475569)
                                ),
                                shape = RoundedCornerShape(12.dp),
                            ) {
                                Text(
                                    text = if (isLoggedIn) "Join Scheme (${plan.tenureMonths}M) →" else "Login to Join Scheme →",
                                    fontWeight = FontWeight.Bold,
                                    color = if (isGold) Color.Black else Color.White,
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
