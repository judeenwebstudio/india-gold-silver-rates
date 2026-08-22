package com.ratestack.app

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.net.toUri
import androidx.core.view.WindowCompat
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

        WindowCompat.setDecorFitsSystemWindows(window, false)

        setContent {
            RateStackTheme {
                RateStackApp(
                    initialUrl = intent?.dataString,
                    onOpenExternal = { openExternalUri(it.toUri()) },
                    onShare = ::shareText,
                    onRateApp = ::openStoreListing,
                )
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
                put("theme.color", "#D4AF37")
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
            openExternalUri("https://www.ratestack.in/privacy-policy".toUri())
        }
    }
}

