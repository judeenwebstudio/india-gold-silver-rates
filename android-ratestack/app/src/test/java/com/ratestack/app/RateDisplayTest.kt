package com.ratestack.app

import com.ratestack.app.ui.shop.formatRateDate
import com.ratestack.app.ui.shop.friendlyRateSource
import org.junit.Assert.assertEquals
import org.junit.Test

class RateDisplayTest {
    @Test
    fun providerNamesAreCustomerFriendly() {
        assertEquals("GoodReturns Trichy", friendlyRateSource("GOODRETURNS"))
        assertEquals("IBJA reference", friendlyRateSource("IBJA"))
        assertEquals("Previous verified rate", friendlyRateSource(null))
    }

    @Test
    fun utcRateDateIsDisplayedInIndiaTime() {
        assertEquals("31 Jul 2026, 5:30 AM", formatRateDate("2026-07-31T00:00:00Z"))
        assertEquals("Latest verified rate", formatRateDate(null))
    }
}
