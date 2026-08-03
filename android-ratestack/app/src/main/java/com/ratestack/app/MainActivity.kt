package com.ratestack.app

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import com.google.android.material.snackbar.Snackbar
import com.razorpay.Checkout
import com.razorpay.PaymentData
import com.razorpay.PaymentResultWithDataListener
import org.json.JSONObject

class MainActivity : ComponentActivity(), PaymentResultWithDataListener {

    private var razorpaySuccess: ((String, String) -> Unit)? = null
    private var razorpayError: ((String?) -> Unit)? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_RateStack)
        super.onCreate(savedInstanceState)

        setContent {
            var showFullApp by remember { mutableStateOf(false) }
            RateStackTheme {
                if (showFullApp) {
                    RateStackApp(
                        initialUrl = intent?.dataString,
                        onOpenExternal = { openExternalUri(it.toUri()) },
                        onShare = ::shareText,
                        onRateApp = ::openStoreListing,
                    )
                } else {
                    MinimalHomeScreen(onContinue = { showFullApp = true })
                }
            }
        }
    }

    fun startPhonePePaymentSheet(
        redirectUrl: String,
        merchantTransactionId: String,
        onSuccess: (transactionId: String) -> Unit,
        onError: (description: String?) -> Unit,
    ) {
        try {
            if (redirectUrl.isNotBlank() && redirectUrl.startsWith("https://")) {
                val intent = Intent(Intent.ACTION_VIEW, redirectUrl.toUri())
                startActivity(intent)
            } else {
                onError("PhonePe checkout URL is unavailable.")
                return
            }
            onSuccess(merchantTransactionId)
        } catch (e: Exception) {
            onError(e.message ?: "Unable to launch PhonePe checkout.")
        }
    }

    fun startRazorpayCheckout(
        keyId: String,
        gatewayOrderId: String,
        amountPaise: Long,
        onSuccess: (paymentId: String, signature: String) -> Unit,
        onError: (description: String?) -> Unit,
    ) {
        razorpaySuccess = onSuccess
        razorpayError = onError
        try {
            Checkout.preload(applicationContext)
            Checkout().apply { setKeyID(keyId) }.open(this, JSONObject().apply {
                put("name", "RateStack")
                put("description", "Direct coin purchase")
                put("currency", "INR")
                put("amount", amountPaise)
                put("order_id", gatewayOrderId)
                put("theme.color", "#F59E0B")
            })
        } catch (e: Exception) {
            razorpayError?.invoke(e.message)
        }
    }

    override fun onPaymentSuccess(paymentId: String?, paymentData: PaymentData?) {
        val id = paymentData?.paymentId ?: paymentId.orEmpty()
        val signature = paymentData?.signature.orEmpty()
        if (id.isBlank() || signature.isBlank()) razorpayError?.invoke("Razorpay verification data is missing.")
        else razorpaySuccess?.invoke(id, signature)
        razorpaySuccess = null
        razorpayError = null
    }

    override fun onPaymentError(code: Int, response: String?, paymentData: PaymentData?) {
        razorpayError?.invoke(response ?: "Payment failed.")
        razorpaySuccess = null
        razorpayError = null
    }

    private fun openExternalUri(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE))
        } catch (_: ActivityNotFoundException) {
            Snackbar.make(findViewById(android.R.id.content), getString(R.string.no_app_for_link), Snackbar.LENGTH_LONG).show()
        }
    }

    private fun shareText(text: String) {
        startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, text) }, getString(R.string.share_with)))
    }

    private fun openStoreListing() {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, "market://details?id=$packageName".toUri()))
        } catch (_: ActivityNotFoundException) {
            openExternalUri("https://play.google.com/store/apps/details?id=$packageName".toUri())
        }
    }
}

@Composable
fun MinimalHomeScreen(onContinue: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF1C1917),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "RateStack",
                style = MaterialTheme.typography.headlineLarge,
                color = Color(0xFFF5C96A),
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "App started successfully",
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White,
            )
            Spacer(modifier = Modifier.height(24.dp))
            Button(
                onClick = onContinue,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE2AD3D)),
            ) {
                Text("Continue to App", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        }
    }
}
