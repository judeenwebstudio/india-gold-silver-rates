package com.ratestack.app

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
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
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
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

class MainActivity : ComponentActivity(), PaymentResultWithDataListener {
    private var incomingUrl by mutableStateOf<String?>(null)
    private var notificationPermissionChecked = false
    private var successfulSessionRecorded = false
    private lateinit var playUpdateCoordinator: PlayUpdateCoordinator
    private var razorpaySuccess: ((String, String) -> Unit)? = null
    private var razorpayError: ((String?) -> Unit)? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private val splashGate by lazy { SplashPlaybackGate(::showAppContent) }
    private var splashPlayer: ExoPlayer? = null
    private var splashTimeout: Runnable? = null
    private var systemSplashRemover: (() -> Unit)? = null
    private var splashFirstFrameRendered = false
    private var splashPlaybackStarted = false
    private var appContentStarted = false

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_RateStack)
        super.onCreate(savedInstanceState)
        window.setBackgroundDrawableResource(R.color.splash_background)
        enableEdgeToEdge()
        incomingUrl = resolveIncomingUrl(intent)
        debugSplash("SplashActivity created (MainActivity launcher path)")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            splashScreen.setOnExitAnimationListener { splashView ->
                systemSplashRemover = { splashView.remove() }
                debugSplash("Android 12 system splash exit requested")
                if (splashFirstFrameRendered || appContentStarted) splashView.remove()
            }
        }
        if (savedInstanceState?.getBoolean(STATE_APP_CONTENT_STARTED) == true) showAppContent() else showSplashVideo()
    }

    @androidx.annotation.OptIn(markerClass = [UnstableApi::class])
    private fun showSplashVideo() {
        val videoUri = "android.resource://$packageName/${R.raw.ratestack_splash}".toUri()
        debugSplash("Video resource resolved: ${R.raw.ratestack_splash}")
        val playerView = PlayerView(this).apply {
            useController = false
            resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
            setShutterBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.splash_background))
            setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.splash_background))
        }
        setContentView(playerView)
        debugSplash("setContentView displayed Media3 PlayerView")
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }

        splashPlayer = ExoPlayer.Builder(this).build().also { player ->
            player.volume = 0f
            player.repeatMode = Player.REPEAT_MODE_OFF
            player.addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(playbackState: Int) {
                    when (playbackState) {
                        Player.STATE_READY -> {
                            splashPlaybackStarted = true
                            debugSplash("onPrepared / STATE_READY")
                            player.play()
                            debugSplash("start() / play() called")
                        }
                        Player.STATE_ENDED -> {
                            debugSplash("onCompletion / STATE_ENDED")
                            if (splashFirstFrameRendered) splashGate.finish()
                            else debugSplash("completion ignored because no video frame rendered")
                        }
                        Player.STATE_BUFFERING, Player.STATE_IDLE -> Unit
                    }
                }

                override fun onRenderedFirstFrame() {
                    splashFirstFrameRendered = true
                    debugSplash("first frame rendered")
                    systemSplashRemover?.invoke()
                    systemSplashRemover = null
                }

                override fun onPlayerError(error: PlaybackException) {
                    debugSplash("playback error: ${error.errorCodeName}")
                    splashGate.finish()
                }
            })
            playerView.player = player
            player.setMediaItem(MediaItem.fromUri(videoUri))
            debugSplash("setMediaItem called: bundled raw MP4")
            player.prepare()
            player.playWhenReady = true
        }
        armSplashTimeout()
    }

    private fun armSplashTimeout() {
        splashTimeout?.let(mainHandler::removeCallbacks)
        splashTimeout = Runnable {
            debugSplash("timeout fired; started=$splashPlaybackStarted firstFrame=$splashFirstFrameRendered")
            splashGate.finish()
        }.also { mainHandler.postDelayed(it, SPLASH_TIMEOUT_MS) }
    }

    private fun showAppContent() {
        if (appContentStarted) return
        appContentStarted = true
        debugSplash("navigation executed: existing app content started")
        splashTimeout?.let(mainHandler::removeCallbacks)
        splashTimeout = null
        systemSplashRemover?.invoke()
        systemSplashRemover = null
        splashPlayer?.release()
        splashPlayer = null
        WindowInsetsControllerCompat(window, window.decorView).show(WindowInsetsCompat.Type.systemBars())
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
        FcmTokenSync.refresh(this)
    }

    override fun onStart() {
        super.onStart()
        if (!appContentStarted && splashPlayer != null) {
            splashPlayer?.play()
            armSplashTimeout()
            debugSplash("activity resumed splash playback")
        }
    }

    override fun onStop() {
        if (!appContentStarted) {
            splashPlayer?.pause()
            splashTimeout?.let(mainHandler::removeCallbacks)
            debugSplash("activity paused splash playback")
        }
        super.onStop()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putBoolean(STATE_APP_CONTENT_STARTED, appContentStarted)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        splashTimeout?.let(mainHandler::removeCallbacks)
        splashPlayer?.release()
        splashPlayer = null
        if (::playUpdateCoordinator.isInitialized) playUpdateCoordinator.destroy()
        super.onDestroy()
    }

    private fun resolveIncomingUrl(intent: Intent?): String? {
        val router = NotificationLinkRouter(UrlPolicy(BuildConfig.TRUSTED_HOST))
        val destination = intent?.getStringExtra(NotificationHelper.DATA_KEY_DESTINATION)
        val orderId = intent?.getStringExtra(NotificationHelper.DATA_KEY_ORDER_ID)
        val tracking = intent?.getStringExtra(NotificationHelper.DATA_KEY_TRACKING)
        val metal = intent?.getStringExtra(NotificationHelper.DATA_KEY_METAL)
        val dataRoute = if (destination != null || orderId != null || tracking != null || metal != null) {
            router.routeData(destination, orderId, tracking, metal)
        } else null
        val raw = intent?.dataString
            ?: intent?.getStringExtra(NotificationHelper.EXTRA_NOTIFICATION_URL)
            ?: dataRoute
        if (raw.isNullOrBlank()) return null
        return when (router.resolve(raw)) {
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

    private fun debugSplash(message: String) {
        if (BuildConfig.DEBUG) Log.d(SPLASH_LOG_TAG, message)
    }

    private companion object {
        const val SPLASH_TIMEOUT_MS = 6_500L
        const val SPLASH_LOG_TAG = "RateStackSplash"
        const val STATE_APP_CONTENT_STARTED = "app_content_started"
    }
}
