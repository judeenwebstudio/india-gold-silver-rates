package com.ratestack.app.ui.schemes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ratestack.app.LoadState
import com.ratestack.app.data.ApiProvider
import com.ratestack.app.data.AuthResponseDto
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

    private val _paymentOrderState = MutableStateFlow<LoadState<PaymentOrderResponseDto>?>(null)
    val paymentOrderState: StateFlow<LoadState<PaymentOrderResponseDto>?> = _paymentOrderState.asStateFlow()

    private val _redemptionQuotationState = MutableStateFlow<LoadState<RedemptionQuotationDto>?>(null)
    val redemptionQuotationState: StateFlow<LoadState<RedemptionQuotationDto>?> = _redemptionQuotationState.asStateFlow()

    init {
        loadSchemePlans()
        if (!repository.getUserToken().isNull_or_empty()) {
            loadMySchemes()
        }
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

    fun login(phone: String, pass: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _authActionState.value = LoadState.Loading
            try {
                val res = ApiProvider.service.loginUser(mapOf("phone" to phone, "password" to pass))
                if (res.isSuccessful && res.body()?.success == true) {
                    val authData = res.body()?.data
                    if (authData?.token != null) {
                        repository.saveUserToken(authData.token)
                        repository.saveUserDetails(authData.user?.fullName ?: "Customer", authData.user?.phone ?: phone)
                        _userToken.value = authData.token
                        _userName.value = authData.user?.fullName ?: "Customer"
                        _userPhone.value = authData.user?.phone ?: phone
                        _authActionState.value = LoadState.Ready(authData)
                        loadMySchemes()
                        onSuccess()
                    } else {
                        _authActionState.value = LoadState.Error("Invalid response from server")
                    }
                } else {
                    val errMsg = res.body()?.error?.message ?: "Login failed. Please check credentials."
                    _authActionState.value = LoadState.Error(errMsg)
                }
            } catch (e: Exception) {
                _authActionState.value = LoadState.Error(e.message ?: "Network connection error")
            }
        }
    }

    fun register(fullName: String, phone: String, pass: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _authActionState.value = LoadState.Loading
            try {
                val res = ApiProvider.service.registerUser(
                    mapOf("fullName" to fullName, "phone" to phone, "password" to pass)
                )
                if (res.isSuccessful && res.body()?.success == true) {
                    val authData = res.body()?.data
                    if (authData?.token != null) {
                        repository.saveUserToken(authData.token)
                        repository.saveUserDetails(authData.user?.fullName ?: fullName, authData.user?.phone ?: phone)
                        _userToken.value = authData.token
                        _userName.value = authData.user?.fullName ?: fullName
                        _userPhone.value = authData.user?.phone ?: phone
                        _authActionState.value = LoadState.Ready(authData)
                        loadMySchemes()
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

    fun joinScheme(planId: String, amount: Double, onSuccess: () -> Unit, onError: (String) -> Unit) {
        val token = repository.getUserToken()
        if (token.isNull_or_empty()) {
            onError("Authentication required")
            return
        }
        viewModelScope.launch {
            try {
                val res = ApiProvider.service.joinScheme(
                    "Bearer $token",
                    planId,
                    mapOf("monthlyAmount" to amount)
                )
                if (res.isSuccessful && res.body()?.success == true) {
                    loadMySchemes()
                    onSuccess()
                } else {
                    onError(res.body()?.error?.message ?: "Failed to join scheme")
                }
            } catch (e: Exception) {
                onError(e.message ?: "Network error joining scheme")
            }
        }
    }

    fun createPaymentOrder(enrollmentId: String, onSuccess: (PaymentOrderResponseDto) -> Unit, onError: (String) -> Unit) {
        val token = repository.getUserToken()
        if (token.isNull_or_empty()) {
            onError("Authentication required")
            return
        }
        viewModelScope.launch {
            _paymentOrderState.value = LoadState.Loading
            try {
                val res = ApiProvider.service.createPaymentOrder(
                    "Bearer $token",
                    enrollmentId,
                    mapOf("gateway" to "RAZORPAY")
                )
                if (res.isSuccessful && res.body()?.success == true) {
                    val data = res.body()?.data
                    if (data != null) {
                        _paymentOrderState.value = LoadState.Ready(data)
                        onSuccess(data)
                    } else {
                        _paymentOrderState.value = LoadState.Error("Order data empty")
                        onError("Failed to generate payment order")
                    }
                } else {
                    val err = res.body()?.error?.message ?: "Payment order creation failed"
                    _paymentOrderState.value = LoadState.Error(err)
                    onError(err)
                }
            } catch (e: Exception) {
                val err = e.message ?: "Network error creating payment order"
                _paymentOrderState.value = LoadState.Error(err)
                onError(err)
            }
        }
    }

    fun verifyPayment(
        enrollmentId: String,
        paymentOrderId: String,
        gatewayPaymentId: String,
        gatewaySignature: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
    ) {
        val token = repository.getUserToken()
        if (token.isNull_or_empty()) {
            onError("Authentication required")
            return
        }
        viewModelScope.launch {
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
                if (res.isSuccessful && res.body()?.success == true) {
                    loadSchemeDashboard(enrollmentId)
                    loadMySchemes()
                    onSuccess()
                } else {
                    onError(res.body()?.error?.message ?: "Payment verification failed")
                }
            } catch (e: Exception) {
                onError(e.message ?: "Network error verifying payment")
            }
        }
    }

    fun resetAuthActionState() {
        _authActionState.value = null
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
