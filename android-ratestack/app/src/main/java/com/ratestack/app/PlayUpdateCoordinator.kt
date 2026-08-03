package com.ratestack.app

import android.content.Context
import android.util.Log
import android.view.View
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.edit
import com.google.android.material.snackbar.Snackbar
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability

internal class PlayUpdateCoordinator(
    private val activity: ComponentActivity,
) {
    private val appUpdateManager: AppUpdateManager? by lazy {
        runCatching { AppUpdateManagerFactory.create(activity) }.getOrNull()
    }
    private val preferences = activity.getSharedPreferences(
        PREFERENCES_NAME,
        Context.MODE_PRIVATE,
    )
    private var updateReadySnackbar: Snackbar? = null

    // Register ActivityResultLauncher during field initialization (before Activity STARTED)
    private val updateFlowLauncher = activity.registerForActivityResult(
        ActivityResultContracts.StartIntentSenderForResult(),
    ) {
        // Cancellation and Play errors are non-blocking. Users can continue to
        // use RateStack and can always update later from the Play Store.
    }

    private val installStateListener = InstallStateUpdatedListener { state ->
        if (state.installStatus() == InstallStatus.DOWNLOADED) {
            showCompleteUpdatePrompt()
        }
    }

    fun start() {
        val manager = appUpdateManager ?: return
        runCatching {
            manager.registerListener(installStateListener)
            manager.appUpdateInfo.addOnSuccessListener { info ->
                if (info.installStatus() == InstallStatus.DOWNLOADED) {
                    showCompleteUpdatePrompt()
                    return@addOnSuccessListener
                }

                val available = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                val allowed = info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)
                if (!available || !allowed) return@addOnSuccessListener

                val lastPromptedVersion = preferences.getInt(KEY_LAST_PROMPTED_VERSION, -1)
                val currentVersion = info.availableVersionCode()
                if (lastPromptedVersion >= currentVersion) return@addOnSuccessListener

                preferences.edit { putInt(KEY_LAST_PROMPTED_VERSION, currentVersion) }
                runCatching {
                    manager.startUpdateFlowForResult(
                        info,
                        updateFlowLauncher,
                        AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(),
                    )
                }
            }
        }.onFailure { e ->
            if (BuildConfig.DEBUG) Log.w("RateStackStartup", "PlayUpdateCoordinator non-fatal error: ${e.message}")
        }
    }

    fun onResume() {
        val manager = appUpdateManager ?: return
        runCatching {
            manager.appUpdateInfo.addOnSuccessListener { info ->
                if (info.installStatus() == InstallStatus.DOWNLOADED) {
                    showCompleteUpdatePrompt()
                }
            }
        }
    }

    fun destroy() {
        val manager = appUpdateManager ?: return
        runCatching { manager.unregisterListener(installStateListener) }
    }

    private fun showCompleteUpdatePrompt() {
        if (updateReadySnackbar?.isShown == true) return
        val contentView = activity.findViewById<View>(android.R.id.content) ?: return
        updateReadySnackbar = Snackbar.make(
            contentView,
            "An update for RateStack was downloaded and is ready to install.",
            Snackbar.LENGTH_INDEFINITE,
        ).apply {
            setAction("RESTART") {
                runCatching { appUpdateManager?.completeUpdate() }
            }
            show()
        }
    }

    private companion object {
        const val PREFERENCES_NAME = "ratestack_in_app_update_prefs"
        const val KEY_LAST_PROMPTED_VERSION = "last_prompted_update_version"
    }
}
