package com.ratestack.app

import org.junit.Assert.assertEquals
import org.junit.Test

class NotificationLinkRouterTest {
    private val router = NotificationLinkRouter(
        UrlPolicy("india-gold-silver-rates.vercel.app"),
    )

    @Test
    fun keepsTrustedPublicUrlsInsideTheApp() {
        assertEquals(
            NotificationLinkTarget.INTERNAL,
            router.resolve("https://india-gold-silver-rates.vercel.app/city/chennai"),
        )
    }

    @Test
    fun sendsExternalHttpsUrlsOutsideTheApp() {
        assertEquals(
            NotificationLinkTarget.EXTERNAL_HTTPS,
            router.resolve("https://example.com/latest"),
        )
    }

    @Test
    fun sendsAdminAndUnsafeUrlsToHome() {
        listOf(
            "https://india-gold-silver-rates.vercel.app/admin",
            "https://india-gold-silver-rates.vercel.app/admin/api-logs",
            "http://india-gold-silver-rates.vercel.app/city/chennai",
            "javascript:alert(1)",
            null,
        ).forEach { url ->
            assertEquals(NotificationLinkTarget.HOME, router.resolve(url))
        }
    }

    @Test
    fun routesOrderAndTrackingNotifications() {
        assertEquals("/shop/orders?orderId=order_123", router.routeData("ORDER", "order_123", "false", null))
        assertEquals("/shop/orders?orderId=order_123&tracking=true", router.routeData("TRACKING", "order_123", "true", null))
    }

    @Test
    fun routesMetalAlerts() {
        assertEquals("/gold-rate", router.routeData("RATE", null, null, "GOLD"))
        assertEquals("/silver-rate", router.routeData("RATE", null, null, "SILVER"))
    }

    @Test
    fun invalidOrMissingNotificationDataFallsBackSafely() {
        assertEquals("/shop/orders", router.routeData("ORDER", "../admin", "false", null))
        assertEquals("/shop/orders", router.routeData("UNKNOWN", null, null, null))
    }
}
