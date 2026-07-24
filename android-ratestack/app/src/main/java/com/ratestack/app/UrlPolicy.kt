package com.ratestack.app

import java.net.URI

internal enum class NavigationDestination {
    INTERNAL,
    ADMIN_BLOCKED,
    EXTERNAL_HTTPS,
    EMAIL,
    TELEPHONE,
    WHATSAPP,
    BLOCKED,
}

internal class UrlPolicy(
    trustedHost: String,
) {
    private val trustedHost = trustedHost.lowercase().trim()

    fun classify(rawUrl: String): NavigationDestination {
        val uri = runCatching { URI(rawUrl.trim()) }.getOrNull()
            ?: return NavigationDestination.BLOCKED
        val scheme = uri.scheme?.lowercase() ?: return NavigationDestination.BLOCKED

        return when (scheme) {
            "mailto" -> NavigationDestination.EMAIL
            "tel" -> NavigationDestination.TELEPHONE
            "whatsapp" -> NavigationDestination.WHATSAPP
            "https" -> classifyHttps(uri)
            else -> NavigationDestination.BLOCKED
        }
    }

    private fun classifyHttps(uri: URI): NavigationDestination {
        val host = uri.host?.lowercase() ?: return NavigationDestination.BLOCKED
        if (host == "wa.me" || host == "api.whatsapp.com" || host == "www.wa.me") {
            return NavigationDestination.WHATSAPP
        }
        if (host != trustedHost) {
            return NavigationDestination.EXTERNAL_HTTPS
        }

        val normalizedPath = (uri.path ?: "/")
            .replace(Regex("/+"), "/")
            .lowercase()
        return if (normalizedPath == "/admin" || normalizedPath.startsWith("/admin/")) {
            NavigationDestination.ADMIN_BLOCKED
        } else {
            NavigationDestination.INTERNAL
        }
    }
}
