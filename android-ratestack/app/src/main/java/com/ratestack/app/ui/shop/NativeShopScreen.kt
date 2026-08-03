package com.ratestack.app.ui.shop

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.ratestack.app.BuildConfig
import com.ratestack.app.MainActivity
import com.ratestack.app.data.*
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale
import java.util.UUID

@Composable
fun NativeShopScreen(
    token: String?,
    onLogin: () -> Unit,
    onCheckoutLogin: (String, Double, Int) -> Unit,
    onRegister: () -> Unit,
    onGoogleLogin: () -> Unit,
    onOrders: () -> Unit,
    pendingCheckout: PendingAuthDestination? = null,
    onPendingCheckoutRestored: () -> Unit = {},
    modifier: Modifier = Modifier,
    embedded: Boolean = false,
) {
    var products by remember { mutableStateOf<List<ShopProductDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf<String?>(null) }
    var checkoutSelection by remember { mutableStateOf<Triple<ShopProductDto, Double, Int>?>(null) }
    val selections = remember { mutableStateMapOf<String, Pair<Double, Int>>() }
    val scope = rememberCoroutineScope()
    val activity = LocalContext.current as? MainActivity
    LaunchedEffect(Unit) {
        runCatching { ApiProvider.service.getShop() }.onSuccess { response ->
            products = response.body()?.data?.products.orEmpty().filter { it.enabled != false }
            products.forEach { p -> p.productId?.let { id ->
                val weights = p.availableWeights.orEmpty()
                val initial = if (p.metalType.equals("SILVER", true) && 10.0 in weights) 10.0 else weights.firstOrNull() ?: 10.0
                selections[id] = initial to 1
            } }
        }.onFailure { errorMessage = "Unable to load Shop products." }
        loading = false
    }
    LaunchedEffect(products, token, pendingCheckout) {
        val pending = pendingCheckout
        if (!token.isNullOrBlank() && pending?.validCheckout() == true) {
            val product = products.firstOrNull { it.productId == pending.productId }
            val weight = pending.weightGrams
            val quantity = pending.quantity
            if (product != null && weight != null && quantity != null && weight in product.availableWeights.orEmpty()) {
                selections[product.productId.orEmpty()] = weight to quantity
                checkoutSelection = Triple(product, weight, quantity)
                onPendingCheckoutRestored()
            }
        }
    }
    fun checkout(product: ShopProductDto, request: ShopCheckoutRequestDto) {
        if (token.isNullOrBlank()) { onLogin(); return }
        val productId = product.productId ?: return
        if (busy != null) return
        busy = productId; errorMessage = null
        scope.launch {
            try {
                val config = ApiProvider.service.getPaymentConfig().body()
                if (config?.activeGateway.isNullOrBlank()) throw IllegalStateException("Payment service is not configured yet.")
                val response = ApiProvider.service.createShopCheckout("Bearer $token", request)
                val order = response.body()?.data
                if (!response.isSuccessful || order == null) throw IllegalStateException(response.body()?.error?.message ?: "Unable to create Shop order.")
                if (order.gateway == "RAZORPAY") {
                    if (activity == null || order.keyId.isNullOrBlank() || order.gatewayOrderId.isNullOrBlank() || order.shopOrderId.isNullOrBlank()) throw IllegalStateException("Razorpay is not configured.")
                    activity.startRazorpayCheckout(order.keyId, order.gatewayOrderId, ((order.amount ?: 0.0) * 100).toLong(), { paymentId, signature ->
                        scope.launch {
                            val verified = ApiProvider.service.verifyShopPayment("Bearer $token", ShopVerifyRequestDto(order.shopOrderId, paymentId, signature))
                            if (verified.isSuccessful && verified.body()?.success == true) onOrders() else errorMessage = verified.body()?.error?.message ?: "Payment verification failed."
                            busy = null
                        }
                    }, { message -> errorMessage = message ?: "Payment failed."; busy = null })
                } else {
                    val redirect = order.redirectUrl ?: throw IllegalStateException("PhonePe checkout is unavailable.")
                    activity?.startPhonePePaymentSheet(redirect, order.gatewayOrderId.orEmpty(), { onOrders(); busy = null }, { message -> errorMessage = message; busy = null })
                        ?: throw IllegalStateException("PhonePe checkout is unavailable.")
                }
            } catch (exception: Exception) { errorMessage = exception.message ?: "Checkout failed."; busy = null }
        }
    }
    val catalogueModifier = if (embedded) {
        modifier.fillMaxWidth()
    } else {
        modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 112.dp)
    }
    Column(catalogueModifier, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
            "Buy Certified Gold & Silver Coins at Live Trichy Rates",
            style = if (embedded) MaterialTheme.typography.headlineSmall else MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Black,
        )
        Text("Shop 22K Gold and Silver Coins at the current Tiruchirappalli market rate.")
        if (token.isNullOrBlank()) {
            com.ratestack.app.ui.components.AuthActionPanel(
                variant = com.ratestack.app.ui.components.AuthActionPanelVariant.COMPACT,
                heading = "Ready to shop?",
                supportingText = "Sign in to purchase, track orders and download invoices.",
                onLogin = onLogin,
                onRegister = onRegister,
                onGoogleLogin = onGoogleLogin,
                googleErrorMessage = errorMessage,
            )
        } else {
            errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }
        if (loading) CircularProgressIndicator()
        products.forEach { product ->
            val id = product.productId.orEmpty()
            val weights = product.availableWeights.orEmpty()
            val initialWeight = if (product.metalType.equals("SILVER", true) && 10.0 in weights) 10.0 else weights.firstOrNull() ?: 10.0
            val selected = selections[id] ?: (initialWeight to 1)
            val key = if (selected.first % 1.0 == 0.0) selected.first.toInt().toString() else selected.first.toString()
            ShopCard(product, weights, selected.first, selected.second, product.prices?.get(key), busy == id,
                { selections[id] = it to selected.second }, { selections[id] = selected.first to it.coerceIn(1, 10) },
                { if (token.isNullOrBlank()) onCheckoutLogin(id, selected.first, selected.second) else checkoutSelection = Triple(product, selected.first, selected.second) })
        }
    }
    checkoutSelection?.let { selected ->
        ShopCheckoutDialog(
            token = token.orEmpty(), product = selected.first, weight = selected.second, quantity = selected.third,
            onDismiss = { checkoutSelection = null },
            onConfirm = { request -> checkoutSelection = null; checkout(selected.first, request) },
        )
    }
}

