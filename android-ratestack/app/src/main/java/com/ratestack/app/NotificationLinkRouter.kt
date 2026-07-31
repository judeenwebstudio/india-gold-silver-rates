package com.ratestack.app

internal enum class NotificationLinkTarget {
    INTERNAL,
    EXTERNAL_HTTPS,
    HOME,
}

internal class NotificationLinkRouter(
    private val urlPolicy: UrlPolicy,
) {
    fun routeData(
        destination: String?,
        orderId: String?,
        tracking: String?,
        metal: String?,
    ): String {
        val safeOrderId = orderId?.takeIf { it.matches(Regex("^[A-Za-z0-9_-]{5,80}$")) }
        return when (destination?.uppercase()) {
            "ORDER" -> safeOrderId?.let { "/shop/orders?orderId=$it" } ?: "/shop/orders"
            "TRACKING" -> safeOrderId?.let { "/shop/orders?orderId=$it&tracking=true" } ?: "/shop/orders"
            "RATE" -> when (metal?.uppercase()) {
                "GOLD" -> "/gold-rate"
                "SILVER" -> "/silver-rate"
                else -> "/"
            }
            "DASHBOARD" -> "/shop/orders"
            else -> if (tracking == "true" && safeOrderId != null) {
                "/shop/orders?orderId=$safeOrderId&tracking=true"
            } else {
                "/shop/orders"
            }
        }
    }

    fun resolve(rawUrl: String?): NotificationLinkTarget {
        if (rawUrl.isNullOrBlank()) {
            return NotificationLinkTarget.HOME
        }

        return when (urlPolicy.classify(rawUrl)) {
            NavigationDestination.INTERNAL -> NotificationLinkTarget.INTERNAL
            NavigationDestination.EXTERNAL_HTTPS -> NotificationLinkTarget.EXTERNAL_HTTPS
            NavigationDestination.WHATSAPP -> {
                if (rawUrl.trim().startsWith("https://", ignoreCase = true)) {
                    NotificationLinkTarget.EXTERNAL_HTTPS
                } else {
                    NotificationLinkTarget.HOME
                }
            }
            else -> NotificationLinkTarget.HOME
        }
    }
}
