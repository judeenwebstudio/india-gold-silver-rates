package com.ratestack.app

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import androidx.core.view.WindowCompat
import com.google.android.material.snackbar.Snackbar
import com.razorpay.Checkout
import com.razorpay.PaymentData
import com.razorpay.PaymentResultWithDataListener
import kotlinx.coroutines.delay
import org.json.JSONObject

class MainActivity : ComponentActivity(), PaymentResultWithDataListener {

    private var razorpaySuccess: ((String, String) -> Unit)? = null
    private var razorpayError: ((String?) -> Unit)? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_RateStack)
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        val isColdStart = savedInstanceState == null

        setContent {
            var showSplash by remember { mutableStateOf(isColdStart) }

            RateStackTheme {
                if (showSplash) {
                    PremiumStaticSplashScreen(
                        onSplashFinished = {
                            showSplash = false
                        },
                    )
                } else {
                    RateStackApp(
                        initialUrl = intent?.dataString,
                        onOpenExternal = { openExternalUri(it.toUri()) },
                        onShare = ::shareText,
                        onRateApp = ::openStoreListing,
                    )
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
                put("theme.color", "#E2AD3D")
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

@Composable
fun PremiumStaticSplashScreen(onSplashFinished: () -> Unit) {
    var startAnimation by remember { mutableStateOf(false) }
    val alphaAnim by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(durationMillis = 300, easing = LinearOutSlowInEasing),
        label = "splashAlpha",
    )
    val scaleAnim by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0.92f,
        animationSpec = tween(durationMillis = 450, easing = FastOutSlowInEasing),
        label = "splashScale",
    )

    LaunchedEffect(Unit) {
        startAnimation = true
        delay(1800L)
        onSplashFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFE2AD3D)),
        contentAlignment = Alignment.Center,
    ) {
        Image(
            painter = painterResource(id = R.drawable.ratestack_logo_transparent),
            contentDescription = null,
            modifier = Modifier
                .width(220.dp)
                .graphicsLayer {
                    alpha = alphaAnim
                    scaleX = scaleAnim
                    scaleY = scaleAnim
                },
            contentScale = ContentScale.Fit,
        )
    }
}
