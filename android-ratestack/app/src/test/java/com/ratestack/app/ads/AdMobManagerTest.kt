package com.ratestack.app.ads

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class AdMobManagerTest {

    @Before
    fun setUp() {
        AdMobManager.resetMetricsForTest()
    }

    @Test
    fun testIsRouteEligible_AllowsMainAppRoutes() {
        assertTrue(AdMobManager.isRouteEligible("home"))
        assertTrue(AdMobManager.isRouteEligible("shop"))
        assertTrue(AdMobManager.isRouteEligible("settings"))
        assertTrue(AdMobManager.isRouteEligible("my_orders"))
        assertTrue(AdMobManager.isRouteEligible("favorites"))
    }

    @Test
    fun testIsRouteEligible_BlocksAuthAndSensitiveRoutes() {
        assertFalse(AdMobManager.isRouteEligible("customer_login"))
        assertFalse(AdMobManager.isRouteEligible("customer_register"))
        assertFalse(AdMobManager.isRouteEligible("forgot_password"))
        assertFalse(AdMobManager.isRouteEligible("otp_verification"))
        assertFalse(AdMobManager.isRouteEligible("reset_password"))
        assertFalse(AdMobManager.isRouteEligible("scheme_join/plan_123"))
        assertFalse(AdMobManager.isRouteEligible("scheme_dashboard/enrollment_456"))
        assertFalse(AdMobManager.isRouteEligible("order_tracking/order_789"))
        assertFalse(AdMobManager.isRouteEligible(null))
        assertFalse(AdMobManager.isRouteEligible(""))
    }

    @Test
    fun testRecordEligibleTransition_IncrementsOnlyForValidTransitions() {
        // Same route -> not eligible
        assertFalse(AdMobManager.recordEligibleTransition("home", "home"))

        // Transition involving excluded route -> not eligible
        assertFalse(AdMobManager.recordEligibleTransition("home", "customer_login"))
        assertFalse(AdMobManager.recordEligibleTransition("scheme_join/123", "shop"))

        // Eligible transitions
        assertTrue(AdMobManager.recordEligibleTransition("home", "shop"))
        assertTrue(AdMobManager.recordEligibleTransition("shop", "settings"))
        assertTrue(AdMobManager.recordEligibleTransition("settings", "home"))
    }

    @Test
    fun testShouldShowInterstitial_RequiresTimeGapAndTransitionCount() {
        // Without preloaded ad, shouldShowInterstitial is false
        assertFalse(AdMobManager.shouldShowInterstitial(currentTimeMs = System.currentTimeMillis()))

        // 3 transitions recorded
        AdMobManager.recordEligibleTransition("home", "shop")
        AdMobManager.recordEligibleTransition("shop", "settings")
        AdMobManager.recordEligibleTransition("settings", "home")

        // Still false because no ad is loaded in test environment
        assertFalse(AdMobManager.shouldShowInterstitial(currentTimeMs = System.currentTimeMillis()))
    }
}