@Composable
private fun ShopCheckoutDialog(token: String, product: ShopProductDto, weight: Double, quantity: Int, onDismiss: () -> Unit, onConfirm: (ShopCheckoutRequestDto) -> Unit) {
    var profile by remember { mutableStateOf(CustomerProfileDto(null, null, null, null, null, null)) }
    var saved by remember { mutableStateOf<List<ShopAddressDto>>(emptyList()) }
    var address by remember { mutableStateOf(ShopAddressDto(fullName="", mobile="", addressLine1="", city="", district="", state="", pincode="")) }
    var name by remember { mutableStateOf("") }; var mobile by remember { mutableStateOf("") }; var email by remember { mutableStateOf("") }
    var review by remember { mutableStateOf(false) }; var error by remember { mutableStateOf<String?>(null) }
    var gateway by remember { mutableStateOf("RAZORPAY") }; var saveFuture by remember { mutableStateOf(true) }; var makeDefault by remember { mutableStateOf(false) }
    var gstEnabled by remember { mutableStateOf(false) };var gstBusiness by remember { mutableStateOf("") };var gstNumber by remember { mutableStateOf("") };var gstAddress by remember { mutableStateOf("") };var gstSameAsDelivery by remember { mutableStateOf(false) }
    var couponCode by remember { mutableStateOf("") }; var appliedCoupon by remember { mutableStateOf<CouponValidationDto?>(null) }; var couponBusy by remember { mutableStateOf(false) }
    val checkoutScope = rememberCoroutineScope()
    LaunchedEffect(Unit) {
        runCatching {
            val auth = "Bearer $token"
            profile = ApiProvider.service.getCustomerProfile(auth).body()?.data ?: profile
            saved = ApiProvider.service.getDeliveryAddresses(auth).body()?.data.orEmpty()
            ApiProvider.service.getGstProfile(auth).body()?.data?.let { gstEnabled=false;gstBusiness=it.businessName.orEmpty();gstNumber=it.gstNumber.orEmpty();gstAddress=it.billingAddress.orEmpty() }
        }.onSuccess {
            name = profile.fullName.orEmpty(); mobile = profile.phone.orEmpty(); email = profile.email.orEmpty()
            address = saved.firstOrNull { it.isDefault == true } ?: saved.firstOrNull()
                ?: address.copy(fullName = name, mobile = mobile)
            gateway = ApiProvider.service.getPaymentConfig().body()?.activeGateway ?: "RAZORPAY"
        }
    }
    val deliveryBillingAddress="${address.addressLine1}${if(address.addressLine2.isNotBlank())", ${address.addressLine2}" else ""}, ${address.city}, ${address.district}, ${address.state} - ${address.pincode}, India"
    val effectiveGstAddress=if(gstSameAsDelivery)deliveryBillingAddress else gstAddress
    val gstValid=!gstEnabled||(gstBusiness.trim().isNotEmpty()&&gstBusiness.length<=150&&effectiveGstAddress.trim().isNotEmpty()&&effectiveGstAddress.length<=500&&Regex("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$").matches(gstNumber))
    val weightKey=if(weight%1.0==0.0)weight.toInt().toString() else weight.toString()
    val unitPrice=product.prices?.get(weightKey)
    val subtotal=((unitPrice?.metalValue?:0.0)+(unitPrice?.serviceCharge?:0.0))*quantity
    val shipping=(unitPrice?.shipping?:0.0)*quantity
    val baseGst=(unitPrice?.gst?:0.0)*quantity
    val baseTotal=(unitPrice?.total?:0.0)*quantity
    val valid = name.trim().length >= 2 && Regex("^(?:\\+91)?[6-9]\\d{9}$").matches(mobile.trim()) &&
        android.util.Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches() && address.fullName.trim().length >= 2 &&
        Regex("^(?:\\+91)?[6-9]\\d{9}$").matches(address.mobile.trim()) && address.addressLine1.trim().length >= 3 &&
        address.city.isNotBlank() && address.district.isNotBlank() && address.state.isNotBlank() && Regex("^[1-9]\\d{5}$").matches(address.pincode) && gstValid
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (review) "Review & Payment" else "Checkout Details", fontWeight = FontWeight.Black) },
        text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Text("Customer Details • Delivery Address • Order Review • Payment", style = MaterialTheme.typography.bodySmall)
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            if (!review) {
                CheckoutField("Full Name", name) { name = it }; CheckoutField("Indian Mobile Number", mobile) { mobile = it }
                CheckoutField("Email Address", email) { email = it }
                if (saved.isNotEmpty()) {
                    Text("Choose Delivery Address", fontWeight = FontWeight.Bold)
                    saved.forEach { item ->
                        Card(Modifier.fillMaxWidth(), border = BorderStroke(if (address.id == item.id) 2.dp else 1.dp, if (address.id == item.id) Color(0xFFE2AD3D) else MaterialTheme.colorScheme.outlineVariant)) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                Text("${item.fullName} • ${item.mobile}", fontWeight = FontWeight.Black)
                                Text("${item.addressLine1}${if (item.addressLine2.isNotBlank()) ", ${item.addressLine2}" else ""}")
                                if (item.landmark.isNotBlank()) Text("Near ${item.landmark}")
                                Text("${item.city}, ${item.district}, ${item.state} – ${item.pincode}")
                                Text("${item.addressType}${if (item.isDefault == true) " • Default" else ""}", fontWeight = FontWeight.Bold)
                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    TextButton({ address = item }) { Text("Deliver here") }
                                    if (item.isDefault != true) TextButton({ checkoutScope.launch {
                                        val result = ApiProvider.service.setDefaultDeliveryAddress("Bearer $token", item.id.orEmpty())
                                        result.body()?.data?.let { updated -> saved = saved.map { it.copy(isDefault = it.id == updated.id) }; address = updated }
                                    } }) { Text("Set default") }
                                    TextButton({
                                        if (saved.size <= 1) error = "Add another valid address before deleting your only saved address."
                                        else checkoutScope.launch {
                                            val result = ApiProvider.service.deleteDeliveryAddress("Bearer $token", item.id.orEmpty())
                                            if (result.isSuccessful) { saved = saved.filterNot { it.id == item.id }; address = saved.firstOrNull { it.id != item.id } ?: address }
                                        }
                                    }) { Text("Delete") }
                                }
                            }
                        }
                    }
                    OutlinedButton({ address = ShopAddressDto(fullName=name, mobile=mobile, addressLine1="", city="", district="", state="", pincode=""); saveFuture = true; makeDefault = false }, Modifier.fillMaxWidth()) { Text("Add New Delivery Address") }
                }
                CheckoutField("Delivery Full Name", address.fullName) { address = address.copy(fullName=it) }
                CheckoutField("Delivery Mobile", address.mobile) { address = address.copy(mobile=it) }
                CheckoutField("Address Line 1", address.addressLine1) { address = address.copy(addressLine1=it) }
                CheckoutField("Address Line 2 (optional)", address.addressLine2) { address = address.copy(addressLine2=it) }
                CheckoutField("Landmark (optional)", address.landmark) { address = address.copy(landmark=it) }
                CheckoutField("City", address.city) { address = address.copy(city=it) }; CheckoutField("District", address.district) { address = address.copy(district=it) }
                CheckoutField("State", address.state) { address = address.copy(state=it) }; CheckoutField("PIN Code", address.pincode) { address = address.copy(pincode=it.filter(Char::isDigit).take(6)) }
                if (address.id == null) {
                    Row(verticalAlignment = Alignment.CenterVertically) { Checkbox(saveFuture || saved.isEmpty(), { saveFuture = it }, enabled = saved.isNotEmpty()); Text("Save this address for future orders") }
                    Row(verticalAlignment = Alignment.CenterVertically) { Checkbox(makeDefault || saved.isEmpty(), { makeDefault = it }, enabled = saved.isNotEmpty()); Text("Make this my default address") }
                } else OutlinedButton({ checkoutScope.launch {
                    val result = ApiProvider.service.updateDeliveryAddress("Bearer $token", address.id.orEmpty(), address)
                    result.body()?.data?.let { updated -> saved = saved.map { if (it.id == updated.id) updated else it }; address = updated }
                } }) { Text("Edit / Save Address") }
                Text("3. GST Billing Details",fontWeight=FontWeight.Black)
                Text("GST Invoice Required?")
                Row(verticalAlignment=Alignment.CenterVertically){RadioButton(!gstEnabled,{gstEnabled=false});Text("No");RadioButton(gstEnabled,{gstEnabled=true});Text("Yes")}
                if(gstEnabled){CheckoutField("GST Registered Business Name",gstBusiness){gstBusiness=it.take(150)};Row(verticalAlignment=Alignment.CenterVertically){Checkbox(gstSameAsDelivery,{gstSameAsDelivery=it});Text("Billing Address same as Delivery Address")};OutlinedTextField(if(gstSameAsDelivery)deliveryBillingAddress else gstAddress,{gstAddress=it.take(500);gstSameAsDelivery=false},Modifier.fillMaxWidth(),label={Text("GST Billing Address")},minLines=3);CheckoutField("GST Number",gstNumber){gstNumber=it.trim().uppercase(Locale.ENGLISH).take(15)};if(gstNumber.isNotEmpty()&&!gstValid)Text("Enter a valid 15-character GSTIN.",color=MaterialTheme.colorScheme.error)}
            } else {
                Text("${product.name} • ${weight.toInt()}g × $quantity", fontWeight = FontWeight.Black)
                Text("Purity: ${product.purity} • Live Trichy rate: ${money(product.ratePerGram ?: 0.0)}/g")
                Text("Source: ${friendlyRateSource(product.rateSource)} • ${formatRateDate(product.rateDate)}")
                Text("$name • $mobile • $email"); Text("${address.addressLine1}, ${address.city}, ${address.district}, ${address.state} – ${address.pincode}, India")
                Text("Payment method: $gateway", fontWeight = FontWeight.Bold)
                if(gstEnabled){Text("GST Invoice",fontWeight=FontWeight.Black);Text(gstBusiness);Text(gstNumber);Text(effectiveGstAddress)}
                Divider()
                PriceRow("Subtotal", money(subtotal)); PriceRow("Shipping", if(shipping==0.0)"FREE" else money(shipping))
                Text("Coupon",fontWeight=FontWeight.Bold)
                Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(8.dp)){OutlinedTextField(couponCode,{couponCode=it.uppercase(Locale.ENGLISH);appliedCoupon=null},Modifier.weight(1f),label={Text("Coupon Code")},singleLine=true,enabled=appliedCoupon==null);if(appliedCoupon==null)Button({checkoutScope.launch{couponBusy=true;error=null;val response=runCatching{ApiProvider.service.validateCoupon("Bearer $token",CouponValidateRequestDto(couponCode,CouponCartDto(product.productId.orEmpty(),weight,quantity)))}.getOrNull();val body=response?.body();if(response?.isSuccessful==true&&body?.data?.eligible==true){appliedCoupon=body.data;couponCode=body.data.code.orEmpty()}else error=body?.error?.message?:body?.data?.reason?:"Invalid coupon";couponBusy=false}},enabled=couponCode.isNotBlank()&&!couponBusy){Text(if(couponBusy)"Applying…" else "Apply")}else TextButton({appliedCoupon=null;couponCode=""}){Text("Remove")}}
                appliedCoupon?.let{Text("Coupon Applied · ${it.code}  -${money(it.discountAmount?:0.0)}",color=Color(0xFF15803D),fontWeight=FontWeight.Bold)}
                PriceRow("GST (3%)",money(appliedCoupon?.gstAmount?:baseGst)); Divider(); PriceRow("Grand Total",money(appliedCoupon?.totalAmount?:baseTotal))
                Text("Gateway opens only after you confirm below.", style = MaterialTheme.typography.bodySmall)
            }
        } },
        confirmButton = { Button({
            if (!review) { if (valid) { error = null; review = true } else error = if(gstEnabled&&!gstValid)"Complete all required GST billing fields and enter a valid 15-character GSTIN." else "Complete all required fields with a valid mobile number and six-digit PIN code." }
            else checkoutScope.launch {
                var selected = address
                if (address.id == null && (saveFuture || saved.isEmpty())) {
                    val result = ApiProvider.service.createDeliveryAddress("Bearer $token", address.copy(isDefault = makeDefault || saved.isEmpty()))
                    selected = result.body()?.data ?: run { error = result.body()?.error?.message ?: "Unable to save address."; return@launch }
                }
                onConfirm(ShopCheckoutRequestDto(product.productId.orEmpty(), weight, quantity, gateway, UUID.randomUUID().toString(), ShopCustomerDto(name.trim(), mobile.trim(), email.trim()), addressId = selected.id, newAddress = if (selected.id == null) selected else null,gst=if(gstEnabled)GstDetailsDto(true,gstBusiness.trim(),gstNumber,effectiveGstAddress.trim())else GstDetailsDto(false),couponCode=appliedCoupon?.code))
            }
        }, enabled = review || valid) { Text(if (review) "Confirm & Pay" else "Review Order") } },
        dismissButton = { TextButton(if (review) ({ review = false }) else onDismiss) { Text(if (review) "Edit Details" else "Cancel") } },
    )
}

