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

class MainActivity : ComponentActivity() {
    private var incomingUrl by mutableStateOf<String?>(null)
    private var notificationPermissionChecked = false
    private var successfulSessionRecorded = false
    private lateinit var playUpdateCoordinator: PlayUpdateCoordinator

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_RateStack)
        super.onCreate(savedInstanceState)
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
            if (redirectUrl.isNotBlank() && redirectUrl.startsWith("https://")) {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(redirectUrl))
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
