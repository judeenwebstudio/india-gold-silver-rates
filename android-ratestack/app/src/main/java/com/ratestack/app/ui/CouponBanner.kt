package com.ratestack.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ratestack.app.data.ApiProvider
import com.ratestack.app.data.CouponDto
import kotlinx.coroutines.delay

@Composable
fun CouponBanner() {
    var coupons by remember { mutableStateOf<List<CouponDto>>(emptyList()) }
    var index by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) {
        coupons = runCatching { ApiProvider.service.getActiveCoupons().body()?.data.orEmpty() }.getOrDefault(emptyList())
        while (true) { delay(4_000); if (coupons.isNotEmpty()) index = (index + 1) % coupons.size }
    }
    coupons.getOrNull(index)?.let { coupon ->
        Text(
            text = "${coupon.icon ?: "🎉"} ${coupon.message ?: coupon.description ?: "Use ${coupon.code} for a special offer"}",
            modifier = Modifier.fillMaxWidth().background(Color(0xFF1C1917)).padding(horizontal = 16.dp, vertical = 11.dp),
            color = Color(0xFFFFE8A3),
            fontWeight = FontWeight.SemiBold,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}
