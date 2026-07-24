package com.ratestack.app

import android.app.Activity
import android.content.Context
import androidx.core.content.edit
import com.google.android.play.core.review.ReviewManagerFactory

internal object PlayReviewCoordinator {
    private const val PREFERENCES_NAME = "ratestack_engagement"
    private const val KEY_SUCCESSFUL_SESSIONS = "successful_sessions"
    private const val KEY_LAST_REVIEW_ATTEMPT_SESSION = "last_review_attempt_session"
    private val policy = ReviewPromptPolicy()

    fun recordSuccessfulSession(context: Context): Int {
        val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        val sessions = preferences.getInt(KEY_SUCCESSFUL_SESSIONS, 0) + 1
        preferences.edit { putInt(KEY_SUCCESSFUL_SESSIONS, sessions) }
        return sessions
    }

    fun requestIfEligible(activity: Activity, successfulSessions: Int) {
        val preferences = activity.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        val lastAttempt = preferences.getInt(KEY_LAST_REVIEW_ATTEMPT_SESSION, 0)
        if (!policy.isEligible(successfulSessions, lastAttempt)) {
            return
        }

        preferences.edit { putInt(KEY_LAST_REVIEW_ATTEMPT_SESSION, successfulSessions) }

        val reviewManager = ReviewManagerFactory.create(activity)
        reviewManager.requestReviewFlow()
            .addOnSuccessListener(activity) { reviewInfo ->
                reviewManager.launchReviewFlow(activity, reviewInfo)
                    .addOnFailureListener { /* Play conditions are non-blocking. */ }
            }
            .addOnFailureListener { /* Play may suppress the dialog; keep using the app. */ }
    }
}
