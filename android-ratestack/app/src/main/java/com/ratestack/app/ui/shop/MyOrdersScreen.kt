package com.ratestack.app.ui.shop

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import com.ratestack.app.BuildConfig
import com.ratestack.app.data.SessionState
import com.ratestack.app.data.parseApiErrorInfo
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.core.net.toUri
import coil.compose.AsyncImage
import com.ratestack.app.data.ApiProvider
import com.ratestack.app.data.CustomerDashboardDto
import com.ratestack.app.data.DashboardOrderDto
import com.ratestack.app.data.GstDetailsDto
import com.ratestack.app.data.NotificationPreferencesDto
import com.ratestack.app.data.ShopAddressDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.text.NumberFormat
import java.util.Locale

private fun money(value: Double) = NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(value)

internal fun displayStatus(raw: String?): String? {
    if (raw == null) return null
    return raw.lowercase(Locale.ENGLISH)
        .replace('_', ' ')
        .replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.ENGLISH) else it.toString() }
}

internal data class TrackBadge(val icon: String, val label: String)

internal fun shouldRedirectMyOrdersToLogin(sessionState: SessionState): Boolean =
    sessionState is SessionState.Unauthenticated || sessionState is SessionState.Expired

@Composable
fun MyOrdersScreen(
    sessionState: SessionState,
    onLogin: () -> Unit,
    onRegister: () -> Unit = {},
    onGoogleLogin: () -> Unit = {},
    onLogout: () -> Unit,
    onShop: () -> Unit,
    onTrackOrder: (String) -> Unit = {},
    onOpenSettings: () -> Unit = {},
) {
    if (sessionState is SessionState.Restoring) {
        Column(
            modifier = Modifier.fillMaxSize().padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            Text("Restoring session...", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 16.dp))
        }
        return
    }

    if (shouldRedirectMyOrdersToLogin(sessionState)) {
        LaunchedEffect(sessionState) {
            com.ratestack.app.data.SessionLogger.logLoginRedirect(
                callerClass = "MyOrdersScreen",
                callerMethod = "LaunchedEffect auth guard",
                currentToken = null,
                currentSessionState = sessionState,
                reason = "MyOrdersScreen redirect guard triggered for terminal sessionState=$sessionState",
            )
            onLogin()
        }
        return
    }

    val authenticatedSession = sessionState as SessionState.Authenticated
    val token = authenticatedSession.token
    val customer = authenticatedSession.customer

    var dashboard by remember { mutableStateOf<CustomerDashboardDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var editing by remember { mutableStateOf<ShopAddressDto?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    fun refresh() {
        if (token.isBlank()) return
        val rawToken = token.trim()
        var cleanToken = rawToken
        while (cleanToken.startsWith("Bearer ", ignoreCase = true)) {
            cleanToken = cleanToken.substring(7).trim()
        }
        cleanToken = cleanToken.removeSurrounding("\"").removeSurrounding("'").trim()
        if (cleanToken.isBlank()) return

        scope.launch {
            val requestUrl = "${BuildConfig.WEBSITE_URL.trimEnd('/')}/api/v1/me/dashboard"
            val maskedTokenHeader = "Bearer ${cleanToken.take(20)}...********"

            if (BuildConfig.DEBUG) {
                android.util.Log.d("RateStackDashboard", "FETCH REQUEST DETAILS:")
                android.util.Log.d("RateStackDashboard", "  URL: $requestUrl")
                android.util.Log.d("RateStackDashboard", "  Method: GET")
                android.util.Log.d("RateStackDashboard", "  Authorization: $maskedTokenHeader")
                android.util.Log.d("RateStackDashboard", "  X-RateStack-Platform: ANDROID")
            }

            runCatching { ApiProvider.service.getCustomerDashboard("Bearer $cleanToken") }
                .onSuccess { response ->
                    val rawErrorBody = if (response.isSuccessful) null else runCatching { response.errorBody()?.string() }.getOrNull()
                    if (BuildConfig.DEBUG) {
                        android.util.Log.d("RateStackDashboard", "FETCH RESPONSE DETAILS:")
                        android.util.Log.d("RateStackDashboard", "  HTTP Response Code: ${response.code()}")
                        android.util.Log.d("RateStackDashboard", "  HTTP Response Body: ${response.body() ?: rawErrorBody}")
                    }
                    if (response.isSuccessful) {
                        dashboard = response.body()?.data
                        error = null
                    } else {
                        val apiError = parseApiErrorInfo(rawErrorBody)
                        if (BuildConfig.DEBUG) android.util.Log.d("RateStackDashboard", "  Dashboard Error Code: ${apiError.code}, Message: ${apiError.message}")
                        error = "Dashboard details are temporarily unavailable (HTTP ${response.code()}). Your session remains active."
                    }
                }
                .onFailure { e ->
                    if (BuildConfig.DEBUG) android.util.Log.d("RateStackDashboard", "  Network Error: ${e.message}")
                    error = "Unable to connect: ${e.message ?: "Network error"}"
                }
        }
    }

    fun openInvoice(order: DashboardOrderDto) {
        val orderId = order.id ?: return
        if (token.isBlank()) return
        scope.launch {
            runCatching {
                val response = ApiProvider.service.downloadShopInvoice("Bearer $token", orderId)
                if (!response.isSuccessful) throw IllegalStateException("Invoice request failed (${response.code()}).")
                val body = response.body() ?: throw IllegalStateException("Invoice is empty.")
                withContext(Dispatchers.IO) {
                    val directory = File(context.cacheDir, "invoices").apply { mkdirs() }
                    val rawName = order.invoiceNumber ?: order.orderNumber ?: "invoice"
                    File(directory, "${rawName.replace(Regex("[^A-Za-z0-9._-]"), "_")}.pdf").apply { writeBytes(body.bytes()) }
                }
            }.onSuccess { file ->
                val uri = FileProvider.getUriForFile(context, "${BuildConfig.APPLICATION_ID}.fileprovider", file)
                val intent = Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/pdf").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                context.startActivity(Intent.createChooser(intent, "Open RateStack invoice"))
            }.onFailure { error = "Unable to download this invoice." }
        }
    }

    LaunchedEffect(sessionState) { refresh() }
    val data = dashboard

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 112.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Surface(color = Color(0xFF1C1917), shape = MaterialTheme.shapes.extraLarge, border = BorderStroke(1.dp, Color(0x55E2AD3D))) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("MY DASHBOARD", color = Color(0xFFF5C96A), fontWeight = FontWeight.Black)
                    Text("Welcome, ${customer.fullName}", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black, color = Color.White)
                    Text("Orders, deliveries, addresses and account settings in one premium space.", color = Color(0xFFD6D3D1))
                    OutlinedButton(onLogout) { Text("Logout") }
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
            }
        }

        data?.summary?.let { summary ->
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Metric("Orders", "${summary.totalOrders ?: 0}", Modifier.weight(1f))
                    Metric("Paid", "${summary.paidOrders ?: 0}", Modifier.weight(1f))
                    Metric("Shipments", "${summary.activeShipments ?: 0}", Modifier.weight(1f))
                }
            }
        }

        item {
            DashboardSection(
                title = "Account Settings",
                action = {
                    TextButton(onClick = onOpenSettings) {
                        Text("Manage", fontWeight = FontWeight.Bold)
                    }
                }
            ) {
                Text(customer.fullName, fontWeight = FontWeight.Black)
                customer.phone.takeIf { it.isNotBlank() }?.let { Text("Mobile: $it") }
                customer.email?.takeIf { it.isNotBlank() }?.let { Text("Email: $it") }
                customer.googleConnected?.let { connected ->
                    Text("Google Sign-In: ${if (connected) "Connected" else "No linked Google account"}")
                }
            }
        }

        item {
            DashboardSection("My GST Details") {
                val gst = data?.gstProfile
                var edit by remember(gst?.id) { mutableStateOf(false) }
                var business by remember(gst?.id) { mutableStateOf(gst?.businessName.orEmpty()) }
                var number by remember(gst?.id) { mutableStateOf(gst?.gstNumber.orEmpty()) }
                var billing by remember(gst?.id) { mutableStateOf(gst?.billingAddress.orEmpty()) }

                if (gst == null) Text("Add GST details during checkout to save them here.")
                else if (edit) {
                    OutlinedTextField(business, { business = it.take(150) }, label = { Text("Business Name") })
                    OutlinedTextField(billing, { billing = it.take(500) }, label = { Text("Billing Address") }, minLines = 2)
                    OutlinedTextField(number, { number = it.trim().uppercase(Locale.ENGLISH).take(15) }, label = { Text("GST Number") })
                    Button({
                        scope.launch {
                            ApiProvider.service.saveGstProfile("Bearer $token", GstDetailsDto(true, business, number, billing))
                            edit = false
                            refresh()
                        }
                    }) { Text("Save") }
                } else {
                    Text(gst.businessName.orEmpty(), fontWeight = FontWeight.Black)
                    Text("GSTIN: ${gst.gstNumber}")
                    Text(gst.billingAddress.orEmpty())
                    Text(if (gst.isActive == true) "Enabled" else "Disabled", color = if (gst.isActive == true) Color(0xFF15803D) else Color.Gray)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton({ edit = true }) { Text("Edit") }
                        OutlinedButton({
                            scope.launch {
                                ApiProvider.service.toggleGstProfile("Bearer $token", mapOf("isActive" to (gst.isActive != true)))
                                refresh()
                            }
                        }) { Text(if (gst.isActive == true) "Disable" else "Enable") }
                        TextButton({
                            scope.launch {
                                ApiProvider.service.deleteGstProfile("Bearer $token")
                                refresh()
                            }
                        }) { Text("Delete") }
                    }
                }
            }
        }

        item { NotificationSettings(token) }

        item { DashboardSection("Orders Summary") { Text("${data?.summary?.totalOrders ?: 0} total orders • ${money(data?.summary?.totalSpent ?: 0.0)} spent") } }

        item { Text("Recent Orders", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black) }

        items(data?.orders?.take(3).orEmpty(), key = { it.id.orEmpty() }) { order ->
            OrderCard(
                order = order,
                onInvoice = { openInvoice(order) },
                onBuyAgain = onShop,
                onTrackOrder = { onTrackOrder(order.id.orEmpty()) },
                onSupport = {
                    val helpIntent = Intent(Intent.ACTION_SENDTO).apply {
                        setData("mailto:info@ratestack.in".toUri())
                        putExtra(Intent.EXTRA_SUBJECT, "RateStack Order Help: #${order.orderNumber} (${order.id})")
                        putExtra(Intent.EXTRA_TEXT, "Hello RateStack Support Team,\n\nI need assistance with my order:\nOrder Number: #${order.orderNumber}\nOrder ID: ${order.id}\nProduct: ${order.productName}\nPayment Status: ${order.paymentStatus}\n\nCustomer: ${customer.fullName}\nPhone: ${customer.phone}\n\nDetails:\n")
                    }
                    context.startActivity(Intent.createChooser(helpIntent, "Contact RateStack Support"))
                },
            )
        }

        item {
            DashboardSection(
                title = "Saved Addresses",
                action = {
                    Button({ editing = ShopAddressDto(fullName = customer.fullName, mobile = customer.phone, addressLine1 = "", city = "", district = "", state = "", pincode = "") }) {
                        Text("+ Add Address", fontWeight = FontWeight.Bold)
                    }
                }
            ) {
                val addresses = data?.addresses.orEmpty()
                if (addresses.isEmpty()) {
                    Text("No saved addresses yet.", color = Color.Gray)
                } else {
                    addresses.forEach { address ->
                        Surface(Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.surfaceVariant, shape = MaterialTheme.shapes.large) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("${address.fullName} • ${address.mobile}", fontWeight = FontWeight.Black)
                                Text("${address.addressLine1}, ${address.city}, ${address.state} – ${address.pincode}")
                                Text("${address.addressType}${if (address.isDefault == true) " • Default Address" else ""}")
                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    TextButton({ editing = address }) { Text("Edit") }
                                    TextButton({ if (addresses.size > 1) scope.launch { ApiProvider.service.deleteDeliveryAddress("Bearer $token", address.id.orEmpty()); refresh() } }, enabled = addresses.size > 1) { Text("Delete") }
                                    if (address.isDefault != true) TextButton({ scope.launch { ApiProvider.service.setDefaultDeliveryAddress("Bearer $token", address.id.orEmpty()); refresh() } }) { Text("Set Default") }
                                }
                            }
                        }
                    }
                }
            }
        }

        item { DashboardSection("Security") { Text("Verified mobile/email, Google Sign-In and server-verified payments protect your account.") } }
        item { DashboardSection("Reward Points") { Text("${data?.rewards?.points ?: 0} points", style = MaterialTheme.typography.headlineMedium, color = Color(0xFFB7791F)); Text(data?.rewards?.message ?: "Rewards programme coming soon.") } }
        item { DashboardSection("Notifications") { data?.notifications.orEmpty().forEach { Text("• ${it.title}") }; if (data?.notifications.isNullOrEmpty()) Text("No new notifications.") } }
        item {
            DashboardSection("Download Invoices") {
                val invoicedOrders = data?.orders.orEmpty().filter { it.invoiceNumber != null }
                if (invoicedOrders.isEmpty()) Text("Invoices appear after successful payment.")
                invoicedOrders.forEach { order ->
                    OutlinedButton({ openInvoice(order) }, Modifier.fillMaxWidth()) {
                        Text("Open ${order.invoiceNumber}")
                    }
                }
            }
        }
        item { DashboardSection("Payment History") { data?.paymentHistory.orEmpty().take(5).forEach { Text("${it.orderNumber}: ${money(it.amount ?: 0.0)} • ${it.status}") } } }
        item { DashboardSection("Wishlist") { Text("Save favourite products here in a future update.") } }
        item { DashboardSection("Support Center") { Text("Need help with an order, payment or delivery? Email info@ratestack.in") } }
        item {
            DashboardSection("Quick Actions") {
                Button(onShop, Modifier.fillMaxWidth()) { Text("Shop Coins") }
                OutlinedButton(
                    { context.startActivity(Intent(Intent.ACTION_VIEW, "${BuildConfig.WEBSITE_URL.trimEnd('/')}/#rates".toUri())) },
                    Modifier.fillMaxWidth(),
                ) { Text("Today’s Rates") }
                OutlinedButton(
                    { context.startActivity(Intent(Intent.ACTION_VIEW, "${BuildConfig.WEBSITE_URL.trimEnd('/')}/#calculator".toUri())) },
                    Modifier.fillMaxWidth(),
                ) { Text("Calculator") }
            }
        }
    }

    editing?.let { current ->
        AddressDialog(current, { editing = null }, { value ->
            scope.launch {
                runCatching {
                    if (value.id == null) ApiProvider.service.createDeliveryAddress("Bearer $token", value)
                    else ApiProvider.service.updateDeliveryAddress("Bearer $token", value.id, value)
                }.onSuccess { response ->
                    if (response.isSuccessful) {
                        editing = null
                        refresh()
                    } else {
                        error = ApiProvider.errorMessage(response, "Unable to save address.")
                    }
                }.onFailure { error = "Unable to save address. Check your connection and try again." }
            }
        })
    }
}

