package com.ratestack.app.ui.schemes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ratestack.app.LoadState
import com.ratestack.app.data.ApiProvider
import com.ratestack.app.data.AuthResponseDto
import com.ratestack.app.data.CustomerProfileDto
import com.ratestack.app.data.PaymentOrderResponseDto
import com.ratestack.app.data.RedemptionQuotationDto
import com.ratestack.app.data.RepositoryResult
import com.ratestack.app.data.SchemeDashboardDto
import com.ratestack.app.data.SchemeEnrollmentDto
import com.ratestack.app.data.SchemeListResponseDto
import com.ratestack.app.data.SchemeRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SchemeViewModel(
    private val repository: SchemeRepository,
) : ViewModel() {

    private val _userToken = MutableStateFlow<String?>(repository.getUserToken())
    val userToken: StateFlow<String?> = _userToken.asStateFlow()

    private val _userName = MutableStateFlow<String?>(repository.getUserName())
    val userName: StateFlow<String?> = _userName.asStateFlow()

    private val _userPhone = MutableStateFlow<String?>(repository.getUserPhone())
    val userPhone: StateFlow<String?> = _userPhone.asStateFlow()

    private val _schemePlans = MutableStateFlow<LoadState<SchemeListResponseDto>>(LoadState.Loading)
    val schemePlans: StateFlow<LoadState<SchemeListResponseDto>> = _schemePlans.asStateFlow()

    private val _mySchemes = MutableStateFlow<LoadState<List<SchemeEnrollmentDto>>>(LoadState.Ready(emptyList()))
    val mySchemes: StateFlow<LoadState<List<SchemeEnrollmentDto>>> = _mySchemes.asStateFlow()

    private val _schemeDashboard = MutableStateFlow<LoadState<SchemeDashboardDto>?>(null)
    val schemeDashboard: StateFlow<LoadState<SchemeDashboardDto>?> = _schemeDashboard.asStateFlow()

    private val _authActionState = MutableStateFlow<LoadState<AuthResponseDto>?>(null)
    val authActionState: StateFlow<LoadState<AuthResponseDto>?> = _authActionState.asStateFlow()

    private val _customerProfile = MutableStateFlow<CustomerProfileDto?>(null)
    val customerProfile: StateFlow<CustomerProfileDto?> = _customerProfile.asStateFlow()

    private val _paymentOrderState = MutableStateFlow<LoadState<PaymentOrderResponseDto>?>(null)
    val paymentOrderState: StateFlow<LoadState<PaymentOrderResponseDto>?> = _paymentOrderState.asStateFlow()

    private val _redemptionQuotationState = MutableStateFlow<LoadState<RedemptionQuotationDto>?>(null)
    val redemptionQuotationState: StateFlow<LoadState<RedemptionQuotationDto>?> = _redemptionQuotationState.asStateFlow()

    private val _selectedPlan = MutableStateFlow<com.ratestack.app.data.SchemePlanDto?>(null)
    val selectedPlan: StateFlow<com.ratestack.app.data.SchemePlanDto?> = _selectedPlan.asStateFlow()

    private val _pendingJoinPlanId = MutableStateFlow<String?>(null)
    val pendingJoinPlanId: StateFlow<String?> = _pendingJoinPlanId.asStateFlow()

    private val _pendingJoinAmount = MutableStateFlow<Double?>(null)
    val pendingJoinAmount: StateFlow<Double?> = _pendingJoinAmount.asStateFlow()

    private val _joinSchemeActionState = MutableStateFlow<LoadState<String>?>(null)
    val joinSchemeActionState: StateFlow<LoadState<String>?> = _joinSchemeActionState.asStateFlow()

    init {
        loadSchemePlans()
        if (!repository.getUserToken().isNull_or_empty()) {
            loadMySchemes()
            loadCustomerProfile()
        }
    }

    fun selectPlan(plan: com.ratestack.app.data.SchemePlanDto) {
        _selectedPlan.value = plan
        if (com.ratestack.app.BuildConfig.DEBUG) {
            android.util.Log.d("RateStackScheme", "Selected Scheme Plan ID: ${plan.id} Name: ${plan.name}")
        }
    }

    fun setPendingJoin(planId: String, amount: Double? = null) {
        _pendingJoinPlanId.value = planId
        _pendingJoinAmount.value = amount
        if (com.ratestack.app.BuildConfig.DEBUG) {
            android.util.Log.d("RateStackScheme", "Pending Join Saved: PlanID=$planId Amount=$amount")
        }
    }

    fun clearPendingJoin() {
        _pendingJoinPlanId.value = null
        _pendingJoinAmount.value = null
    }

    fun resetJoinSchemeActionState() {
        _joinSchemeActionState.value = null
    }

    private fun String?.isNull_or_empty(): Boolean = this == null || this.trim().isEmpty()

    fun loadSchemePlans() {
        viewModelScope.launch {
            _schemePlans.value = LoadState.Loading
            _schemePlans.value = repository.getSchemes().toLoadState()
        }
    }

    fun loadMySchemes() {
        val token = repository.getUserToken()
        if (token.isNull_or_empty()) {
            _mySchemes.value = LoadState.Ready(emptyList())
            return
        }
        viewModelScope.launch {
            _mySchemes.value = LoadState.Loading
            val res = repository.getMySchemes(token!!)
            if (res is RepositoryResult.Failure && res.message.contains("Authentication required", ignoreCase = true)) {
                logout()
            } else {
                _mySchemes.value = res.toLoadState()
            }
        }
    }

    fun loadSchemeDashboard(enrollmentId: String) {
        val token = repository.getUserToken()
        if (token.isNull_or_empty()) {
            _schemeDashboard.value = LoadState.Error("Authentication required")
            return
        }
        viewModelScope.launch {
            _schemeDashboard.value = LoadState.Loading
            val res = repository.getSchemeDashboard(token!!, enrollmentId)
            if (res is RepositoryResult.Failure && res.message.contains("Authentication required", ignoreCase = true)) {
                logout()
            } else {
                _schemeDashboard.value = res.toLoadState()
            }
        }
    }

    private fun normalizePhoneNumber(phone: String): String {
        var digits = phone.replace(Regex("\\D"), "")
        if (digits.length == 12 && digits.startsWith("91")) {
            digits = digits.substring(2)
        } else if (digits.length == 11 && digits.startsWith("0")) {
            digits = digits.substring(1)
        }
        return digits
    }

    fun login(phone: String, pass: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _authActionState.value = LoadState.Loading
            val normalizedPhone = if (phone.contains("@")) phone.trim().lowercase() else normalizePhoneNumber(phone)
            try {
                val body = mapOf(
                    "identifier" to normalizedPhone,
                    "identifier" to normalizedPhone,
                    "password" to pass,
                )
                val res = ApiProvider.service.loginUser(body)

                if (com.ratestack.app.BuildConfig.DEBUG) {
                    android.util.Log.d(
                        "RateStackAuth",
                        "Login Endpoint: ${com.ratestack.app.BuildConfig.WEBSITE_URL}/api/v1/auth/login | Code: ${res.code()} | Mobile: $normalizedPhone | Error: ${res.body()?.error?.message}",
                    )
                }

                if (res.isSuccessful && res.body()?.success == true) {
                    val authData = res.body()?.data
                    if (authData?.token != null) {
                        repository.saveUserToken(authData.token)
                        repository.saveUserDetails(authData.user?.fullName ?: "Customer", authData.user?.phone ?: normalizedPhone)
                        _userToken.value = authData.token
                        _userName.value = authData.user?.fullName ?: "Customer"
                        _userPhone.value = authData.user?.phone ?: normalizedPhone
                        _authActionState.value = LoadState.Ready(authData)
                        loadMySchemes()
                        loadCustomerProfile()
                        onSuccess()
                    } else {
                        _authActionState.value = LoadState.Error("Invalid response from server")
                    }
                } else {
                    val errMsg = res.body()?.error?.message ?: "Invalid login details."
                    _authActionState.value = LoadState.Error(errMsg)
                }
            } catch (e: Exception) {
                _authActionState.value = LoadState.Error(e.message ?: "Network connection error")
            }
        }
    }

    fun googleSignIn(idToken: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _authActionState.value = LoadState.Loading
            try {
                val res = ApiProvider.service.googleSignIn(mapOf("idToken" to idToken))
                val authData = res.body()?.data
                if (res.isSuccessful && res.body()?.success == true && authData?.token != null) {
                    repository.saveUserToken(authData.token)
                    repository.saveUserDetails(authData.user?.fullName ?: "Customer", authData.user?.phone.orEmpty())
                    _userToken.value = authData.token
                    _userName.value = authData.user?.fullName ?: "Customer"
                    _userPhone.value = authData.user?.phone.orEmpty()
                    _authActionState.value = LoadState.Ready(authData)
                    loadMySchemes()
                    loadCustomerProfile()
                    onSuccess()
                } else {
                    _authActionState.value = LoadState.Error(
                        res.body()?.error?.message ?: "Google sign-in could not be completed. Please try again.",
                    )
                }
            } catch (_: Exception) {
                _authActionState.value = LoadState.Error("Google sign-in could not be completed. Please try again.")
            }
        }
    }

    fun loadCustomerProfile() {
        val token = _userToken.value ?: return
        viewModelScope.launch {
            runCatching { ApiProvider.service.getCustomerProfile("Bearer $token") }
                .onSuccess { response ->
                    if (response.isSuccessful && response.body()?.success == true) {
                        _customerProfile.value = response.body()?.data
                    }
                }
        }
    }

    fun connectGoogleAccount(idToken: String) {
        val token = _userToken.value ?: return
        viewModelScope.launch {
            val response = runCatching {
                ApiProvider.service.connectGoogleAccount("Bearer $token", mapOf("idToken" to idToken))
            }.getOrNull()
            if (response?.isSuccessful == true && response.body()?.success == true) loadCustomerProfile()
        }
    }

    fun disconnectGoogleAccount() {
        val token = _userToken.value ?: return
        viewModelScope.launch {
            val response = runCatching { ApiProvider.service.disconnectGoogleAccount("Bearer $token") }.getOrNull()
            if (response?.isSuccessful == true && response.body()?.success == true) loadCustomerProfile()
        }
    }

    fun register(fullName: String, phone: String, pass: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _authActionState.value = LoadState.Loading
            val isEmail = phone.contains("@")
            val normalizedPhone = if (isEmail) phone.trim().lowercase() else normalizePhoneNumber(phone)
            try {
                val body = mapOf(
                    "fullName" to fullName.trim(),
                    (if (isEmail) "email" else "phone") to normalizedPhone,
                    "password" to pass,
                )
                val res = if (isEmail) ApiProvider.service.registerEmailUser(body) else ApiProvider.service.registerUser(body)

                if (com.ratestack.app.BuildConfig.DEBUG) {
                    android.util.Log.d(
                        "RateStackAuth",
                        "Register Endpoint: ${com.ratestack.app.BuildConfig.WEBSITE_URL}/api/v1/auth/register | Code: ${res.code()} | Mobile: $normalizedPhone | Error: ${res.body()?.error?.message}",
                    )
                }

                if (res.isSuccessful && res.body()?.success == true) {
                    val authData = res.body()?.data
                    if (authData?.token != null) {
                        repository.saveUserToken(authData.token)
                        repository.saveUserDetails(authData.user?.fullName ?: fullName, authData.user?.phone ?: normalizedPhone)
                        _userToken.value = authData.token
                        _userName.value = authData.user?.fullName ?: fullName
                        _userPhone.value = authData.user?.phone ?: normalizedPhone
                        _authActionState.value = LoadState.Ready(authData)
                        loadMySchemes()
                        loadCustomerProfile()
                        onSuccess()
                    } else if (isEmail && res.body()?.success == true) {
                        _authActionState.value = LoadState.Ready(requireNotNull(authData))
                        onSuccess()
                    } else {
                        _authActionState.value = LoadState.Error("Invalid registration response")
                    }
                } else {
                    val errMsg = res.body()?.error?.message ?: "Registration failed. Mobile number may already exist."
                    _authActionState.value = LoadState.Error(errMsg)
                }
            } catch (e: Exception) {
                _authActionState.value = LoadState.Error(e.message ?: "Network connection error")
            }
        }
    }

    fun joinScheme(
        planId: String,
        monthlyAmount: Double,
        nomineeFullName: String,
        nomineeRelationship: String,
        nomineePhone: String? = null,
        nomineeAge: Int? = null,
        acceptedTermsVersion: String = "v1.0-2026",
        onSuccess: (enrollmentId: String) -> Unit,
        onError: (String) -> Unit
    ) {
        val token = repository.getUserToken()
        if (token.isNull_or_empty()) {
            _joinSchemeActionState.value = LoadState.Error("Authentication required")
            onError("Authentication required")
            return
        }
        viewModelScope.launch {
            _joinSchemeActionState.value = LoadState.Loading
            if (com.ratestack.app.BuildConfig.DEBUG) {
                android.util.Log.d(
                    "RateStackScheme",
                    "Joining Scheme PlanID=$planId Amount=$monthlyAmount Nominee=$nomineeFullName Rel=$nomineeRelationship Terms=$acceptedTermsVersion"
                )
            }
            try {
                val req = com.ratestack.app.data.JoinSchemeRequestDto(
                    monthlyAmount = monthlyAmount,
                    nomineeFullName = nomineeFullName.trim(),
                    nomineeRelationship = nomineeRelationship.trim(),
                    nomineePhone = if (!nomineePhone.isNull_or_empty()) normalizePhoneNumber(nomineePhone!!) else null,
                    nomineeAge = if (nomineeAge != null && nomineeAge > 0) nomineeAge else null,
                    acceptedTermsVersion = acceptedTermsVersion
                )

                val res = ApiProvider.service.joinScheme(
                    "Bearer $token",
                    planId,
                    req
                )

                if (com.ratestack.app.BuildConfig.DEBUG) {
                    android.util.Log.d(
                        "RateStackScheme",
                        "Join Scheme HTTP Code: ${res.code()} | Success: ${res.body()?.success} | Error: ${res.body()?.error?.message}"
                    )
                }

                if (res.isSuccessful && res.body()?.success == true) {
                    val enrollmentData = res.body()?.data
                    val enrollmentId = enrollmentData?.enrollmentId ?: ""
                    _joinSchemeActionState.value = LoadState.Ready("Account created")
                    loadMySchemes()
                    onSuccess(enrollmentId)
                } else {
                    val errMsg = res.body()?.error?.message ?: "Unable to open the scheme account. Please try again."
                    _joinSchemeActionState.value = LoadState.Error(errMsg)
                    onError(errMsg)
                }
            } catch (e: Exception) {
                if (com.ratestack.app.BuildConfig.DEBUG) {
                    android.util.Log.e("RateStackScheme", "Join Scheme Exception: ${e.javaClass.simpleName}: ${e.message}")
                }
                val errMsg = "Unable to open the scheme account. Please try again."
                _joinSchemeActionState.value = LoadState.Error(errMsg)
                onError(errMsg)
            }
        }
    }

    private val _paymentFlowState = MutableStateFlow<com.ratestack.app.data.PaymentActionState>(com.ratestack.app.data.PaymentActionState.Idle)
    val paymentFlowState: StateFlow<com.ratestack.app.data.PaymentActionState> = _paymentFlowState.asStateFlow()

    fun resetPaymentFlowState() {
        _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Idle
    }

    fun startPaymentFlow(
        enrollmentId: String,
        onLaunchCheckout: (checkoutValue: String, gatewayOrderId: String, paymentOrderId: String, gateway: String, amount: Double) -> Unit,
    ) {
        val token = repository.getUserToken()
        if (token.isNull_or_empty()) {
            _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Error("Authentication required")
            return
        }

        viewModelScope.launch {
            _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.CreatingOrder
            if (com.ratestack.app.BuildConfig.DEBUG) {
                android.util.Log.d("RateStackPayment", "Pay Installment Clicked | EnrollmentId: $enrollmentId")
            }

            try {
                val configRes = ApiProvider.service.getPaymentConfig()
                if (!configRes.isSuccessful || configRes.body()?.activeGateway.isNullOrBlank()) {
                    _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Error("Payment configuration is unavailable.")
                    return@launch
                }
                val res = ApiProvider.service.createPaymentOrder(
                    "Bearer $token",
                    enrollmentId,
                    emptyMap()
                )

                if (com.ratestack.app.BuildConfig.DEBUG) {
                    android.util.Log.d(
                        "RateStackPayment",
                        "Order API HTTP Code: ${res.code()} | Success: ${res.body()?.success} | Error: ${res.body()?.error?.message}"
                    )
                }

                if (res.isSuccessful && res.body()?.success == true) {
                    val data = res.body()?.data
                    if (data != null) {
                        val paymentOrderId = data.paymentOrderId ?: ""
                        val gateway = data.gateway ?: configRes.body()?.activeGateway ?: "RAZORPAY"
                        val redirectUrl = data.redirectUrl ?: ""
                        val merchantTransactionId = data.merchantTransactionId ?: data.gatewayOrderId ?: ""

                        if (com.ratestack.app.BuildConfig.DEBUG) {
                            android.util.Log.d(
                                "RateStackPayment",
                                "Order Created | PaymentOrderId: $paymentOrderId | Gateway: $gateway | RedirectUrl Present: ${redirectUrl.isNotBlank()}"
                            )
                        }

                        if (gateway == "PHONEPE") {
                            if (redirectUrl.isNotBlank()) {
                                val state = com.ratestack.app.data.PaymentActionState.LaunchingPhonePeCheckout(
                                    redirectUrl = redirectUrl,
                                    merchantTransactionId = merchantTransactionId,
                                    paymentOrderId = paymentOrderId,
                                    enrollmentId = enrollmentId,
                                )
                                _paymentFlowState.value = state
                                onLaunchCheckout(redirectUrl, merchantTransactionId, paymentOrderId, gateway, data.amount ?: 0.0)
                            } else {
                                _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Error("PhonePe checkout URL is unavailable.")
                            }
                        } else if (gateway == "RAZORPAY") {
                            val keyId = configRes.body()?.razorpay?.keyId ?: data.keyId.orEmpty()
                            val gatewayOrderId = data.gatewayOrderId.orEmpty()
                            if (keyId.isNotBlank() && gatewayOrderId.isNotBlank()) {
                                onLaunchCheckout(keyId, gatewayOrderId, paymentOrderId, gateway, data.amount ?: 0.0)
                            } else {
                                _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Error("Razorpay is not configured.")
                            }
                        } else {
                            _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Error("Unsupported payment gateway.")
                        }
                    } else {
                        _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Error("Unable to create payment order.")
                    }
                } else {
                    val msg = extractSafeErrorMessage(res, "Unable to create payment order. Please try again.")
                    _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Error(msg)
                }
            } catch (e: Exception) {
                val msg = extractExceptionMessage(e, "Unable to create payment order. Please try again.")
                _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Error(msg)
            }
        }
    }

    fun handlePaymentSuccess(
        enrollmentId: String,
        paymentOrderId: String,
        gatewayPaymentId: String,
        gatewaySignature: String,
    ) {
        val token = repository.getUserToken()
        if (token.isNull_or_empty()) {
            _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Error("Authentication required")
            return
        }

        viewModelScope.launch {
            _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Verifying
            if (com.ratestack.app.BuildConfig.DEBUG) {
                android.util.Log.d("RateStackPayment", "Verifying Payment | EnrollmentId: $enrollmentId | PaymentOrderId: $paymentOrderId")
            }

            try {
                val res = ApiProvider.service.verifyPayment(
                    "Bearer $token",
                    enrollmentId,
                    mapOf(
                        "paymentOrderId" to paymentOrderId,
                        "gatewayPaymentId" to gatewayPaymentId,
                        "gatewaySignature" to gatewaySignature
                    )
                )

                if (com.ratestack.app.BuildConfig.DEBUG) {
                    android.util.Log.d(
                        "RateStackPayment",
                        "Verify API HTTP Code: ${res.code()} | Success: ${res.body()?.success}"
                    )
                }

                if (res.isSuccessful && res.body()?.success == true) {
                    val receiptNo = res.body()?.data?.get("receiptNumber")
                    _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Success("Payment completed successfully.", receiptNo)
                    loadSchemeDashboard(enrollmentId)
                    loadMySchemes()
                } else {
                    val errMsg = extractSafeErrorMessage(res, "Payment received but verification is pending.")
                    _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Error(errMsg)
                }
            } catch (e: Exception) {
                val errMsg = extractExceptionMessage(e, "Payment received but verification is pending.")
                _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Error(errMsg)
            }
        }
    }

    fun handlePaymentCancelled() {
        _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Error("Payment was cancelled.")
    }

    fun handlePaymentFailed(description: String? = null) {
        _paymentFlowState.value = com.ratestack.app.data.PaymentActionState.Error("Payment failed. Please try again.")
    }

    private val _forgotMobile = MutableStateFlow("")
    val forgotMobile: StateFlow<String> = _forgotMobile.asStateFlow()

    private val _resetToken = MutableStateFlow<String?>(null)
    val resetToken: StateFlow<String?> = _resetToken.asStateFlow()

    private val _forgotActionState = MutableStateFlow<LoadState<String>?>(null)
    val forgotActionState: StateFlow<LoadState<String>?> = _forgotActionState.asStateFlow()

    fun setForgotMobile(mobile: String) {
        _forgotMobile.value = normalizePhoneNumber(mobile)
    }

    fun clearForgotState() {
        _forgotActionState.value = null
    }

    fun requestPasswordResetOtp(phone: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            val normalized = normalizePhoneNumber(phone)
            _forgotMobile.value = normalized
            _forgotActionState.value = LoadState.Loading
            try {
                val res = ApiProvider.service.requestPasswordResetOtp(mapOf("mobileNumber" to normalized))
                if (res.isSuccessful && res.body()?.success == true) {
                    _forgotActionState.value = LoadState.Ready(res.body()?.data?.get("message")?.toString() ?: "OTP sent")
                    onSuccess()
                } else {
                    val errMsg = res.body()?.error?.message ?: "Failed to send OTP. Please try again."
                    _forgotActionState.value = LoadState.Error(errMsg)
                }
            } catch (e: Exception) {
                _forgotActionState.value = LoadState.Error(e.message ?: "Network connection error")
            }
        }
    }

    fun verifyPasswordResetOtp(otp: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            val mobile = _forgotMobile.value
            _forgotActionState.value = LoadState.Loading
            try {
                val res = ApiProvider.service.verifyPasswordResetOtp(mapOf("mobileNumber" to mobile, "otp" to otp))
                if (res.isSuccessful && res.body()?.success == true && !res.body()?.resetToken.isNullOrEmpty()) {
                    _resetToken.value = res.body()?.resetToken
                    _forgotActionState.value = LoadState.Ready("OTP verified successfully.")
                    onSuccess()
                } else {
                    val errMsg = res.body()?.error?.message ?: "The verification code is incorrect."
                    _forgotActionState.value = LoadState.Error(errMsg)
                }
            } catch (e: Exception) {
                _forgotActionState.value = LoadState.Error(e.message ?: "Network connection error")
            }
        }
    }

    fun resetPassword(newPassword: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            val token = _resetToken.value
            if (token.isNullOrEmpty()) {
                _forgotActionState.value = LoadState.Error("Invalid reset token. Please restart.")
                return@launch
            }
            _forgotActionState.value = LoadState.Loading
            try {
                val res = ApiProvider.service.resetPassword(mapOf("resetToken" to token, "newPassword" to newPassword))
                if (res.isSuccessful && res.body()?.success == true) {
                    _forgotActionState.value = LoadState.Ready("Password reset successfully.")
                    _resetToken.value = null
                    onSuccess()
                } else {
                    val errMsg = res.body()?.error?.message ?: "Password reset failed."
                    _forgotActionState.value = LoadState.Error(errMsg)
                }
            } catch (e: Exception) {
                _forgotActionState.value = LoadState.Error(e.message ?: "Network connection error")
            }
        }
    }

    fun resetAuthActionState() {
        _authActionState.value = null
    }

    private fun extractSafeErrorMessage(res: retrofit2.Response<*>, defaultFallback: String): String {
        var rawMessage = ""
        try {
            val errorBodyStr = res.errorBody()?.string()
            if (!errorBodyStr.isNullOrBlank()) {
                val gson = com.google.gson.Gson()
                val type = object : com.google.gson.reflect.TypeToken<com.ratestack.app.data.ApiEnvelope<Any>>() {}.type
                val env: com.ratestack.app.data.ApiEnvelope<Any>? = gson.fromJson(errorBodyStr, type)
                rawMessage = env?.error?.message.orEmpty()
            }
        } catch (e: Exception) {
            if (com.ratestack.app.BuildConfig.DEBUG) {
                android.util.Log.e("RateStackPayment", "Error parsing error response: ${e.message}")
            }
        }

        if (rawMessage.isBlank()) {
            rawMessage = (res.body() as? com.ratestack.app.data.ApiEnvelope<*>)?.error?.message.orEmpty()
        }

        if (com.ratestack.app.BuildConfig.DEBUG) {
            android.util.Log.d("RateStackPayment", "HTTP Status: ${res.code()} | Raw Error Message: '$rawMessage'")
        }

        return when {
            res.code() == 401 -> "Your session has expired. Please login again."
            res.code() == 503 || rawMessage.contains("credentials", ignoreCase = true) || rawMessage.contains("configured", ignoreCase = true) ->
                "Payment service is not configured yet."
            res.code() == 404 -> "Scheme account not found."
            res.code() == 409 -> "A payment for this installment is already pending."
            res.code() == 400 && rawMessage.isNotBlank() -> rawMessage
            rawMessage.isNotBlank() && !rawMessage.contains("internal", ignoreCase = true) -> rawMessage
            else -> defaultFallback
        }
    }

    private fun extractExceptionMessage(e: Exception, defaultFallback: String): String {
        if (com.ratestack.app.BuildConfig.DEBUG) {
            android.util.Log.e("RateStackPayment", "Exception: ${e.javaClass.simpleName}: ${e.message}")
        }
        return when (e) {
            is java.net.UnknownHostException, is java.net.SocketTimeoutException, is java.net.ConnectException ->
                "Unable to connect. Check your internet connection."
            else -> defaultFallback
        }
    }

    fun logout() {
        repository.clearUserToken()
        repository.clearUserDetails()
        _userToken.value = null
        _userName.value = null
        _userPhone.value = null
        _mySchemes.value = LoadState.Ready(emptyList())
        _schemeDashboard.value = null
    }
}

private fun <T> RepositoryResult<T>.toLoadState(): LoadState<T> = when (this) {
    is RepositoryResult.Success -> LoadState.Ready(data, fromCache, warning)
    is RepositoryResult.Failure -> LoadState.Error(message, retryable)
}
