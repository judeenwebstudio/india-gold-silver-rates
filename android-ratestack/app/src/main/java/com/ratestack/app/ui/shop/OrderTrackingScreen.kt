package com.ratestack.app.ui.shop

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.ratestack.app.BuildConfig
import com.ratestack.app.data.ApiProvider
import com.ratestack.app.data.OrderTrackingResponseDto
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val TIMELINE_STAGES = listOf(
    "Order Placed",
    "Payment Confirmed",
    "Processing",
    "Packed",
    "Pickup Scheduled",
    "Picked Up",
    "In Transit",
    "Reached Destination City",
    "Out For Delivery",
    "Delivered"
)

private fun getStageIndex(shipmentStatus: String?, orderStatus: String?): Int {
    val s = shipmentStatus?.uppercase().orEmpty()
    val o = orderStatus?.uppercase().orEmpty()
    return when {
        s == "DELIVERED" || o == "DELIVERED" -> 9
        s == "OUT_FOR_DELIVERY" || o == "OUT_FOR_DELIVERY" -> 8
        s == "IN_TRANSIT" || o == "IN_TRANSIT" -> 6
        s == "SHIPPED" || o == "SHIPPED" -> 5
        s == "PICKUP_SCHEDULED" -> 4
        o == "PACKED" || s == "READY_TO_SHIP" -> 3
        o == "PROCESSING" -> 2
        o == "ORDER_CONFIRMED" || o == "PAYMENT_VERIFIED" -> 1
        else -> 0
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderTrackingScreen(
    orderId: String,
    token: String?,
    onBack: () -> Unit,
) {
    var trackingData by remember { mutableStateOf<OrderTrackingResponseDto?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var isRefreshing by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun loadTracking(isManual: Boolean = false) {
        if (token.isNullOrBlank()) {
            errorMessage = "Authentication required."
            isLoading = false
            return
        }
        if (isManual) isRefreshing = true
        scope.launch {
            runCatching {
                if (isManual) ApiProvider.service.refreshOrderTracking("Bearer $token", orderId)
                else ApiProvider.service.getOrderTracking("Bearer $token", orderId)
            }.onSuccess { response ->
                if (response.isSuccessful) {
                    trackingData = response.body()?.data
                    errorMessage = null
                } else {
                    errorMessage = ApiProvider.errorMessage(response, "Unable to load shipment tracking.")
                }
            }.onFailure {
                errorMessage = "Network error loading shipment tracking."
            }
            isLoading = false
            isRefreshing = false
        }
    }

    LaunchedEffect(orderId, token) {
        loadTracking(false)
    }

    // Auto refresh every 60s while active
    LaunchedEffect(trackingData?.order?.isTerminal) {
        if (trackingData?.order?.isTerminal == true) return@LaunchedEffect
        while (true) {
            delay(60_000)
            loadTracking(false)
        }
    }

    val data = trackingData
    val order = data?.order
    val summary = data?.summary
    val delivery = data?.deliveryAddress

    val currentStageIdx = getStageIndex(order?.shipmentStatus, order?.orderStatus)
    val isCancelled = order?.shipmentStatus == "CANCELLED" || order?.orderStatus == "CANCELLED"
    val isReturned = order?.shipmentStatus == "RETURNED" || order?.orderStatus == "RETURNED"

    Scaffold(
        topBar = {
            SmallTopAppBar(
                title = {
                    Text(
                        text = if (order != null) "Order #${order.orderNumber}" else "Order Tracking",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { loadTracking(true) }, enabled = !isRefreshing) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.smallTopAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { paddingValues ->
        if (isLoading) {
            Box(Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFFE2AD3D))
            }
            return@Scaffold
        }

        if (errorMessage != null && data == null) {
            Box(Modifier.fillMaxSize().padding(paddingValues).padding(24.dp), contentAlignment = Alignment.Center) {
                Text(errorMessage.orEmpty(), color = MaterialTheme.colorScheme.error)
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // HEADER CARD
            item {
                Surface(
                    color = Color(0xFF1C1917),
                    shape = MaterialTheme.shapes.extraLarge,
                    border = BorderStroke(1.dp, Color(0x55E2AD3D))
                ) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("LIVE SHIPMENT TRACKING", color = Color(0xFFF5C96A), fontWeight = FontWeight.Black, fontSize = 11.sp)
                        Text("Order #${order?.orderNumber}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black, color = Color.White)
                        
                        val statusText = when {
                            isCancelled -> "🔴 Cancelled"
                            isReturned -> "🔁 Returned"
                            order?.shipmentStatus == "DELIVERED" -> "✅ Delivered"
                            else -> "🟢 ${displayStatus(order?.shipmentStatus)}"
                        }
                        Text(statusText, fontWeight = FontWeight.Bold, color = Color(0xFFF5C96A))

                        Divider(color = Color(0x33E2AD3D))

                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column { Text("Courier", color = Color.Gray, fontSize = 11.sp); Text(order?.courierPartner ?: "RateStack Express", color = Color.White, fontWeight = FontWeight.Bold) }
                            Column { Text("AWB / Tracking", color = Color.Gray, fontSize = 11.sp); Text(order?.awbCode ?: "Pending", color = Color(0xFFF5C96A), fontWeight = FontWeight.Bold) }
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column { Text("Invoice No.", color = Color.Gray, fontSize = 11.sp); Text(order?.invoiceNumber ?: "Pending", color = Color.White) }
                            Column { Text("Expected Delivery", color = Color.Gray, fontSize = 11.sp); Text(order?.expectedDeliveryAt ?: "To be confirmed", color = Color(0xFF4ADE80), fontWeight = FontWeight.Bold) }
                        }
                    }
                }
            }

            // VERTICAL TIMELINE
            item {
                Surface(
                    color = MaterialTheme.colorScheme.surface,
                    shape = MaterialTheme.shapes.large,
                    border = BorderStroke(1.dp, Color(0x33B7791F))
                ) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Shipment Progress Timeline", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                        
                        if (isCancelled) {
                            Text("🔴 Shipment Cancelled", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold)
                        } else if (isReturned) {
                            Text("🔁 Shipment Returned to Sender", color = Color(0xFFF97316), fontWeight = FontWeight.Bold)
                        } else {
                            TIMELINE_STAGES.forEachIndexed { idx, stageLabel ->
                                val isDone = idx < currentStageIdx
                                val isCurrent = idx == currentStageIdx
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(16.dp)
                                            .clip(CircleShape)
                                            .background(
                                                when {
                                                    isDone -> Color(0xFF22C55E)
                                                    isCurrent -> Color(0xFFE2AD3D)
                                                    else -> Color.DarkGray
                                                }
                                            )
                                    )
                                    Spacer(Modifier.width(12.dp))
                                    Text(
                                        text = stageLabel,
                                        fontWeight = if (isCurrent) FontWeight.Black else if (isDone) FontWeight.Bold else FontWeight.Normal,
                                        color = if (isCurrent) Color(0xFFF5C96A) else if (isDone) Color(0xFF4ADE80) else Color.Gray,
                                        fontSize = if (isCurrent) 15.sp else 13.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // LIVE MAP PLACEHOLDER
            item {
                Surface(
                    color = Color(0xFF0F0D0B),
                    shape = MaterialTheme.shapes.large,
                    border = BorderStroke(1.dp, Color(0x33B7791F))
                ) {
                    Column(
                        Modifier.fillMaxWidth().padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("📍 Live Vehicle Tracking", fontWeight = FontWeight.Black, color = Color.White)
                        Text("Live vehicle tracking is currently unavailable.", color = Color(0xFFD6D3D1), fontSize = 12.sp)
                        Text("GPS vehicle telemetry stream will connect upon courier driver assignment.", color = Color.Gray, fontSize = 11.sp)
                    }
                }
            }

            // CHRONOLOGICAL EVENTS
            item {
                Surface(
                    color = MaterialTheme.colorScheme.surface,
                    shape = MaterialTheme.shapes.large,
                    border = BorderStroke(1.dp, Color(0x33B7791F))
                ) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Tracking Events Log", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                        val events = data?.events.orEmpty()
                        if (events.isEmpty()) {
                            Text("Detailed status events will appear after hub scan.", color = Color.Gray, fontSize = 12.sp)
                        } else {
                            events.forEach { event ->
                                Column(Modifier.fillMaxWidth().background(Color(0xFF141210), MaterialTheme.shapes.medium).padding(10.dp)) {
                                    Text(event.message.orEmpty(), fontWeight = FontWeight.Bold, color = Color(0xFFF5C96A), fontSize = 12.sp)
                                    event.location?.let { Text(it, color = Color.LightGray, fontSize = 11.sp) }
                                    Text("${event.createdAt?.take(16)?.replace("T", " ")} • ${event.source}", color = Color.Gray, fontSize = 10.sp)
                                }
                            }
                        }
                    }
                }
            }

            // DELIVERY ADDRESS & ORDER SUMMARY
            item {
                Surface(
                    color = MaterialTheme.colorScheme.surface,
                    shape = MaterialTheme.shapes.large,
                    border = BorderStroke(1.dp, Color(0x33B7791F))
                ) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Delivery Address", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                        Text(delivery?.customerName.orEmpty(), fontWeight = FontWeight.Bold)
                        Text(delivery?.customerPhone.orEmpty(), color = Color(0xFFF5C96A))
                        Text("${delivery?.addressLine1.orEmpty()}, ${delivery?.deliveryCity.orEmpty()}, ${delivery?.deliveryState.orEmpty()} - ${delivery?.deliveryPincode.orEmpty()}", color = Color.LightGray, fontSize = 12.sp)
                    }
                }
            }

            item {
                Surface(
                    color = MaterialTheme.colorScheme.surface,
                    shape = MaterialTheme.shapes.large,
                    border = BorderStroke(1.dp, Color(0x33B7791F))
                ) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Order Item Summary", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                        summary?.let { s ->
                            s.imageUrl?.let { raw ->
                                AsyncImage(
                                    model = if (raw.startsWith("http")) raw else BuildConfig.WEBSITE_URL.trimEnd('/') + raw,
                                    contentDescription = s.productName.orEmpty(),
                                    modifier = Modifier.fillMaxWidth().height(120.dp),
                                    contentScale = ContentScale.Fit
                                )
                            }
                            Text(s.productName.orEmpty(), fontWeight = FontWeight.Black, fontSize = 16.sp)
                            Text("Purity: ${s.purity} • Weight: ${s.weightGrams}g • Qty: ${s.quantity}")
                            Text("Metal Value: ₹${s.metalValue} • GST (3%): ₹${s.gst}")
                            Text("Total Paid: ₹${s.total}", fontWeight = FontWeight.Black, color = Color(0xFFF5C96A))
                        }
                    }
                }
            }
        }
    }
}