@Composable
internal fun AddressDialog(
    initial: ShopAddressDto,
    onDismiss: () -> Unit,
    onSave: (ShopAddressDto) -> Unit,
) {
    var name by remember { mutableStateOf(initial.fullName.orEmpty()) }
    var mobile by remember { mutableStateOf(initial.mobile.orEmpty()) }
    var line1 by remember { mutableStateOf(initial.addressLine1.orEmpty()) }
    var city by remember { mutableStateOf(initial.city.orEmpty()) }
    var district by remember { mutableStateOf(initial.district.orEmpty()) }
    var state by remember { mutableStateOf(initial.state.orEmpty()) }
    var pincode by remember { mutableStateOf(initial.pincode.orEmpty()) }
    var type by remember { mutableStateOf(initial.addressType ?: "HOME") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial.id == null) "Add Delivery Address" else "Edit Delivery Address") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("Full Name") }, singleLine = true)
                OutlinedTextField(mobile, { mobile = it }, label = { Text("Mobile Number") }, singleLine = true)
                OutlinedTextField(line1, { line1 = it }, label = { Text("Address Line 1") }, singleLine = true)
                OutlinedTextField(city, { city = it }, label = { Text("City") }, singleLine = true)
                OutlinedTextField(district, { district = it }, label = { Text("District") }, singleLine = true)
                OutlinedTextField(state, { state = it }, label = { Text("State") }, singleLine = true)
                OutlinedTextField(pincode, { pincode = it }, label = { Text("Pincode") }, singleLine = true)
            }
        },
        confirmButton = {
            Button(onClick = {
                onSave(
                    initial.copy(
                        fullName = name,
                        mobile = mobile,
                        addressLine1 = line1,
                        city = city,
                        district = district,
                        state = state,
                        pincode = pincode,
                        addressType = type,
                    )
                )
            }) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
    )
}

