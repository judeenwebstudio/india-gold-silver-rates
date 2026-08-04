package com.ratestack.app.ui.support

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupportScreen(
    orderId: String? = null,
    orderNumber: String? = null,
    customerName: String? = null,
    customerPhone: String? = null,
    onBack: () -> Unit,
) {
    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A)),
    ) {
        TopAppBar(
            title = { Text("Support Center", fontWeight = FontWeight.Bold, color = Color.White) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E2638)),
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2638)),
                border = BorderStroke(1.dp, Color(0x33E2AD3D)),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFFE2AD3D), modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("RateStack Customer Care", style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                    Text(
                        "We are here to assist you with order tracking, metal purity certifications, delivery, or savings scheme payments.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFFCBD5E1),
                    )
                    if (!orderNumber.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF334155),
                        ) {
                            Text(
                                "Attached Order: $orderNumber",
                                color = Color(0xFF38BDF8),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            )
                        }
                    }
                }
            }

            // Quick Contact Options
            SupportContactCard(
                icon = Icons.Default.Phone,
                title = "Call Support Desk",
                subtitle = "Speak to our team (+91 98765 43210)",
                onClick = {
                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:+919876543210"))
                    context.startActivity(intent)
                },
            )

            SupportContactCard(
                icon = Icons.Default.Email,
                title = "Email Support",
                subtitle = "Send us your query at support@ratestack.com",
                onClick = {
                    val bodyText = buildString {
                        append("Hello RateStack Support Team,\n\n")
                        if (!orderNumber.isNullOrBlank()) append("Order Number: $orderNumber\n")
                        if (!customerName.isNullOrBlank()) append("Customer Name: $customerName\n")
                        if (!customerPhone.isNullOrBlank()) append("Customer Phone: $customerPhone\n")
                        append("\nDescribe your issue below:\n")
                    }
                    val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:support@ratestack.com")).apply {
                        putExtra(Intent.EXTRA_SUBJECT, "Customer Inquiry ${orderNumber?.let { "#$it" } ?: ""}")
                        putExtra(Intent.EXTRA_TEXT, bodyText)
                    }
                    context.startActivity(intent)
                },
            )
        }
    }
}

@Composable
private fun SupportContactCard(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2638)),
        border = BorderStroke(1.dp, Color(0x3338BDF8)),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(icon, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.width(14.dp))
            Column {
                Text(title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(subtitle, color = Color(0xFF94A3B8), fontSize = 12.sp)
            }
        }
    }
}
