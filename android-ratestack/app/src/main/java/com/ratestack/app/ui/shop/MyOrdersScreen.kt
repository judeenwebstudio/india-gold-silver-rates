package com.ratestack.app.ui.shop

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.core.net.toUri
import coil.compose.AsyncImage
import com.ratestack.app.BuildConfig
import com.ratestack.app.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.text.NumberFormat
import java.util.Locale

@Composable
fun MyOrdersScreen(
    token: String?,
    onLogin: () -> Unit,
    onRegister: () -> Unit,
    onGoogleLogin: () -> Unit,
    onLogout: () -> Unit,
    onShop: () -> Unit,
) {
    var dashboard by remember { mutableStateOf<CustomerDashboardDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var editing by remember { mutableStateOf<ShopAddressDto?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    fun refresh() {
        if (token.isNullOrBlank()) return
        scope.launch {
            runCatching { ApiProvider.service.getCustomerDashboard("Bearer $token") }
                .onSuccess { response ->
                    if (response.isSuccessful) dashboard = response.body()?.data
                    else error = ApiProvider.errorMessage(response, "Unable to load your Dashboard.")
                }
                .onFailure { error = "Unable to load your Dashboard." }
        }
    }
    fun openInvoice(order: DashboardOrderDto) {
        val orderId = order.id ?: return
        if (token.isNullOrBlank()) return
        scope.launch {
            runCatching {
                val response = ApiProvider.service.downloadShopInvoice("Bearer $token", orderId)
                if (!response.isSuccessful) throw IllegalStateException("Invoice request failed (${response.code()}).")
                val body = response.body() ?: throw IllegalStateException("Invoice is empty.")
                withContext(Dispatchers.IO) {
                    val directory = File(context.cacheDir, "invoices").apply { mkdirs() }
                    val rawName = order.invoiceNumber ?: order.orderNumber ?: "invoice"
                    File(directory, "${rawName.replace(Regex("[^A-Za-z0-9._-]"), "_")}.html").apply { writeBytes(body.bytes()) }
                }
            }.onSuccess { file ->
                val uri = FileProvider.getUriForFile(context, "${BuildConfig.APPLICATION_ID}.fileprovider", file)
                val intent = Intent(Intent.ACTION_VIEW).setDataAndType(uri, "text/html").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                context.startActivity(Intent.createChooser(intent, "Open RateStack invoice"))
            }.onFailure { error = "Unable to download this invoice." }
        }
    }
    LaunchedEffect(token) { refresh() }
    val data = dashboard
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 112.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Surface(color = Color(0xFF1C1917), shape = MaterialTheme.shapes.extraLarge, border = BorderStroke(1.dp, Color(0x55E2AD3D))) {
                Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Text("MY DASHBOARD", color = Color(0xFFF5C96A), fontWeight = FontWeight.Black)
                    Text("Welcome, ${data?.customer?.fullName ?: "Customer"}", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black, color = Color.White)
                    Text("Orders, deliveries, addresses and account settings in one premium space.", color = Color(0xFFD6D3D1))
                    if (token.isNullOrBlank()) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { Button(onLogin) { Text("Login") }; OutlinedButton(onRegister) { Text("Register") } }
                        OutlinedButton(onGoogleLogin) { Text("Continue with Google") }
                    } else {
                        OutlinedButton(onLogout) { Text("Logout") }
                    }
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
            }
        }
        data?.summary?.let { summary ->
            item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Metric("Orders", "${summary.totalOrders ?: 0}", Modifier.weight(1f)); Metric("Paid", "${summary.paidOrders ?: 0}", Modifier.weight(1f)); Metric("Shipments", "${summary.activeShipments ?: 0}", Modifier.weight(1f))
            } }
        }
        data?.customer?.let { customer ->
            item { DashboardSection("Customer Information") { Text(customer.fullName.orEmpty(), fontWeight = FontWeight.Black); Text("${customer.phone ?: "No mobile"} • ${customer.email ?: "No email"}"); Text("Google Sign-In: ${if (customer.googleConnected == true) "Connected" else "Not connected"}") } }
        }
        item { DashboardSection("My GST Details") { val gst=data?.gstProfile;var edit by remember(gst?.id){mutableStateOf(false)};var business by remember(gst?.id){mutableStateOf(gst?.businessName.orEmpty())};var number by remember(gst?.id){mutableStateOf(gst?.gstNumber.orEmpty())};var billing by remember(gst?.id){mutableStateOf(gst?.billingAddress.orEmpty())};if(gst==null)Text("Add GST details during checkout to save them here.")else if(edit){OutlinedTextField(business,{business=it.take(150)},label={Text("Business Name")});OutlinedTextField(billing,{billing=it.take(500)},label={Text("Billing Address")},minLines=3);OutlinedTextField(number,{number=it.trim().uppercase(Locale.ENGLISH).take(15)},label={Text("GST Number")});Button({scope.launch{ApiProvider.service.saveGstProfile("Bearer $token",GstDetailsDto(true,business,number,billing));edit=false;refresh()}}){Text("Save")}}else{Text(gst.businessName.orEmpty(),fontWeight=FontWeight.Black);Text("GSTIN: ${gst.gstNumber}");Text(gst.billingAddress.orEmpty());Text(if(gst.isActive==true)"Enabled" else "Disabled",color=if(gst.isActive==true)Color(0xFF15803D) else Color.Gray);Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){TextButton({edit=true}){Text("Edit")};OutlinedButton({scope.launch{ApiProvider.service.toggleGstProfile("Bearer $token",mapOf("isActive" to (gst.isActive!=true)));refresh()}}){Text(if(gst.isActive==true)"Disable" else "Enable")};TextButton({scope.launch{ApiProvider.service.deleteGstProfile("Bearer $token");refresh()}}){Text("Delete")}}} } }
        item { NotificationSettings(token.orEmpty()) }
        item { DashboardSection("Orders Summary") { Text("${data?.summary?.totalOrders ?: 0} total orders • ${money(data?.summary?.totalSpent ?: 0.0)} spent") } }
        item { Text("Recent Orders", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black) }
        items(data?.orders?.take(3).orEmpty(), key = { it.id.orEmpty() }) { order ->
            OrderCard(
                order = order,
                onInvoice = { openInvoice(order) },
                onBuyAgain = onShop,
                onSupport = { context.startActivity(Intent(Intent.ACTION_VIEW, "${BuildConfig.WEBSITE_URL.trimEnd('/')}/contact-us".toUri())) },
            )
        }
        item {
            val tracked = data?.orders?.firstOrNull { !it.shipment?.trackingNumber.isNullOrBlank() } ?: data?.orders?.firstOrNull()
            DashboardSection("Live Order Tracking") {
                Text(tracked?.orderNumber ?: "No active shipment", fontWeight = FontWeight.Black)
                Text("Status: ${displayStatus(tracked?.shipment?.status) ?: "Tracking begins after dispatch"}")
                Text("Expected Delivery: ${tracked?.shipment?.expectedDelivery ?: "To be confirmed"}")
                tracked?.shipment?.timeline.orEmpty().forEach { event ->
                    Text("• ${event.label.orEmpty()}${event.at?.let { " — $it" }.orEmpty()}")
                }
            }
        }
        item {
            val shipment = data?.orders?.firstOrNull { !it.shipment?.trackingNumber.isNullOrBlank() }?.shipment
            DashboardSection("Delivery & Tracking") {
                if (shipment == null) {
                    Text("Tracking details will appear after your order is dispatched.")
                }
                shipment?.courierPartner?.takeIf { it.isNotBlank() }?.let { Text("Courier Partner: $it") }
                shipment?.trackingNumber?.takeIf { it.isNotBlank() }?.let { Text("Tracking Number: $it") }
                shipment?.status?.takeIf { it.isNotBlank() }?.let { Text("Shipment Status: ${displayStatus(it)}") }
                shipment?.pickupStatus?.takeIf { it.isNotBlank() }?.let { Text("Pickup Status: ${displayStatus(it)}") }
                shipment?.expectedDelivery?.takeIf { it.isNotBlank() }?.let { Text("Expected Delivery: $it") }
                shipment?.deliveredAt?.takeIf { it.isNotBlank() }?.let { Text("Delivered: $it") }
                shipment?.lastUpdated?.takeIf { it.isNotBlank() }?.let { Text("Last Updated: $it") }
                shipment?.message?.let { Text(it, color = Color(0xFF78716C)) }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton({
                        val orderId = data?.orders?.firstOrNull { it.shipment?.trackingNumber == shipment?.trackingNumber }?.id
                        if (!orderId.isNullOrBlank()) scope.launch {
                            runCatching { ApiProvider.service.refreshOrderTracking("Bearer $token", orderId) }
                                .onSuccess { refresh() }
                                .onFailure { error = "Tracking is temporarily unavailable." }
                        }
                    }, enabled = !shipment?.trackingNumber.isNullOrBlank()) { Text("Refresh Tracking") }
                    Button({ context.startActivity(Intent(Intent.ACTION_VIEW, shipment?.trackingUrl.orEmpty().toUri())) }, enabled = !shipment?.trackingUrl.isNullOrBlank()) { Text("Track Shipment") }
                }
            }
        }
        item {
            DashboardSection("Saved Addresses") {
                Button({ editing = ShopAddressDto(fullName=data?.customer?.fullName.orEmpty(), mobile=data?.customer?.phone.orEmpty(), addressLine1="", city="", district="", state="", pincode="") }) { Text("Add Address") }
                data?.addresses.orEmpty().forEach { address ->
                    Surface(Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.surfaceVariant, shape = MaterialTheme.shapes.large) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("${address.fullName} • ${address.mobile}", fontWeight = FontWeight.Black)
                            Text("${address.addressLine1}, ${address.city}, ${address.state} – ${address.pincode}")
                            Text("${address.addressType}${if(address.isDefault==true)" • Default Address" else ""}")
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                TextButton({ editing = address }) { Text("Edit") }
                                TextButton({ if (data?.addresses.orEmpty().size > 1) scope.launch { ApiProvider.service.deleteDeliveryAddress("Bearer $token", address.id.orEmpty()); refresh() } }) { Text("Delete") }
                                if(address.isDefault!=true) TextButton({ scope.launch { ApiProvider.service.setDefaultDeliveryAddress("Bearer $token", address.id.orEmpty()); refresh() } }) { Text("Set Default") }
                            }
                        }
                    }
                }
            }
        }
        item { DashboardSection("Account Settings") { Text("Customer information and communication preferences are consolidated here.") } }
        item { DashboardSection("Security") { Text("Verified mobile/email, Google Sign-In and server-verified payments protect your account.") } }
        item { DashboardSection("Reward Points") { Text("${data?.rewards?.points ?: 0} points", style = MaterialTheme.typography.headlineMedium, color = Color(0xFFB7791F)); Text(data?.rewards?.message ?: "Rewards programme coming soon.") } }
        item { DashboardSection("Notifications") { data?.notifications.orEmpty().forEach { Text("• ${it.title}") }; if(data?.notifications.isNullOrEmpty()) Text("No new notifications.") } }
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
    editing?.let { current -> AddressDialog(current, { editing = null }, { value ->
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
    }) }
}

