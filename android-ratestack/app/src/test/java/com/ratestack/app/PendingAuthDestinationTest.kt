package com.ratestack.app

import com.ratestack.app.data.AuthDestinationType
import com.ratestack.app.data.PendingAuthDestination
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PendingAuthDestinationTest {
    @Test fun shopAndDashboardDestinationsAreTyped() {
        assertEquals(AuthDestinationType.SHOP, PendingAuthDestination(AuthDestinationType.SHOP).type)
        assertEquals(AuthDestinationType.DASHBOARD, PendingAuthDestination(AuthDestinationType.DASHBOARD).type)
    }

    @Test fun checkoutRequiresACompleteValidSelection() {
        assertTrue(PendingAuthDestination.checkout("silver", 10.0, 2).validCheckout())
        assertFalse(PendingAuthDestination.checkout("", 10.0, 2).validCheckout())
        assertFalse(PendingAuthDestination.checkout("silver", 10.0, 11).validCheckout())
    }
}
