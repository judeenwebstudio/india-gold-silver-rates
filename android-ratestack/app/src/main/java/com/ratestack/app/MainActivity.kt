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
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.addCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.net.toUri
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

    init {
        if (BuildConfig.DEBUG) {
            Log.d("RateStackStartup", "2. MainActivity class loaded")
        }
    }

    private var incomingUrl: String? = null
    private var notificationPermissionChecked = false
    private var successfulSessionRecorded = false

    // Registered during Activity field initialization (before STARTED)
    private val playUpdateCoordinator = PlayUpdateCoordinator(this)

    private var razorpaySuccess: ((String, String) -> Unit)? = null
    private var razorpayError: ((String?) -> Unit)? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var splashPlayer: ExoPlayer? = null
    private var splashPlayerView: PlayerView? = null
    private var splashTimeout: Runnable? = null
    private var systemSplashRemover: (() -> Unit)? = null
    private var splashFirstFrameRendered = false
    private var appContentStarted = false

    val splashStateMachine = SplashStateMachine { showAppContent() }

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        if (BuildConfig.DEBUG) {
            Log.d("RateStackStartup", "3. MainActivity.onCreate entered")
        }
        setTheme(R.style.Theme_RateStack)
        if (BuildConfig.DEBUG) {
            Log.d("RateStackStartup", "4. theme applied")
            Log.d("RateStackStartup", "5. installSplashScreen completed")
        }
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.setBackgroundDrawableResource(R.color.splash_background)
        enableEdgeToEdge()
        incomingUrl = resolveIncomingUrl(intent)
        if (BuildConfig.DEBUG) {
            Log.d("RateStackStartup", "6. original Intent captured: ${incomingUrl ?: "none"}")
            Log.d("RateStackStartup", "7. ENABLE_VIDEO_SPLASH value: ${BuildConfig.ENABLE_VIDEO_SPLASH}")
        }
        debugSplash("SplashActivity created (MainActivity launcher path)")

        // Prevent back press during splash from finishing activity
        onBackPressedDispatcher.addCallback(this) {
            if (!appContentStarted) {
                debugSplash("Back press intercepted during splash: advancing to app content")
                splashStateMachine.onTimeout()
            } else {
                remove()
                onBackPressedDispatcher.onBackPressed()
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            splashScreen.setOnExitAnimationListener { splashView ->
                systemSplashRemover = { runCatching { splashView.remove() } }
                debugSplash("Android 12 system splash exit requested")
                if (splashFirstFrameRendered || appContentStarted) {
                    runCatching { splashView.remove() }
                }
            }
        }

        if (BuildConfig.ENABLE_MINIMAL_STARTUP) {
            if (BuildConfig.DEBUG) {
                Log.d("RateStackStartup", "ENABLE_MINIMAL_STARTUP is true: rendering diagnostic screen")
            }
            setContent {
                MinimalDiagnosticScreen(onContinue = { showAppContent() })
            }
            return
        }

        if (!BuildConfig.ENABLE_VIDEO_SPLASH || savedInstanceState?.getBoolean(STATE_APP_CONTENT_STARTED) == true) {
            if (BuildConfig.DEBUG) {
                Log.d("RateStackStartup", "8. direct Compose startup selected")
            }
            debugSplash("Direct Compose startup path selected (ENABLE_VIDEO_SPLASH=false)")
            showAppContent()
        } else {
            showSplashVideo()
        }
    }

    @androidx.annotation.OptIn(markerClass = [UnstableApi::class])
    private fun showSplashVideo() {
        try {
            val videoUri = "android.resource://$packageName/${R.raw.ratestack_splash}".toUri()
            debugSplash("Video resource resolved: ${R.raw.ratestack_splash}")

            val playerView = PlayerView(this).apply {
                useController = false
                resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                setShutterBackgroundColor(android.graphics.Color.BLACK)
                setBackgroundColor(android.graphics.Color.BLACK)
                layoutParams = FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
            }
            splashPlayerView = playerView
            setContentView(playerView)
            debugSplash("setContentView displayed Media3 PlayerView (Edge-to-edge, RESIZE_MODE_ZOOM)")

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
                                splashStateMachine.onReady()
                                debugSplash("onPrepared / STATE_READY")
                                player.play()
                                debugSplash("start() / play() called")
                            }
                            Player.STATE_ENDED -> {
                                debugSplash("onCompletion / STATE_ENDED")
                                splashStateMachine.onPlaybackEnded(splashFirstFrameRendered)
                            }
                            Player.STATE_BUFFERING, Player.STATE_IDLE -> Unit
                        }
                    }

                    override fun onRenderedFirstFrame() {
                        splashFirstFrameRendered = true
                        splashStateMachine.onFirstFrameRendered()
                        debugSplash("first frame rendered")
                        runCatching { systemSplashRemover?.invoke() }
                        systemSplashRemover = null
                    }

                    override fun onPlayerError(error: PlaybackException) {
                        debugSplash("playback error: ${error.errorCodeName}")
                        splashStateMachine.onError(error.errorCodeName ?: "UNKNOWN_ERROR")
                    }
                })
                playerView.player = player
                player.setMediaItem(MediaItem.fromUri(videoUri))
                debugSplash("setMediaItem called: bundled raw MP4")
                player.prepare()
                player.playWhenReady = true
            }
            armSplashTimeout()
        } catch (e: Exception) {
            debugSplash("showSplashVideo exception fallback: ${e.message}")
            splashStateMachine.onError(e.message ?: "SPLASH_SETUP_FAILED")
        }
    }

    private fun armSplashTimeout() {
        splashTimeout?.let(mainHandler::removeCallbacks)
        splashTimeout = Runnable {
            debugSplash("timeout fired; firstFrame=$splashFirstFrameRendered")
            splashStateMachine.onTimeout()
        }.also { mainHandler.postDelayed(it, SPLASH_TIMEOUT_MS) }
    }

    fun showAppContent() {
        if (appContentStarted) return
        appContentStarted = true
        if (BuildConfig.DEBUG) {
            Log.d("RateStackStartup", "9. showAppContent entered")
        }
        debugSplash("navigation executed: existing app content started")

        splashTimeout?.let(mainHandler::removeCallbacks)
        splashTimeout = null

        runCatching { systemSplashRemover?.invoke() }
        systemSplashRemover = null

        runCatching {
            splashPlayerView?.player = null
            splashPlayer?.stop()
            splashPlayer?.release()
        }
        splashPlayer = null
        splashPlayerView = null

        WindowInsetsControllerCompat(window, window.decorView).show(WindowInsetsCompat.Type.systemBars())
        if (BuildConfig.DEBUG) {
            Log.d("RateStackStartup", "10. setContent called")
        }
        setContent {
            RateStackApp(
                initialUrl = incomingUrl,
                onOpenExternal = { openExternalUri(it.toUri()) },
                onShare = ::shareText,
                onRateApp = ::openStoreListing,
            )
        }
        runCatching { playUpdateCoordinator.start() }
        window.decorView.postDelayed({
            if (!isFinishing && !isDestroyed) {
                runCatching { maybeRequestNotificationPermission() }
            }
        }, 1_500)
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
        runCatching { playUpdateCoordinator.onResume() }
        if (!successfulSessionRecorded) {
            successfulSessionRecorded = true
            runCatching {
                val sessions = PlayReviewCoordinator.recordSuccessfulSession(this)
                window.decorView.postDelayed({ PlayReviewCoordinator.requestIfEligible(this, sessions) }, 30_000)
            }
        }
        runCatching { FcmTokenSync.refresh(this) }
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
        runCatching {
            splashPlayerView?.player = null
            splashPlayer?.stop()
            splashPlayer?.release()
        }
        splashPlayer = null
        splashPlayerView = null
        runCatching { playUpdateCoordinator.destroy() }
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
        const val SPLASH_TIMEOUT_MS = 4_500L
        const val SPLASH_LOG_TAG = "RateStackSplash"
        const val STATE_APP_CONTENT_STARTED = "app_content_started"
    }
}

@Composable
private fun MinimalDiagnosticScreen(onContinue: () -> Unit) {
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
                text = "App startup diagnostic mode",
                style = MaterialTheme.typography.bodyMedium,
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