@Composable
private fun NotificationSettings(token:String){
    val scope=rememberCoroutineScope()
    var settings by remember{mutableStateOf(NotificationPreferencesDto())}
    var message by remember{mutableStateOf("")}
    LaunchedEffect(token){if(token.isNotBlank())runCatching{ApiProvider.service.getNotificationPreferences("Bearer $token").body()?.data}.getOrNull()?.let{settings=it}}
    DashboardSection("Notification Settings"){
        val values=listOf("Order notifications" to settings.orderPushEnabled,"Delivery notifications" to settings.deliveryPushEnabled,"Gold rate alerts" to settings.goldRateAlerts,"Silver rate alerts" to settings.silverRateAlerts,"Promotions" to settings.promotionalPushEnabled,"Email order updates" to settings.emailOrderUpdates)
        values.forEachIndexed{index,(label,checked)->Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Text(label);Switch(checked,{value->settings=when(index){0->settings.copy(orderPushEnabled=value);1->settings.copy(deliveryPushEnabled=value);2->settings.copy(goldRateAlerts=value);3->settings.copy(silverRateAlerts=value);4->settings.copy(promotionalPushEnabled=value);else->settings.copy(emailOrderUpdates=value)}})}}
        Button({scope.launch{val ok=runCatching{ApiProvider.service.saveNotificationPreferences("Bearer $token",settings).isSuccessful}.getOrDefault(false);message=if(ok)"Preferences saved." else "Unable to save preferences."}}){Text("Save Preferences")}
        if(message.isNotBlank())Text(message)
    }
}
@Composable private fun Metric(label:String,value:String,modifier:Modifier=Modifier){Card(modifier){Column(Modifier.padding(12.dp)){Text(label,style=MaterialTheme.typography.labelSmall);Text(value,style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Black,color=Color(0xFFB7791F))}}}
@Composable private fun DashboardSection(title:String,content:@Composable ColumnScope.()->Unit){Card(Modifier.fillMaxWidth(),colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surface),border=BorderStroke(1.dp,Color(0x66B7791F))){Column(Modifier.padding(17.dp),verticalArrangement=Arrangement.spacedBy(7.dp)){Text(title,style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Black,color=MaterialTheme.colorScheme.primary);content()}}}
@Composable
private fun OrderCard(
    order: DashboardOrderDto,
    onInvoice: () -> Unit,
    onBuyAgain: () -> Unit,
    onSupport: () -> Unit,
) {
    DashboardSection(order.productName.orEmpty()) {
        order.imageUrl?.let { raw ->
            AsyncImage(
                model = if (raw.startsWith("http")) raw else BuildConfig.WEBSITE_URL.trimEnd('/') + raw,
                contentDescription = order.productName,
                modifier = Modifier.fillMaxWidth().height(150.dp).padding(12.dp),
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
        if (order.invoiceNumber != null) OutlinedButton(onInvoice) { Text("Invoice") }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onBuyAgain) { Text("Buy Again") }
            OutlinedButton(onSupport) { Text("Need Help") }
        }
    }
}
@Composable private fun AddressDialog(initial:ShopAddressDto,onClose:()->Unit,onSave:(ShopAddressDto)->Unit){var value by remember(initial){mutableStateOf(initial)};AlertDialog(onDismissRequest=onClose,title={Text("Saved Address")},text={Column(Modifier.heightIn(max=500.dp),verticalArrangement=Arrangement.spacedBy(6.dp)){AddressField("Full Name",value.fullName){value=value.copy(fullName=it)};AddressField("Mobile",value.mobile){value=value.copy(mobile=it)};AddressField("Address Line 1",value.addressLine1){value=value.copy(addressLine1=it)};AddressField("City",value.city){value=value.copy(city=it)};AddressField("District",value.district){value=value.copy(district=it)};AddressField("State",value.state){value=value.copy(state=it)};AddressField("PIN Code",value.pincode){value=value.copy(pincode=it)}}},confirmButton={Button({onSave(value)}){Text("Save")}},dismissButton={TextButton(onClose){Text("Cancel")}})}
@Composable private fun AddressField(label:String,value:String,onChange:(String)->Unit){OutlinedTextField(value,onChange,label={Text(label)},singleLine=true)}
private fun money(value:Double)=NumberFormat.getCurrencyInstance(Locale("en","IN")).format(value)
internal fun displayStatus(value:String?):String?=value?.replace('_',' ')?.lowercase(Locale.ENGLISH)?.replaceFirstChar { if(it.isLowerCase())it.titlecase(Locale.ENGLISH) else it.toString() }