@Composable private fun CheckoutField(label: String, value: String, onValue: (String) -> Unit) {
    OutlinedTextField(value, onValue, Modifier.fillMaxWidth(), label = { Text(label) }, singleLine = true)
}

@Composable
private fun ShopCard(product: ShopProductDto, weights: List<Double>, weight: Double, quantity: Int, unit: ShopPriceDto?, busy: Boolean, onWeight: (Double) -> Unit, onQuantity: (Int) -> Unit, onBuy: () -> Unit) {
    Card(Modifier.fillMaxWidth(), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val raw = product.imageUrl.orEmpty()
            AsyncImage(if (raw.startsWith("http")) raw else BuildConfig.WEBSITE_URL.trimEnd('/') + raw, product.name, Modifier.fillMaxWidth().height(220.dp).padding(22.dp), contentScale = ContentScale.Fit)
            Text(product.name.orEmpty(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
            Text(product.description.orEmpty())
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Purity: ${product.purity ?: "Verified"}", fontWeight = FontWeight.Bold)
                Text("In stock", color = Color(0xFF15803D), fontWeight = FontWeight.Bold)
            }
            Text("Weight: ${shopWeightLabel(weight)}", fontWeight = FontWeight.Bold)
            Text("Live Trichy rate: ${money(product.ratePerGram ?: 0.0)} / g", fontWeight = FontWeight.Bold)
            Text("Source: ${friendlyRateSource(product.rateSource)}")
            Text("${product.rateSourceType?.replace('_', ' ') ?: "Market reference rate"} - ${formatRateDate(product.rateDate)}")
            Text("Available weights", fontWeight = FontWeight.Bold)
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) { weights.forEach { option -> if (option == weight) Button({ onWeight(option) }) { Text(shopWeightLabel(option)) } else OutlinedButton({ onWeight(option) }) { Text(shopWeightLabel(option)) } } }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Quantity", fontWeight = FontWeight.Bold); OutlinedButton({ onQuantity(quantity - 1) }, enabled = quantity > 1) { Text("−") }; Text("$quantity", fontWeight = FontWeight.Black); OutlinedButton({ onQuantity(quantity + 1) }, enabled = quantity < 10) { Text("+") }
            }
            unit?.let { price ->
                Surface(color = Color(0xFF1C1917)) { Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    PriceRow("Metal Value", money((price.metalValue ?: 0.0) * quantity)); PriceRow("Service Charge", money((price.serviceCharge ?: 0.0) * quantity)); PriceRow("GST (3%)", money((price.gst ?: 0.0) * quantity)); PriceRow("Shipping Cost", "FREE", Color(0xFF6EE7B7)); Divider(); PriceRow("Total Payable", money((price.total ?: 0.0) * quantity), Color(0xFFFCD34D))
                } }
            }
            Button(onBuy, Modifier.fillMaxWidth().heightIn(min = 52.dp), enabled = !busy, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE2AD3D), contentColor = Color(0xFF292015))) {
                if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Icon(Icons.Default.ShoppingCart, null); Spacer(Modifier.width(8.dp)); Text(if (busy) "Preparing…" else "Buy Now", fontWeight = FontWeight.Black)
            }
        }
    }
}

