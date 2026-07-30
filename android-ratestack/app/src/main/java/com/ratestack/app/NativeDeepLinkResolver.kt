package com.ratestack.app

import java.net.URI

internal sealed interface NativeDestination {
    data object Home : NativeDestination
    data object Shop : NativeDestination
    data class External(val url: String) : NativeDestination
}

internal class NativeDeepLinkResolver(
    private val trustedHost: String,
) {
    private val policy = UrlPolicy(trustedHost)

    fun resolve(rawUrl: String): NativeDestination {
        return when (policy.classify(rawUrl)) {
            NavigationDestination.EXTERNAL_HTTPS -> NativeDestination.External(rawUrl)
            NavigationDestination.INTERNAL -> parseInternal(rawUrl)
            else -> NativeDestination.Home
        }
    }

    private fun parseInternal(rawUrl: String): NativeDestination {
        val uri = runCatching { URI(rawUrl) }.getOrNull() ?: return NativeDestination.Home
        val segments = uri.path.orEmpty().trim('/').split('/').filter(String::isNotBlank)
        return when (segments.firstOrNull()?.lowercase()) {
            "state", "city", "cities", "gold-rate", "silver-rate" -> NativeDestination.Shop
            "shop" -> NativeDestination.Shop
            else -> NativeDestination.Home
        }
    }
}
