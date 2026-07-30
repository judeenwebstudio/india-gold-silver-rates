package com.ratestack.app

import com.ratestack.app.ui.shop.displayStatus
import org.junit.Assert.assertEquals
import org.junit.Test

class OrderStatusDisplayTest {
    @Test fun mapsBackendStatusesForCustomers() {
        assertEquals("Out for delivery", displayStatus("OUT_FOR_DELIVERY"))
        assertEquals("Refund pending", displayStatus("REFUND_PENDING"))
        assertEquals(null, displayStatus(null))
    }
}