@Composable
private fun NotificationSettings(token: String) {
    val scope = rememberCoroutineScope()
    var settings by remember { mutableStateOf(NotificationPreferencesDto()) }
    var message by remember { mutableStateOf("") }
    LaunchedEffect(token) { if (token.isNotBlank()) runCatching { ApiProvider.service.getNotificationPreferences("Bearer $token").body()?.data }.getOrNull()?.let { settings = it } }
    DashboardSection("Notification Settings") {
        val values = listOf(
            "Order notifications" to settings.orderPushEnabled,
            "Delivery notifications" to settings.deliveryPushEnabled,
            "Gold rate alerts" to settings.goldRateAlerts,
            "Silver rate alerts" to settings.silverRateAlerts,
            "Promotions" to settings.promotionalPushEnabled,
            "Email order updates" to settings.emailOrderUpdates
        )
        values.forEachIndexed { index, (label, checked) ->
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(label)
                Switch(
                    checked = checked,
                    onCheckedChange = { value ->
                        settings = when (index) {
                            0 -> settings.copy(orderPushEnabled = value)
                            1 -> settings.copy(deliveryPushEnabled = value)
                            2 -> settings.copy(goldRateAlerts = value)
                            3 -> settings.copy(silverRateAlerts = value)
                            4 -> settings.copy(promotionalPushEnabled = value)
                            else -> settings.copy(emailOrderUpdates = value)
                        }
                    }
                )
            }
        }
        Button({
            scope.launch {
                val ok = runCatching { ApiProvider.service.saveNotificationPreferences("Bearer $token", settings).isSuccessful }.getOrDefault(false)
                message = if (ok) "Preferences saved." else "Unable to save preferences."
            }
        }) { Text("Save Preferences") }
        if (message.isNotBlank()) Text(message)
    }
}

