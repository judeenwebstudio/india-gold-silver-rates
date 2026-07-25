package com.ratestack.app.ui.schemes

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import com.ratestack.app.data.SchemeEnrollmentDto

@Composable
fun MySchemesScreen(
    schemes: List<SchemeEnrollmentDto>,
    isLoading: Boolean,
    onSelectScheme: (String) -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFFFBFAF7),
    ) {
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFFB45309))
            }
        } else if (schemes.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "No active scheme accounts found.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF78716C),
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Join a 22K Gold or 999 Silver Coin Scheme to start saving.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFFA8A29E),
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    Text(
                        text = "My Scheme Accounts",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1C1917),
                    )
                }

                items(schemes) { scheme ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelectScheme(scheme.id ?: "") },
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE7E5E4)),
                        shape = RoundedCornerShape(16.dp),
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
                                    fontSize = 15.sp,
                                    color = Color(0xFF1C1917),
                                )
                                Text(
                                    text = scheme.status ?: "ACTIVE",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.sp,
                                    color = if (scheme.status == "MATURED") Color(0xFF047857) else Color(0xFFB45309),
                                )
                            }

                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Account #${scheme.accountNumber}",
                                fontSize = 11.sp,
                                color = Color(0xFF78716C),
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Column {
                                    Text("Scheme Purchase Balance", fontSize = 10.sp, color = Color(0xFF78716C))
                                    Text(
                                        "₹${(scheme.schemePurchaseBalance ?: 0.0).toInt()}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp,
                                        color = Color(0xFF78350F),
                                    )
                                }

                                Column(horizontalAlignment = Alignment.End) {
                                    Text("Installments", fontSize = 10.sp, color = Color(0xFF78716C))
                                    Text(
                                        "${scheme.paidInstallmentCount ?: 0}/${scheme.tenureMonths ?: 12} Paid",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = Color(0xFF1C1917),
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
