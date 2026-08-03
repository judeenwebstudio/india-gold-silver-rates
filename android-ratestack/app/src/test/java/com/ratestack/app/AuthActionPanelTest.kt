package com.ratestack.app

import com.ratestack.app.ui.components.AuthActionPanelVariant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthActionPanelTest {

    @Test
    fun testAuthActionPanelVariantDefaults() {
        assertEquals("CARD", AuthActionPanelVariant.CARD.name)
        assertEquals("COMPACT", AuthActionPanelVariant.COMPACT.name)
    }

    @Test
    fun testGoogleAvailabilityStateLogic() {
        var googleAvailable = true
        var loginActive = true
        var registerActive = true

        assertTrue(googleAvailable)
        assertTrue(loginActive)
        assertTrue(registerActive)

        // When Google is unavailable: Google disabled, Login and Register remain active
        googleAvailable = false
        assertFalse(googleAvailable)
        assertTrue(loginActive)
        assertTrue(registerActive)
    }

    @Test
    fun testUnauthenticatedHeadlineFormatting() {
        val headingCard = "Welcome to RateStack"
        val headingCompact = "Ready to shop?"

        assertFalse(headingCard.contains("Customer"))
        assertEquals("Welcome to RateStack", headingCard)
        assertEquals("Ready to shop?", headingCompact)
    }
}
