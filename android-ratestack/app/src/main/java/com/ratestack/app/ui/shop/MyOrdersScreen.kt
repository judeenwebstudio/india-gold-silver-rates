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
                .onSuccess { response -> dashboard = response.body()?.data; if (!response.isSuccessful) error = response.body()?.error?.message }
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
                Text("Status: ${tracked?.shipment?.status ?: "Tracking begins after dispatch"}")
                Text("Expected Delivery: ${tracked?.shipment?.expectedDelivery ?: "To be confirmed"}")
                tracked?.shipment?.timeline.orEmpty().forEach { event ->
                    Text("• ${event.label.orEmpty()}${event.at?.let { " — $it" }.orEmpty()}")
                }
            }
        }
        item {
            val shipment = data?.orders?.firstOrNull { !it.shipment?.trackingNumber.isNullOrBlank() }?.shipment
            DashboardSection("Shiprocket Integration") {
                Text("Courier Partner: ${shipment?.courierPartner ?: "Assignment pending"}")
                Text("Tracking Number: ${shipment?.trackingNumber ?: "Not assigned"}")
                Text("Shipment Status: ${shipment?.status ?: "No shipment"}")
                Button({ context.startActivity(Intent(Intent.ACTION_VIEW, (shipment?.trackingUrl ?: "https://www.shiprocket.in/shipment-tracking/").toUri())) }, enabled = !shipment?.trackingNumber.isNullOrBlank()) { Text("Open Tracking") }
            }
        }
        item {
            DashboardSection("Saved Addresses") {
                Button({ editing = ShopAddressDto(fullName=data?.customer?.fullName.orEmpty(), mobile=data?.customer?.phone.orEmpty(), addressLine1="", city="", district="", state="", pincode="") }) { Text("Add Address") }
                data?.addresses.orEmpty().forEach { address ->
                    Surface(Modifier.fillMaxWidth(), color = Color(0xFFF8F5EF), shape = MaterialTheme.shapes.large) {
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
            if (value.id == null) ApiProvider.service.createDeliveryAddress("Bearer $token", value)
            else ApiProvider.service.updateDeliveryAddress("Bearer $token", value.id, value)
            editing = null; refresh()
        }
    }) }
}

@Composable private fun Metric(label:String,value:String,modifier:Modifier=Modifier){Card(modifier){Column(Modifier.padding(12.dp)){Text(label,style=MaterialTheme.typography.labelSmall);Text(value,style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Black,color=Color(0xFFB7791F))}}}
@Composable private fun DashboardSection(title:String,content:@Composable ColumnScope.()->Unit){Card(Modifier.fillMaxWidth(),colors=CardDefaults.cardColors(containerColor=Color(0xFFFDFBF7)),border=BorderStroke(1.dp,Color(0x33B7791F))){Column(Modifier.padding(17.dp),verticalArrangement=Arrangement.spacedBy(7.dp)){Text(title,style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Black,color=Color(0xFF6B470C));content()}}}
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
        Text("Payment Status: ${order.paymentStatus} • Shipment: ${order.shipment?.status}")
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
