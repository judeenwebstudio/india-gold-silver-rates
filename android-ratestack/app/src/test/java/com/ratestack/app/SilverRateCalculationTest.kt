package com.ratestack.app

import com.ratestack.app.data.normalizeSilverPerGram
import com.ratestack.app.data.silverValuePaise
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SilverRateCalculationTest {
    @Test fun source10gTo1g() = assertEquals("123.4500", normalizeSilverPerGram("1234.50")?.toPlainString())
    @Test fun supportedWeights() { mapOf(1 to 12345L,10 to 123450L,100 to 1234500L,500 to 6172500L,1000 to 12345000L).forEach { (g,p) -> assertEquals(p, silverValuePaise("123.45",g)) } }
    @Test fun decimalRounding() = assertEquals(12346L, silverValuePaise("123.4567",1))
    @Test fun invalidSource() { assertNull(normalizeSilverPerGram("bad")); assertNull(silverValuePaise("-1",10)) }
}
