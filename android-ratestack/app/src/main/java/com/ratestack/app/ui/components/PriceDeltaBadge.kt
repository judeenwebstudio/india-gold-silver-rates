package com.ratestack.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.Icon
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
import com.ratestack.app.ui.theme.TrendDown
import com.ratestack.app.ui.theme.TrendDownBackgroundDark
import com.ratestack.app.ui.theme.TrendDownBackgroundLight
import com.ratestack.app.ui.theme.TrendUp
import com.ratestack.app.ui.theme.TrendUpBackgroundDark
import com.ratestack.app.ui.theme.TrendUpBackgroundLight
import java.util.Locale

@Composable
fun PriceDeltaBadge(
    change: Double?,
    percent: Double?,
    modifier: Modifier = Modifier,
) {
    if (change == null && percent == null) return

    val isPositive = (change ?: percent ?: 0.0) >= 0
    val isDark = isSystemInDarkTheme()

    val badgeBgColor = if (isPositive) {
        if (isDark) TrendUpBackgroundDark else TrendUpBackgroundLight
    } else {
        if (isDark) TrendDownBackgroundDark else TrendDownBackgroundLight
    }

    val contentColor = if (isPositive) TrendUp else TrendDown

    val textString = buildString {
        if (isPositive) append("+")
        change?.let { append(formatInr(it)) }
        if (change != null && percent != null) append(" ")
        percent?.let { append(String.format(Locale.US, "(%.2f%%)", it)) }
    }

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = badgeBgColor,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = if (isPositive) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                contentDescription = if (isPositive) "Price up" else "Price down",
                tint = contentColor,
                modifier = Modifier.size(16.dp),
            )
            Spacer(modifier = Modifier.width(2.dp))
            Text(
                text = textString,
                style = MaterialTheme.typography.labelMedium.copy(
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                ),
                color = contentColor,
            )
        }
    }
}
