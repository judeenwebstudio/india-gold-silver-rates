package com.ratestack.app

import org.junit.Assert.assertEquals
import org.junit.Test

class AuthNormalizationTest {
    private fun normalizePhoneNumber(phone: String): String {
        var digits = phone.replace(Regex("\\D"), "")
        if (digits.length == 12 && digits.startsWith("91")) {
            digits = digits.substring(2)
        } else if (digits.length == 11 && digits.startsWith("0")) {
            digits = digits.substring(1)
        }
        return digits
    }

    @Test
    fun testMobileNumberNormalization() {
        assertEquals("9876543210", normalizePhoneNumber("+91 98765 43210"))
        assertEquals("9876543210", normalizePhoneNumber("919876543210"))
        assertEquals("9876543210", normalizePhoneNumber("98765-43210"))
        assertEquals("9876543210", normalizePhoneNumber(" 9876543210 "))
        assertEquals("9876543210", normalizePhoneNumber("09876543210"))
    }
}
