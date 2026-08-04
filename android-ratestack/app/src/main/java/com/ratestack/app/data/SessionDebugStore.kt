package com.ratestack.app.data

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class SessionDebugSnapshot(
    val currentSessionState: String = "Restoring",
    val previousSessionState: String = "Not recorded",
    val tokenExists: Boolean = false,
    val tokenLength: Int = 0,
    val currentRoute: String = "Not recorded",
    val lastRoute: String = "Not recorded",
    val lastRedirectReason: String = "Not recorded",
    val lastRedirectCaller: String = "Not recorded",
    val lastRedirectFile: String = "Not recorded",
    val lastRedirectLine: Int = -1,
    val lastApiStatus: String = "Not recorded",
    val lastSessionMutationTimestamp: Long? = null,
) {
    fun copyableReport(): String = buildString {
        appendLine("RateStack Session Debug")
        appendLine("Current SessionState: $currentSessionState")
        appendLine("Previous SessionState: $previousSessionState")
        appendLine("Token exists: ${if (tokenExists) "Yes" else "No"}")
        appendLine("Token length: $tokenLength")
        appendLine("Current route: $currentRoute")
        appendLine("Last route: $lastRoute")
        appendLine("Last redirect reason: $lastRedirectReason")
        appendLine("Last redirect caller: $lastRedirectCaller")
        appendLine("Last redirect location: $lastRedirectFile:${if (lastRedirectLine >= 0) lastRedirectLine else "unknown"}")
        appendLine("Last API status: $lastApiStatus")
        append("Last session mutation: ${lastSessionMutationTimestamp.debugTimestamp()}")
    }
}

object SessionDebugStore {
    private val _snapshot = MutableStateFlow(SessionDebugSnapshot())
    val snapshot: StateFlow<SessionDebugSnapshot> = _snapshot.asStateFlow()

    fun recordLoginRedirect(
        state: SessionState,
        token: String?,
        reason: String,
        caller: String,
        file: String,
        line: Int,
    ) {
        _snapshot.update {
            it.copy(
                currentSessionState = state.debugName(),
                tokenExists = !token.isNullOrBlank(),
                tokenLength = token?.length ?: 0,
                lastRedirectReason = reason,
                lastRedirectCaller = caller,
                lastRedirectFile = file,
                lastRedirectLine = line,
            )
        }
    }

    fun recordStateChange(oldState: SessionState, newState: SessionState, token: String?) {
        _snapshot.update {
            it.copy(
                previousSessionState = oldState.debugName(),
                currentSessionState = newState.debugName(),
                tokenExists = !token.isNullOrBlank(),
                tokenLength = token?.length ?: 0,
                lastSessionMutationTimestamp = System.currentTimeMillis(),
            )
        }
    }

    fun recordNavigation(previous: String?, current: String?) {
        _snapshot.update {
            it.copy(
                lastRoute = previous ?: it.currentRoute,
                currentRoute = current ?: "Unknown",
            )
        }
    }

    fun recordApiStatus(status: Int, source: String) {
        _snapshot.update { it.copy(lastApiStatus = "$status ($source)") }
    }
}

private fun SessionState.debugName(): String = when (this) {
    SessionState.Restoring -> "Restoring"
    is SessionState.Authenticated -> "Authenticated"
    SessionState.Unauthenticated -> "Unauthenticated"
    SessionState.Expired -> "Expired"
}

private fun Long?.debugTimestamp(): String {
    if (this == null) return "Not recorded"
    return SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS XXX", Locale.US).apply {
        timeZone = TimeZone.getDefault()
    }.format(Date(this))
}
