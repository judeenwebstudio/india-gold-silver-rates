package com.ratestack.app

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.crashlytics.FirebaseCrashlytics

class RateStackApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        NotificationHelper.createChannels(this)

        if (BuildConfig.FIREBASE_CONFIGURED && FirebaseApp.getApps(this).isNotEmpty()) {
            FirebaseCrashlytics.getInstance()
                .setCrashlyticsCollectionEnabled(!BuildConfig.DEBUG)
        }
    }
}
