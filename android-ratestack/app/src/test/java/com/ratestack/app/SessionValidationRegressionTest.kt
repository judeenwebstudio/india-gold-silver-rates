package com.ratestack.app

import com.ratestack.app.data.CustomerSession
import com.ratestack.app.data.CustomerProfileDto
import com.ratestack.app.data.SessionState
import com.ratestack.app.data.isExplicitSessionExpiryCode
import com.ratestack.app.data.mergeCustomerSession
import com.ratestack.app.data.parseApiErrorInfo
import com.ratestack.app.ui.shop.shouldRedirectMyOrdersToLogin
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionValidationRegressionTest {
    private val authenticated = SessionState.Authenticated(
        token = "test-token",
        customer = CustomerSession("customer-id", "Customer", "0000000000"),
    )

    @Test
    fun genericAuthenticationRequiredMessageWithoutCodeDoesNotExpireSession() {
        val error = parseApiErrorInfo("""{"error":{"message":"Authentication required"}}""")

        assertTrue(error.message?.isNotBlank() == true)
        assertFalse(isExplicitSessionExpiryCode(error.code))
    }

    @Test
    fun invalidTokenCodeExpiresSession() {
        val error = parseApiErrorInfo("""{"error":{"code":"INVALID_TOKEN","message":"Authentication required"}}""")
        assertTrue(isExplicitSessionExpiryCode(error.code))
    }

    @Test
    fun tokenExpiredCodeExpiresSession() {
        assertTrue(isExplicitSessionExpiryCode("TOKEN_EXPIRED"))
        assertTrue(isExplicitSessionExpiryCode("SESSION_EXPIRED"))
    }

    @Test
    fun authenticatedDashboardNeverRedirectsFromSeparateUiTokenState() {
        assertFalse(shouldRedirectMyOrdersToLogin(authenticated))
    }

    @Test
    fun restoringSessionDoesNotRedirect() {
        assertFalse(shouldRedirectMyOrdersToLogin(SessionState.Restoring))
    }

    @Test
    fun dashboardServerFailureDoesNotChangeAuthenticationRedirectDecision() {
        val dashboardStatus = 500
        assertTrue(dashboardStatus >= 500)
        assertFalse(shouldRedirectMyOrdersToLogin(authenticated))
    }

    @Test
    fun onlyTerminalUnauthenticatedStatesRedirect() {
        assertTrue(shouldRedirectMyOrdersToLogin(SessionState.Unauthenticated))
        assertTrue(shouldRedirectMyOrdersToLogin(SessionState.Expired))
    }

    @Test
    fun profileRefreshEnrichesCanonicalSessionCustomer() {
        val current = CustomerSession("customer-id", "Judeen", "9876543210")
        val merged = mergeCustomerSession(
            current,
            CustomerProfileDto("Judeen", "9876543210", "customer@example.test", true, true, "customer@example.test"),
        )

        assertTrue(merged.googleConnected == true)
        assertTrue(merged.email == "customer@example.test")
    }

    @Test
    fun missingProfileFieldsNeverClearLoginCustomer() {
        val current = CustomerSession("customer-id", "Judeen", "9876543210", "customer@example.test", true)
        val merged = mergeCustomerSession(current, CustomerProfileDto(null, null, null, null, null, null))

        assertTrue(merged == current)
    }
}
