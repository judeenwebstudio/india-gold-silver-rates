package com.ratestack.app

import android.app.Application
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.crashlytics.FirebaseCrashlytics

import android.content.Context
import com.ratestack.app.data.ApiProvider
import com.ratestack.app.data.SessionRepository

class RateStackApplication : Application() {
    lateinit var sessionRepository: SessionRepository
        private set

    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.DEBUG) {
            Log.d("RateStackStartup", "1. Application process started: RateStackApplication.onCreate()")
        }

        sessionRepository = SessionRepository(this)
        ApiProvider.setTokenProvider { sessionRepository.currentToken }

        runCatching {
            NotificationHelper.createChannels(this)
        }.onFailure { e ->
            if (BuildConfig.DEBUG) Log.w("RateStackStartup", "Notification channel creation non-fatal error: ${e.message}")
        }

        if (BuildConfig.FIREBASE_CONFIGURED) {
            runCatching {
                if (FirebaseApp.getApps(this).isNotEmpty()) {
                    FirebaseCrashlytics.getInstance().setCrashlyticsCollectionEnabled(!BuildConfig.DEBUG)
                }
            }.onFailure { e ->
                if (BuildConfig.DEBUG) Log.w("RateStackStartup", "Firebase Crashlytics non-fatal init error: ${e.message}")
            }
        }
    }
}

val Context.sessionRepository: SessionRepository
    get() = (applicationContext as RateStackApplication).sessionRepository
