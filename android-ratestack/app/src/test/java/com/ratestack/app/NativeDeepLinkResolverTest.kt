package com.ratestack.app

import org.junit.Assert.assertEquals
import org.junit.Test

class NativeDeepLinkResolverTest {
    private val resolver = NativeDeepLinkResolver("india-gold-silver-rates.vercel.app")

    @Test
    fun redirectsLegacyCityAndRateLinksToShop() {
        assertEquals(NativeDestination.Shop, resolver.resolve("https://india-gold-silver-rates.vercel.app/state/tamil-nadu"))
        assertEquals(NativeDestination.Shop, resolver.resolve("https://india-gold-silver-rates.vercel.app/gold-rate/tamil-nadu/chennai"))
        assertEquals(NativeDestination.Shop, resolver.resolve("https://india-gold-silver-rates.vercel.app/city/chennai"))
        assertEquals(NativeDestination.Shop, resolver.resolve("https://india-gold-silver-rates.vercel.app/cities"))
    }

    @Test
    fun blocksAdminAndRoutesExternalLinksOut() {
        assertEquals(NativeDestination.Home, resolver.resolve("https://india-gold-silver-rates.vercel.app/admin/api-logs"))
        assertEquals(NativeDestination.External("https://example.com"), resolver.resolve("https://example.com"))
    }
}
