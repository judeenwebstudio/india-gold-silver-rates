package com.ratestack.app

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.annotation.OptIn
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.core.net.toUri
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.google.android.material.snackbar.Snackbar
import com.razorpay.Checkout
import com.razorpay.PaymentData
import com.razorpay.PaymentResultWithDataListener
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicBoolean

class MainActivity : ComponentActivity(), PaymentResultWithDataListener {

    private var razorpaySuccess: ((String, String) -> Unit)? = null
    private var razorpayError: ((String?) -> Unit)? = null

    private var exoPlayer: ExoPlayer? = null
    private var playerView: PlayerView? = null
    private val appMountedGate = AtomicBoolean(false)
    private var transitionCount = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_RateStack)
        super.onCreate(savedInstanceState)

        val isColdStart = savedInstanceState == null
        val shouldPlaySplash = isColdStart && BuildConfig.ENABLE_VIDEO_SPLASH

        if (BuildConfig.DEBUG) {
            Log.d("RateStackSplash", "Cold-start eligibility: isColdStart=$isColdStart, ENABLE_VIDEO_SPLASH=${BuildConfig.ENABLE_VIDEO_SPLASH}")
        }

        if (shouldPlaySplash) {
            setupFullWindow()
            startVideoSplash()
        } else {
            showAppContentOnce("Direct launch without video splash (flag=${BuildConfig.ENABLE_VIDEO_SPLASH})")
        }
    }

    private fun setupFullWindow() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        windowInsetsController.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())
    }

    private fun restoreSystemBars() {
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        windowInsetsController.show(WindowInsetsCompat.Type.systemBars())
    }

    @OptIn(UnstableApi::class)
    private fun startVideoSplash() {
        try {
            val videoUri = Uri.parse("android.resource://$packageName/${R.raw.ratestack_splash}")
            if (BuildConfig.DEBUG) {
                Log.d("RateStackSplash", "Video resource resolved: $videoUri")
            }

            val player = ExoPlayer.Builder(this).build().apply {
                setMediaItem(MediaItem.fromUri(videoUri))
                volume = 0f // Muted
                repeatMode = Player.REPEAT_MODE_OFF
            }
            exoPlayer = player
            if (BuildConfig.DEBUG) Log.d("RateStackSplash", "Player created")

            val pView = PlayerView(this).apply {
                useController = false
                resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                setBackgroundColor(android.graphics.Color.parseColor("#1C1917"))
                this.player = player
            }
            playerView = pView

            val rootLayout = FrameLayout(this).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
                setBackgroundColor(android.graphics.Color.parseColor("#1C1917"))
                addView(pView, FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT,
                ))
            }
            setContentView(rootLayout)

            player.addListener(object : Player.Listener {
                override fun onRenderedFirstFrame() {
                    if (BuildConfig.DEBUG) Log.d("RateStackSplash", "First frame rendered")
                }

                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    if (isPlaying && BuildConfig.DEBUG) Log.d("RateStackSplash", "Playback started")
                }

                override fun onPlaybackStateChanged(playbackState: Int) {
                    if (playbackState == Player.STATE_ENDED) {
                        if (BuildConfig.DEBUG) Log.d("RateStackSplash", "Playback completed naturally")
                        showAppContentOnce("Playback completed naturally")
                    }
                }

                override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                    if (BuildConfig.DEBUG) Log.w("RateStackSplash", "Player error: ${error.message}")
                    showAppContentOnce("Player error fallback: ${error.message}")
                }
            })

            player.prepare()
            if (BuildConfig.DEBUG) Log.d("RateStackSplash", "Media prepared")
            player.play()

            // 5.5-second total fallback timeout (video is 4.0s)
            pView.postDelayed({
                if (!appMountedGate.get()) {
                    if (BuildConfig.DEBUG) Log.d("RateStackSplash", "Fallback timeout triggered")
                    showAppContentOnce("Timeout fallback triggered")
                }
            }, 5500)

        } catch (e: Exception) {
            if (BuildConfig.DEBUG) Log.w("RateStackSplash", "Exception during splash init: ${e.message}")
            showAppContentOnce("Exception fallback: ${e.message}")
        }
    }

    private fun showAppContentOnce(reason: String) {
        if (!appMountedGate.compareAndSet(false, true)) {
            return
        }
        transitionCount++
        if (BuildConfig.DEBUG) {
            Log.d("RateStackSplash", "Transition #$transitionCount triggered | Reason: $reason")
        }

        releasePlayerSafely()
        restoreSystemBars()

        setContent {
            RateStackTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF1C1917),
                ) {
                    RateStackApp(
                        initialUrl = intent?.dataString,
                        onOpenExternal = { openExternalUri(it.toUri()) },
                        onShare = ::shareText,
                        onRateApp = ::openStoreListing,
                    )
                }
            }
        }
        if (BuildConfig.DEBUG) Log.d("RateStackSplash", "App content mounted (RateStackApp)")
    }

    private fun releasePlayerSafely() {
        try {
            playerView?.player = null
            playerView = null
            exoPlayer?.stop()
            exoPlayer?.clearMediaItems()
            exoPlayer?.release()
            exoPlayer = null
            if (BuildConfig.DEBUG) Log.d("RateStackSplash", "Player detached and released safely")
        } catch (e: Exception) {
            if (BuildConfig.DEBUG) Log.w("RateStackSplash", "Error releasing player: ${e.message}")
        }
    }

    override fun onStop() {
        super.onStop()
        if (!appMountedGate.get()) {
            showAppContentOnce("Activity stopped during splash")
        }
    }

    override fun onDestroy() {
        releasePlayerSafely()
        super.onDestroy()
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
            openExternalUri("https://www.ratestack.in/privacy-policy".toUri())
        }
    }
}
