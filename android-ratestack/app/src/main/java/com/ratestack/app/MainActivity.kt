package com.ratestack.app

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import com.google.android.material.snackbar.Snackbar

import com.razorpay.Checkout
import com.razorpay.PaymentData
import com.razorpay.PaymentResultWithDataListener
import org.json.JSONObject

class MainActivity : ComponentActivity(), PaymentResultWithDataListener {
    private var incomingUrl by mutableStateOf<String?>(null)
    private var notificationPermissionChecked = false
    private var successfulSessionRecorded = false
    private lateinit var playUpdateCoordinator: PlayUpdateCoordinator

    private var activePaymentSuccessCallback: ((paymentId: String, orderId: String, signature: String) -> Unit)? = null
    private var activePaymentCancelledCallback: (() -> Unit)? = null
    private var activePaymentErrorCallback: ((description: String?) -> Unit)? = null

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_RateStack)
        super.onCreate(savedInstanceState)
        Checkout.preload(applicationContext)
        enableEdgeToEdge()
        incomingUrl = resolveIncomingUrl(intent)
        setContent {
            RateStackApp(
                initialUrl = incomingUrl,
                onOpenExternal = { openExternalUri(it.toUri()) },
                onShare = ::shareText,
                onRateApp = ::openStoreListing,
            )
        }
        playUpdateCoordinator = PlayUpdateCoordinator(this, findViewById(android.R.id.content))
        playUpdateCoordinator.start()
        window.decorView.postDelayed({ maybeRequestNotificationPermission() }, 1_500)
    }

    fun startPhonePePaymentSheet(
        redirectUrl: String,
        merchantTransactionId: String,
        onSuccess: (transactionId: String) -> Unit,
        onError: (description: String?) -> Unit,
    ) {
        try {
            if (redirectUrl.isNotBlank() && redirectUrl.startsWith("http")) {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(redirectUrl))
                startActivity(intent)
            }
            onSuccess(merchantTransactionId)
        } catch (e: Exception) {
            onError(e.message ?: "Unable to launch PhonePe checkout.")
        }
    }

    fun startRazorpayPaymentSheet(
        keyId: String,
        razorpayOrderId: String,
        amountInPaise: Long,
        userPhone: String?,
        userEmail: String?,
        onSuccess: (paymentId: String, orderId: String, signature: String) -> Unit,
        onCancelled: () -> Unit,
        onError: (description: String?) -> Unit,
    ) {
        activePaymentSuccessCallback = onSuccess
        activePaymentCancelledCallback = onCancelled
        activePaymentErrorCallback = onError

        val checkout = Checkout()
        checkout.setKeyID(keyId)

        try {
            val options = JSONObject().apply {
                put("name", "RateStack")
                put("description", "Gold & Silver Scheme Installment")
                put("image", "https://india-gold-silver-rates.vercel.app/logo.png")
                put("order_id", razorpayOrderId)
                put("currency", "INR")
                put("amount", amountInPaise)

                val prefill = JSONObject().apply {
                    if (!userPhone.isNullOrEmpty()) put("contact", userPhone)
                    if (!userEmail.isNullOrEmpty()) put("email", userEmail)
                }
                put("prefill", prefill)

                val theme = JSONObject().apply {
                    put("color", "#D97706")
                }
                put("theme", theme)

                val retry = JSONObject().apply {
                    put("enabled", true)
                    put("max_count", 2)
                }
                put("retry", retry)
            }
            checkout.open(this, options)
        } catch (e: Exception) {
            if (BuildConfig.DEBUG) {
                android.util.Log.e("RateStackRazorpay", "Error launching Razorpay checkout: ${e.message}", e)
            }
            onError("Unable to launch payment checkout sheet.")
        }
    }

    override fun onPaymentSuccess(razorpayPaymentId: String?, paymentData: PaymentData?) {
        val paymentId = razorpayPaymentId ?: paymentData?.paymentId ?: ""
        val orderId = paymentData?.orderId ?: ""
        val signature = paymentData?.signature ?: ""

        if (BuildConfig.DEBUG) {
            android.util.Log.d("RateStackRazorpay", "onPaymentSuccess Callback | PaymentId: $paymentId | OrderId: $orderId")
        }

        activePaymentSuccessCallback?.invoke(paymentId, orderId, signature)
        clearPaymentCallbacks()
    }

    override fun onPaymentError(code: Int, description: String?, paymentData: PaymentData?) {
        if (BuildConfig.DEBUG) {
            android.util.Log.d("RateStackRazorpay", "onPaymentError Callback | Code: $code | Desc: $description")
        }

        if (code == Checkout.PAYMENT_CANCELED) {
            activePaymentCancelledCallback?.invoke()
        } else {
            activePaymentErrorCallback?.invoke(description ?: "Payment failed. Please try again.")
        }
        clearPaymentCallbacks()
    }

    private fun clearPaymentCallbacks() {
        activePaymentSuccessCallback = null
        activePaymentCancelledCallback = null
        activePaymentErrorCallback = null
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        incomingUrl = resolveIncomingUrl(intent)
    }

    override fun onResume() {
        super.onResume()
        if (::playUpdateCoordinator.isInitialized) playUpdateCoordinator.onResume()
        if (!successfulSessionRecorded) {
            successfulSessionRecorded = true
            val sessions = PlayReviewCoordinator.recordSuccessfulSession(this)
            window.decorView.postDelayed({ PlayReviewCoordinator.requestIfEligible(this, sessions) }, 30_000)
        }
    }

    override fun onDestroy() {
        if (::playUpdateCoordinator.isInitialized) playUpdateCoordinator.destroy()
        super.onDestroy()
    }

    private fun resolveIncomingUrl(intent: Intent?): String? {
        val raw = intent?.dataString ?: intent?.getStringExtra(NotificationHelper.EXTRA_NOTIFICATION_URL)
        if (raw.isNullOrBlank()) return null
        return when (NotificationLinkRouter(UrlPolicy(BuildConfig.TRUSTED_HOST)).resolve(raw)) {
            NotificationLinkTarget.INTERNAL -> raw
            NotificationLinkTarget.EXTERNAL_HTTPS -> {
                openExternalUri(raw.toUri())
                null
            }
            NotificationLinkTarget.HOME -> null
        }
    }

    private fun maybeRequestNotificationPermission() {
        if (notificationPermissionChecked || !BuildConfig.FIREBASE_CONFIGURED || Build.VERSION.SDK_INT < 33) return
        notificationPermissionChecked = true
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return
        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    private fun openExternalUri(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE))
        } catch (_: ActivityNotFoundException) {
            showMessage(getString(R.string.no_app_for_link))
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

    private fun showMessage(message: String) {
        Snackbar.make(findViewById<View>(android.R.id.content), message, Snackbar.LENGTH_LONG).show()
    }
}
