package com.ratestack.app.ui.settings

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ratestack.app.data.CustomerSession

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountSettingsScreen(
    customer: CustomerSession?,
    isGoogleConnected: Boolean,
    onOpenAddresses: () -> Unit,
    onOpenGstProfile: () -> Unit,
    onConnectGoogle: () -> Unit,
    onDisconnectGoogle: () -> Unit,
    onOpenChangePassword: () -> Unit,
    onLogout: () -> Unit,
    onBack: () -> Unit,
) {
    var rateAlertsEnabled by remember { mutableStateOf(true) }
    var orderUpdatesEnabled by remember { mutableStateOf(true) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A)),
    ) {
        TopAppBar(
            title = { Text("Account Settings", fontWeight = FontWeight.Bold, color = Color.White) },
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
            // Profile Info Card
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2638)),
                border = BorderStroke(1.dp, Color(0x33E2AD3D)),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("CUSTOMER PROFILE", color = Color(0xFFE2AD3D), fontWeight = FontWeight.Black, fontSize = 12.sp)
                    InfoRow(Icons.Default.Person, "Full Name", customer?.fullName ?: "Customer")
                    InfoRow(Icons.Default.Phone, "Mobile Number", customer?.phone ?: "Not set")
                    InfoRow(Icons.Default.Email, "Email Address", customer?.email ?: "Not set")
                }
            }

            // Authentication & Security Card
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2638)),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("AUTHENTICATION & SECURITY", color = Color(0xFF38BDF8), fontWeight = FontWeight.Black, fontSize = 12.sp)
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text("Google Account", color = Color.White, fontWeight = FontWeight.Bold)
                            Text(if (isGoogleConnected) "Connected to Google OAuth" else "Not connected", color = Color(0xFF94A3B8), fontSize = 12.sp)
                        }
                        if (isGoogleConnected) {
                            OutlinedButton(onClick = onDisconnectGoogle, shape = RoundedCornerShape(8.dp)) {
                                Text("Disconnect", color = Color(0xFFEF4444), fontSize = 12.sp)
                            }
                        } else {
                            Button(onClick = onConnectGoogle, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE2AD3D))) {
                                Text("Connect", color = Color.Black, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Divider(color = Color(0x22FFFFFF))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOpenChangePassword() },
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFFE2AD3D), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Text("Change Password", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                        Icon(Icons.Default.ArrowForward, contentDescription = null, tint = Color(0xFF94A3B8))
                    }
                }
            }

            // Shortcuts Card
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2638)),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text("PREFERENCES & DATA", color = Color(0xFF38BDF8), fontWeight = FontWeight.Black, fontSize = 12.sp)

                    ShortcutRow("Saved Delivery Addresses", onOpenAddresses)
                    ShortcutRow("GST Details & Tax Invoice Settings", onOpenGstProfile)

                    Divider(color = Color(0x22FFFFFF))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Gold & Silver Price Alerts", color = Color.White)
                        Switch(checked = rateAlertsEnabled, onCheckedChange = { rateAlertsEnabled = it })
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Order & Delivery Tracking Updates", color = Color.White)
                        Switch(checked = orderUpdatesEnabled, onCheckedChange = { orderUpdatesEnabled = it })
                    }
                }
            }

            // Logout Button
            Button(
                onClick = onLogout,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
            ) {
                Text("Logout from Account", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
        }
    }
}

@Composable
private fun InfoRow(icon: ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = Color(0xFFE2AD3D), modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(10.dp))
        Column {
            Text(label, color = Color(0xFF94A3B8), fontSize = 11.sp)
            Text(value, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }
    }
}

@Composable
private fun ShortcutRow(title: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, color = Color.White, fontWeight = FontWeight.Bold)
        Icon(Icons.Default.ArrowForward, contentDescription = null, tint = Color(0xFF94A3B8))
    }
}
