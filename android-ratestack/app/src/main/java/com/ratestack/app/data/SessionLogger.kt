package com.ratestack.app.data

import android.util.Log
import com.ratestack.app.BuildConfig
import com.ratestack.app.data.SessionState

object SessionLogger {
    private fun callerFrame(): StackTraceElement? = Throwable().stackTrace.firstOrNull {
        !it.className.contains("SessionLogger") && !it.className.startsWith("java.") && !it.className.startsWith("kotlin.")
    }

    fun logLoginRedirect(
        callerClass: String,
        callerMethod: String,
        currentToken: String?,
        currentSessionState: SessionState,
        reason: String,
    ) {
        if (!BuildConfig.DEBUG) return
        val trace = Throwable().stackTraceToString()
        val frame = callerFrame()
        SessionDebugStore.recordLoginRedirect(
            state = currentSessionState,
            token = currentToken,
            reason = reason,
            caller = "$callerClass.$callerMethod",
            file = frame?.fileName ?: "unknown",
            line = frame?.lineNumber ?: -1,
        )
        Log.e("RateStackLoginRedirect", "-----------------------------------------")
        Log.e("RateStackLoginRedirect", "LOGIN REDIRECT DETECTED")
        Log.e("RateStackLoginRedirect", "Caller class: $callerClass")
        Log.e("RateStackLoginRedirect", "Caller method: $callerMethod")
        Log.e("RateStackLoginRedirect", "File: ${frame?.fileName ?: "unknown"}")
        Log.e("RateStackLoginRedirect", "Line: ${frame?.lineNumber ?: -1}")
        Log.e("RateStackLoginRedirect", "Reason: $reason")
        Log.e("RateStackLoginRedirect", "Current SessionState: $currentSessionState")
        Log.e("RateStackLoginRedirect", "Token exists: ${!currentToken.isNullOrBlank()}")
        Log.e("RateStackLoginRedirect", "Token length: ${currentToken?.length ?: 0}")
        Log.e("RateStackLoginRedirect", "Thread: ${Thread.currentThread().name}")
        Log.e("RateStackLoginRedirect", "Stacktrace:\n$trace")
        Log.e("RateStackLoginRedirect", "-----------------------------------------")
    }

    fun logStateChange(oldState: SessionState, newState: SessionState, changedBy: String, token: String?) {
        if (!BuildConfig.DEBUG) return
        SessionDebugStore.recordStateChange(oldState, newState, token)
        Log.d("RateStackSessionState", "OLD STATE: $oldState")
        Log.d("RateStackSessionState", "NEW STATE: $newState")
        Log.d("RateStackSessionState", "WHO CHANGED IT: $changedBy")
        Log.d("RateStackSessionState", "Token exists: ${!token.isNullOrBlank()} | Token length: ${token?.length ?: 0}")
        Log.d("RateStackSessionState", "Thread: ${Thread.currentThread().name}")
        Log.d("RateStackSessionState", "Stacktrace:\n${Throwable().stackTraceToString()}")
    }

    fun logNavigation(previous: String?, current: String?, next: String?, backStack: String) {
        if (!BuildConfig.DEBUG) return
        SessionDebugStore.recordNavigation(previous, current)
        Log.d("RateStackNavigationTrace", "Previous destination: $previous")
        Log.d("RateStackNavigationTrace", "Current destination: $current")
        Log.d("RateStackNavigationTrace", "Next destination: $next")
        Log.d("RateStackNavigationTrace", "Back stack: $backStack")
        Log.d("RateStackNavigationTrace", "Thread: ${Thread.currentThread().name}")
    }

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

    fun recordApiStatus(status: Int, source: String) {
        if (!BuildConfig.DEBUG) return
        SessionDebugStore.recordApiStatus(status, source)
    }
}
