package com.ratestack.app

import android.content.Context
import android.os.Build
import com.google.firebase.messaging.FirebaseMessaging
import com.ratestack.app.data.ApiProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean

internal object FcmTokenSync {
    private val syncInProgress = AtomicBoolean(false)
    @Volatile private var lastRegisteredKey: String? = null
    @Volatile private var status = if (BuildConfig.FIREBASE_CONFIGURED) "Waiting for sign-in" else "Not configured"
    fun statusLabel(): String = status

    private fun authToken(context: Context) = context
        .getSharedPreferences("ratestack_scheme_prefs", Context.MODE_PRIVATE)
        .getString("scheme_user_token", null)

    fun refresh(context: Context) {
        if (!BuildConfig.FIREBASE_CONFIGURED) return
        status = "Syncing"
        if (!syncInProgress.compareAndSet(false, true)) return
        FirebaseMessaging.getInstance().token
            .addOnSuccessListener { token -> registerClaimed(context, token) }
            .addOnFailureListener { status = "Token unavailable"; syncInProgress.set(false) }
    }

    fun register(context: Context, fcmToken: String) {
        if (!BuildConfig.FIREBASE_CONFIGURED || !syncInProgress.compareAndSet(false, true)) return
        registerClaimed(context, fcmToken)
    }

    private fun registerClaimed(context: Context, fcmToken: String) {
        val auth = authToken(context) ?: run {
            status = "Waiting for sign-in"
            syncInProgress.set(false)
            return
        }
        val registrationKey = "${auth.hashCode()}:${fcmToken.hashCode()}"
        if (registrationKey == lastRegisteredKey) {
            syncInProgress.set(false)
            return
        }
        CoroutineScope(Dispatchers.IO).launch {
            val registered = runCatching {
                ApiProvider.service.registerPushDevice(
                    "Bearer $auth",
                    mapOf(
                        "token" to fcmToken,
                        "platform" to "ANDROID",
                        "deviceName" to "${Build.MANUFACTURER} ${Build.MODEL}".take(100),
                        "appVersion" to BuildConfig.VERSION_NAME,
                    ),
                )
            }.getOrNull()?.let { it.isSuccessful && it.body()?.success == true } == true
            if (registered) {
                lastRegisteredKey = registrationKey
                status = "Registered"
            } else status = "Registration retry pending"
            syncInProgress.set(false)
        }
    }

    fun revoke(context: Context, onComplete: () -> Unit) {
        val auth = authToken(context)
        if (!BuildConfig.FIREBASE_CONFIGURED || auth == null) {
            onComplete()
            return
        }
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            val token = task.result
            if (token.isNullOrBlank()) onComplete() else CoroutineScope(Dispatchers.IO).launch {
                runCatching { ApiProvider.service.revokePushDevice("Bearer $auth", mapOf("token" to token)) }
                lastRegisteredKey = null
                status = "Signed out"
                onComplete()
            }
        }
    }
}