internal fun friendlyRateSource(value: String?): String = when (value?.uppercase(Locale.ENGLISH)) {
    "GOODRETURNS" -> "GoodReturns Trichy"
    "IBJA" -> "IBJA reference"
    null, "" -> "Previous verified rate"
    else -> value.replace('_', ' ')
}

internal fun formatRateDate(value: String?): String {
    if (value.isNullOrBlank()) return "Latest verified rate"
    return runCatching {
        val parser = java.text.SimpleDateFormat(
            if (value.contains('.')) "yyyy-MM-dd'T'HH:mm:ss.SSSX" else "yyyy-MM-dd'T'HH:mm:ssX",
            Locale.ENGLISH,
        ).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
        java.text.SimpleDateFormat("d MMM yyyy, h:mm a", Locale.ENGLISH).apply {
            timeZone = java.util.TimeZone.getTimeZone("Asia/Kolkata")
        }.format(requireNotNull(parser.parse(value)))
    }.getOrElse { value }
}
@Composable private fun PriceRow(label: String, value: String, color: Color = Color.White) { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(label, color = Color.White); Text(value, color = color, fontWeight = FontWeight.Bold) } }
private fun money(value: Double) = NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(value)
private fun shopWeightLabel(value: Double) = if (value == 1000.0) "1kg" else "${value.toInt()}g"
