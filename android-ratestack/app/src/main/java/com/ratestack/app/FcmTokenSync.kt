package com.ratestack.app

import android.content.Context
import android.os.Build
import com.google.firebase.messaging.FirebaseMessaging
import com.ratestack.app.data.ApiProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

internal object FcmTokenSync {
    private fun authToken(context: Context) = context
        .getSharedPreferences("ratestack_scheme_prefs", Context.MODE_PRIVATE)
        .getString("scheme_user_token", null)

    fun refresh(context: Context) {
        if (!BuildConfig.FIREBASE_CONFIGURED) return
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token -> register(context, token) }
    }

    fun register(context: Context, fcmToken: String) {
        val auth = authToken(context) ?: return
        CoroutineScope(Dispatchers.IO).launch {
            runCatching {
                ApiProvider.service.registerPushDevice(
                    "Bearer $auth",
                    mapOf(
                        "token" to fcmToken,
                        "platform" to "ANDROID",
                        "deviceName" to "${Build.MANUFACTURER} ${Build.MODEL}".take(100),
                        "appVersion" to BuildConfig.VERSION_NAME,
                    ),
                )
            }
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
                onComplete()
            }
        }
    }
}
