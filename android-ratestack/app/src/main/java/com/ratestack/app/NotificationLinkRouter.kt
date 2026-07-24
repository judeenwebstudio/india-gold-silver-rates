package com.ratestack.app

internal enum class NotificationLinkTarget {
    INTERNAL,
    EXTERNAL_HTTPS,
    HOME,
}

internal class NotificationLinkRouter(
    private val urlPolicy: UrlPolicy,
) {
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
