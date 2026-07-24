package com.ratestack.app

import java.net.URI

internal sealed interface NativeDestination {
    data object Home : NativeDestination
    data class State(val slug: String) : NativeDestination
    data class Rate(val stateSlug: String, val citySlug: String) : NativeDestination
    data class CityLookup(val citySlug: String) : NativeDestination
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
            "state" -> segments.getOrNull(1)?.let(NativeDestination::State) ?: NativeDestination.Home
            "city" -> when {
                segments.size >= 3 -> NativeDestination.Rate(segments[1], segments[2])
                segments.size == 2 -> NativeDestination.CityLookup(segments[1])
                else -> NativeDestination.Home
            }
            "gold-rate", "silver-rate" -> if (segments.size >= 3) {
                NativeDestination.Rate(segments[1], segments[2])
            } else NativeDestination.Home
            else -> NativeDestination.Home
        }
    }
}
