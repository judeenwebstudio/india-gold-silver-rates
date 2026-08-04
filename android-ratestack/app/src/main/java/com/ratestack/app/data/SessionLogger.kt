package com.ratestack.app.data

import android.util.Log
import com.ratestack.app.BuildConfig
import com.ratestack.app.ui.schemes.SessionState

object SessionLogger {
    fun logSessionMutation(
        action: String,
        callerClass: String,
        callerMethod: String,
        currentTokenLength: Int,
        currentSessionState: SessionState,
        reason: String,
        httpStatus: Int? = null,
    ) {
        if (!BuildConfig.DEBUG) return
        val stackTrace = Throwable().stackTraceToString()
        val threadName = Thread.currentThread().name
        val timestamp = System.currentTimeMillis()

        Log.d("RateStackSession", "==================================================")
        Log.d("RateStackSession", "[SESSION MUTATION TRACE] Action: $action")
        Log.d("RateStackSession", "Caller Class: $callerClass | Method: $callerMethod")
        Log.d("RateStackSession", "Thread: $threadName | Timestamp: $timestamp")
        Log.d("RateStackSession", "Current Token Length: $currentTokenLength | SessionState: $currentSessionState")
        Log.d("RateStackSession", "Reason: $reason | HTTP Status: ${httpStatus ?: "N/A"}")
        Log.d("RateStackSession", "Stack Trace:\n$stackTrace")
        Log.d("RateStackSession", "==================================================")
    }
}
