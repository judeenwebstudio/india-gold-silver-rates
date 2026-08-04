package com.ratestack.app.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.ratestack.app.BuildConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicLong

data class CustomerSession(
    val id: String,
    val fullName: String,
    val phone: String,
    val email: String? = null,
)

sealed interface SessionState {
    data object Restoring : SessionState
    data class Authenticated(
        val token: String,
        val customer: CustomerSession,
    ) : SessionState
    data object Unauthenticated : SessionState
    data object Expired : SessionState
}

class SessionRepository(
    private val context: Context,
) {
    private val prefs: SharedPreferences = context.getSharedPreferences("ratestack_scheme_prefs", Context.MODE_PRIVATE)

    private val _sessionState = MutableStateFlow<SessionState>(SessionState.Restoring)
    val sessionState: StateFlow<SessionState> = _sessionState.asStateFlow()

    private val generationId = AtomicLong(0L)
    @Volatile private var activeValidationJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO)

    val currentToken: String?
        get() = when (val state = _sessionState.value) {
            is SessionState.Authenticated -> state.token
            else -> prefs.getString("scheme_user_token", null)?.takeIf { it.isNotBlank() }
        }

    init {
        restoreSession()
    }

    @Synchronized
    fun restoreSession() {
        val currentGen = generationId.incrementAndGet()
        val token = prefs.getString("scheme_user_token", null)?.trim()
        val name = prefs.getString("scheme_user_name", null)?.trim()
        val phone = prefs.getString("scheme_user_phone", null)?.trim()
        val email = prefs.getString("customer_email", null)?.trim()
        val id = prefs.getString("customer_id", null)?.trim() ?: "cust_restored"

        val prevState = _sessionState.value

        if (!token.isNullOrBlank() && !name.isNullOrBlank()) {
            val customer = CustomerSession(id = id, fullName = name, phone = phone.orEmpty(), email = email)
            val newState = SessionState.Authenticated(token, customer)
            _sessionState.value = newState

            SessionLogger.logSessionMutation(
                action = "restoreSession -> Authenticated",
                callerClass = "SessionRepository",
                callerMethod = "restoreSession",
                currentTokenLength = token.length,
                currentSessionState = newState,
                reason = "Restored saved token from SharedPreferences on app startup",
            )
        } else {
            val newState = SessionState.Unauthenticated
            _sessionState.value = newState

            SessionLogger.logSessionMutation(
                action = "restoreSession -> Unauthenticated",
                callerClass = "SessionRepository",
                callerMethod = "restoreSession",
                currentTokenLength = 0,
                currentSessionState = newState,
                reason = "No valid saved token found in SharedPreferences on app startup",
            )
        }
    }

    @Synchronized
    fun completeLogin(token: String, customer: CustomerSession): Boolean {
        require(token.isNotBlank()) { "Token must not be blank" }
        val currentGen = generationId.incrementAndGet()
        activeValidationJob?.cancel()

        val prevState = _sessionState.value

        // 1. Synchronously persist to SharedPreferences
        val editSuccess = prefs.edit().apply {
            putString("scheme_user_token", token.trim())
            putString("customer_id", customer.id.trim())
            putString("scheme_user_name", customer.fullName.trim())
            putString("scheme_user_phone", customer.phone.trim())
            if (customer.email != null) putString("customer_email", customer.email.trim()) else remove("customer_email")
        }.commit()

        // 2. Read back & verify
        val readBackToken = prefs.getString("scheme_user_token", null)
        val isVerified = editSuccess && readBackToken == token.trim()

        if (isVerified) {
            val newState = SessionState.Authenticated(token.trim(), customer)
            _sessionState.value = newState

            SessionLogger.logSessionMutation(
                action = "completeLogin -> Authenticated",
                callerClass = "SessionRepository",
                callerMethod = "completeLogin",
                currentTokenLength = token.length,
                currentSessionState = newState,
                reason = "Login succeeded and token persisted synchronously (gen=$currentGen)",
            )

            if (BuildConfig.DEBUG) {
                Log.d("RateStackSession", "10. SessionState updated to Authenticated (gen=$currentGen, tokenLen=${token.length})")
                Log.d("RateStackNavigation", "10. Authenticated state confirmed, navigation to Dashboard ready")
            }
            return true
        } else {
            Log.e("RateStackSession", "CRITICAL: SharedPreferences commit/read-back verification failed for token!")
            return false
        }
    }

    @Synchronized
    fun logout() {
        val currentGen = generationId.incrementAndGet()
        activeValidationJob?.cancel()
        val prevState = _sessionState.value
        val tokenLen = currentToken?.length ?: 0

        prefs.edit().apply {
            remove("scheme_user_token")
            remove("customer_id")
            remove("scheme_user_name")
            remove("scheme_user_phone")
            remove("customer_email")
            remove("pending_auth_destination")
        }.commit()

        val newState = SessionState.Unauthenticated
        _sessionState.value = newState

        SessionLogger.logSessionMutation(
            action = "logout -> Unauthenticated",
            callerClass = "SessionRepository",
            callerMethod = "logout",
            currentTokenLength = tokenLen,
            currentSessionState = newState,
            reason = "Explicit customer logout invoked (gen=$currentGen)",
        )
    }

    @Synchronized
    fun expireSession(httpStatus: Int = 401, errorCode: String = "TOKEN_EXPIRED") {
        val currentGen = generationId.incrementAndGet()
        activeValidationJob?.cancel()
        val prevState = _sessionState.value
        val tokenLen = currentToken?.length ?: 0

        prefs.edit().apply {
            remove("scheme_user_token")
            remove("customer_id")
            remove("scheme_user_name")
            remove("scheme_user_phone")
            remove("customer_email")
            remove("pending_auth_destination")
        }.commit()

        val newState = SessionState.Expired
        _sessionState.value = newState

        SessionLogger.logSessionMutation(
            action = "expireSession -> Expired",
            callerClass = "SessionRepository",
            callerMethod = "expireSession",
            currentTokenLength = tokenLen,
            currentSessionState = newState,
            reason = "Session expired due to backend $httpStatus response code=$errorCode (gen=$currentGen)",
            httpStatus = httpStatus,
        )
    }

    fun validateSessionWithBackend(api: RateStackApi) {
        val currentState = _sessionState.value as? SessionState.Authenticated ?: return
        val currentGen = generationId.get()

        activeValidationJob?.cancel()
        activeValidationJob = scope.launch {
            if (BuildConfig.DEBUG) {
                Log.d("RateStackSession", "13. Background session validation started (gen=$currentGen, tokenLen=${currentState.token.length})")
            }
            runCatching {
                api.getCustomerProfile("Bearer ${currentState.token}")
            }.onSuccess { response ->
                if (generationId.get() != currentGen) {
                    if (BuildConfig.DEBUG) {
                        Log.d("RateStackSession", "Ignored validation result from stale session generation (staleGen=$currentGen, activeGen=${generationId.get()})")
                    }
                    return@onSuccess
                }

                if (response.isSuccessful && response.body()?.success == true) {
                    val user = response.body()?.data
                    if (user != null) {
                        // Refresh user details
                        prefs.edit().apply {
                            putString("scheme_user_name", user.fullName)
                            putString("scheme_user_phone", user.phone)
                            if (user.email != null) putString("customer_email", user.email)
                        }.commit()
                    }
                } else if (response.code() == 401) {
                    val errorPayload = ApiProvider.errorMessage(response, "UNAUTHORIZED")
                    if (errorPayload.contains("INVALID_TOKEN", true) || errorPayload.contains("TOKEN_EXPIRED", true) || errorPayload.contains("Authentication required", true)) {
                        Log.w("RateStackSession", "Confirmed 401 token expiry from backend. Expiring session.")
                        expireSession(401, errorPayload)
                    } else {
                        Log.w("RateStackSession", "401 response without token expiry code. Keeping local session.")
                    }
                } else {
                    Log.d("RateStackSession", "Validation API returned status=${response.code()}. Keeping local authenticated session.")
                }
            }.onFailure { e ->
                Log.w("RateStackSession", "Validation network exception (keeping local session): ${e.message}")
            }
        }
    }
}
