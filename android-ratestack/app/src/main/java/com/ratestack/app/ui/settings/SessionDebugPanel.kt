package com.ratestack.app.ui.settings

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ratestack.app.BuildConfig
import com.ratestack.app.data.SessionDebugStore

@Composable
fun SessionDebugPanel() {
    if (!BuildConfig.DEBUG) return

    val context = LocalContext.current
    val debug by SessionDebugStore.snapshot.collectAsState()

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = "Developer Diagnostics",
            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(start = 4.dp),
        )
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                DebugRow("Current SessionState", debug.currentSessionState)
                DebugRow("Previous SessionState", debug.previousSessionState)
                DebugRow("Token exists", if (debug.tokenExists) "Yes" else "No")
                DebugRow("Token length", debug.tokenLength.toString())
                DebugRow("Current route", debug.currentRoute)
                DebugRow("Last route", debug.lastRoute)
                DebugRow("Last redirect reason", debug.lastRedirectReason)
                DebugRow("Last redirect caller", debug.lastRedirectCaller)
                DebugRow(
                    "Last redirect location",
                    "${debug.lastRedirectFile}:${if (debug.lastRedirectLine >= 0) debug.lastRedirectLine else "unknown"}",
                )
                DebugRow("Last API status", debug.lastApiStatus)
                DebugRow(
                    "Last session mutation",
                    debug.copyableReport().substringAfterLast("Last session mutation: "),
                )
                Button(
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    onClick = {
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        clipboard.setPrimaryClip(ClipData.newPlainText("RateStack Session Debug", debug.copyableReport()))
                    },
                ) {
                    Text("Copy Debug Report")
                }
            }
        }
    }
}

@Composable
private fun DebugRow(label: String, value: String) {
    Text(
        text = "$label: $value",
        style = MaterialTheme.typography.bodySmall,
    )
}