@Composable
private fun Metric(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier) {
        Column(Modifier.padding(12.dp)) {
            Text(label, style = MaterialTheme.typography.labelSmall)
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black, color = Color(0xFFB7791F))
        }
    }
}

@Composable
private fun DashboardSection(
    title: String,
    action: (@Composable () -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, Color(0x66B7791F))
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                action?.invoke()
            }
            content()
        }
    }
}

@Composable
private fun OrderCard(
    order: DashboardOrderDto,
    onInvoice: () -> Unit,
    onBuyAgain: () -> Unit,
    onTrackOrder: () -> Unit,
    onSupport: () -> Unit,
) {
    val badge = getTrackBadge(order.shipment?.status, order.orderStatus)
    DashboardSection(order.productName.orEmpty()) {
        order.imageUrl?.let { raw ->
            AsyncImage(
                model = if (raw.startsWith("http")) raw else BuildConfig.WEBSITE_URL.trimEnd('/') + raw,
                contentDescription = order.productName,
                modifier = Modifier.fillMaxWidth().height(140.dp).padding(8.dp),
                contentScale = ContentScale.Fit,
            )
        }
        Text("${order.purity} • ${order.weightGrams?.toInt()}g × ${order.quantity}")
        Text("Metal Value: ${money(order.metalValue ?: 0.0)}")
        Text("Service Charge: ${money(order.serviceCharge ?: 0.0)}")
        Text("GST (3%): ${money(order.gst ?: 0.0)}")
        Text("Shipping Cost: ${if (order.shipping == 0.0) "FREE" else money(order.shipping ?: 0.0)}")
        Text("Total Payable: ${money(order.total ?: 0.0)}", fontWeight = FontWeight.Black)
        Text("Payment Status: ${displayStatus(order.paymentStatus)} • Order: ${displayStatus(order.orderStatus)} • Shipment: ${displayStatus(order.shipment?.status)}")
        order.deliveryAddress?.let { address ->
            Text("Delivery Address: ${address.addressLine1}, ${address.city}, ${address.state} – ${address.pincode}")
        }
        Text("Invoice: ${order.invoiceNumber ?: "Pending"}")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (order.invoiceNumber != null) OutlinedButton(onInvoice) { Text("Invoice") }
            OutlinedButton(onBuyAgain) { Text("Buy Again") }
            Button(
                onClick = onTrackOrder,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE2AD3D), contentColor = Color(0xFF141210))
            ) {
                Text("📍 Track ${badge.icon} ${badge.label}", fontWeight = FontWeight.Black)
            }
            OutlinedButton(onSupport) { Text("Need Help") }
        }
    }
}

private fun getTrackBadge(shipmentStatus: String?, orderStatus: String?): TrackBadge {
    val s = (shipmentStatus ?: orderStatus ?: "ORDER_PLACED").uppercase(Locale.ENGLISH)
    return when {
        s == "DELIVERED" -> TrackBadge("✅", "Delivered")
        s == "CANCELLED" -> TrackBadge("🔴", "Cancelled")
        s == "RETURNED" || s.contains("RTO") -> TrackBadge("🔁", "Returned")
        s == "OUT_FOR_DELIVERY" -> TrackBadge("🔵", "Out for Delivery")
        s == "IN_TRANSIT" || s == "SHIPPED" -> TrackBadge("🟢", "In Transit")
        s == "PICKUP_SCHEDULED" || s == "PICKED_UP" -> TrackBadge("🟣", "Picked Up")
        s == "PACKED" || s == "READY_TO_SHIP" -> TrackBadge("🟡", "Packed")
        else -> TrackBadge("📦", "Placed")
    }
}
