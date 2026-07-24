package com.ratestack.app

import android.content.Context
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
    private val snackbarHost: View,
) {
    private val appUpdateManager: AppUpdateManager = AppUpdateManagerFactory.create(activity)
    private val preferences = activity.getSharedPreferences(
        PREFERENCES_NAME,
        Context.MODE_PRIVATE,
    )
    private var updateReadySnackbar: Snackbar? = null

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
        appUpdateManager.registerListener(installStateListener)
        appUpdateManager.appUpdateInfo.addOnSuccessListener(activity) { updateInfo ->
            val isAvailable =
                updateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
            val isFlexibleAllowed = updateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)
            val availableVersion = updateInfo.availableVersionCode()
            val alreadyPromptedVersion = preferences.getInt(KEY_LAST_PROMPTED_VERSION, 0)

            if (
                isAvailable &&
                isFlexibleAllowed &&
                availableVersion != alreadyPromptedVersion
            ) {
                val started = runCatching {
                    appUpdateManager.startUpdateFlowForResult(
                        updateInfo,
                        updateFlowLauncher,
                        AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(),
                    )
                }.getOrDefault(false)
                if (started) {
                    preferences.edit { putInt(KEY_LAST_PROMPTED_VERSION, availableVersion) }
                }
            }
        }
    }

    fun onResume() {
        appUpdateManager.appUpdateInfo.addOnSuccessListener(activity) { updateInfo ->
            if (updateInfo.installStatus() == InstallStatus.DOWNLOADED) {
                showCompleteUpdatePrompt()
            }
        }
    }

    fun destroy() {
        updateReadySnackbar?.dismiss()
        updateReadySnackbar = null
        appUpdateManager.unregisterListener(installStateListener)
    }

    private fun showCompleteUpdatePrompt() {
        if (updateReadySnackbar?.isShown == true) {
            return
        }

        updateReadySnackbar = Snackbar.make(
            snackbarHost,
            R.string.update_downloaded,
            Snackbar.LENGTH_INDEFINITE,
        ).setAction(R.string.restart_to_update) {
            appUpdateManager.completeUpdate()
        }.also { it.show() }
    }

    private companion object {
        const val PREFERENCES_NAME = "ratestack_updates"
        const val KEY_LAST_PROMPTED_VERSION = "last_prompted_version"
    }
}
