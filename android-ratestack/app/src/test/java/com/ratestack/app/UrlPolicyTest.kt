package com.ratestack.app

import org.junit.Assert.assertEquals
import org.junit.Test

class UrlPolicyTest {
    private val policy = UrlPolicy("india-gold-silver-rates.vercel.app")

    @Test
    fun allowsOnlyExactTrustedHttpsHostInsideWebView() {
        assertEquals(
            NavigationDestination.INTERNAL,
            policy.classify("https://india-gold-silver-rates.vercel.app/cities/chennai"),
        )
        assertEquals(
            NavigationDestination.EXTERNAL_HTTPS,
            policy.classify("https://sub.india-gold-silver-rates.vercel.app/"),
        )
        assertEquals(
            NavigationDestination.BLOCKED,
            policy.classify("http://india-gold-silver-rates.vercel.app/"),
        )
    }

    @Test
    fun blocksEveryAdminPathCaseInsensitively() {
        listOf(
            "https://india-gold-silver-rates.vercel.app/admin",
            "https://india-gold-silver-rates.vercel.app/admin/",
            "https://india-gold-silver-rates.vercel.app/admin/login",
            "https://india-gold-silver-rates.vercel.app/ADMIN/dashboard",
            "https://india-gold-silver-rates.vercel.app/admin%2Fapi-logs",
        ).forEach { url ->
            assertEquals(NavigationDestination.ADMIN_BLOCKED, policy.classify(url))
        }
    }

    @Test
    fun handlesSupportedExternalActions() {
        assertEquals(NavigationDestination.EMAIL, policy.classify("mailto:help@example.com"))
        assertEquals(NavigationDestination.TELEPHONE, policy.classify("tel:+911234567890"))
        assertEquals(NavigationDestination.WHATSAPP, policy.classify("whatsapp://send?text=Hello"))
        assertEquals(NavigationDestination.WHATSAPP, policy.classify("https://wa.me/911234567890"))
    }

    @Test
    fun blocksUnsafeOrMalformedSchemes() {
        listOf(
            "javascript:alert(1)",
            "file:///data/data/example",
            "content://example/item",
            "intent://example",
            "not a url",
        ).forEach { url ->
            assertEquals(NavigationDestination.BLOCKED, policy.classify(url))
        }
    }
}
