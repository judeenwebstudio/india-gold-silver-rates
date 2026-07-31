package com.ratestack.app

import com.google.gson.Gson
import com.ratestack.app.data.ApiEnvelope
import com.ratestack.app.data.CityOption
import com.ratestack.app.data.FavoriteCity
import com.ratestack.app.data.HomeData
import com.ratestack.app.data.Location
import com.ratestack.app.data.PreferencesStore
import com.ratestack.app.data.RateDetails
import com.ratestack.app.data.RatesDataSource
import com.ratestack.app.data.RepositoryResult
import com.ratestack.app.data.SourceInfo
import com.ratestack.app.data.StateOption
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

import com.ratestack.app.data.AppThemeMode

class NativeDataTest {
    @Test
    fun parsesVerifiedHomeEnvelopeFields() {
        val json = """{"success":true,"data":{"latestGoldRates":[{"purity":"22K","pricePerGram":13245.8,"previousPricePerGram":13333.0,"change":-87.2,"changePercent":-0.65,"currency":"INR"}],"latestSilverRate":{"purity":"999","pricePerGram":222.48,"pricePerKilogram":222480.0,"previousPricePerGram":225.82,"changePerGram":-3.34,"changePercent":-1.48,"currency":"INR"},"lastUpdated":"2026-07-23T13:18:00.814Z","source":{"name":"IBJA","timestamp":"2026-07-23T12:30:00.000Z"},"featuredCities":[]},"meta":{"apiVersion":"v1"}}"""
        val envelope = Gson().fromJson(json, ApiEnvelope::class.java)
        assertTrue(envelope.success)
        assertEquals("v1", envelope.meta?.apiVersion)
    }

    @Test
    fun viewModelExposesRepositorySuccess() = runBlocking {
        Dispatchers.setMain(Dispatchers.Unconfined)
        val home = HomeData(emptyList(), com.ratestack.app.data.SilverRate("999", 222.0, 222000.0, 2220.0, null, null, null, "INR"), "2026-07-23T13:18:00.814Z", SourceInfo("IBJA", "2026-07-23T12:30:00.000Z"), emptyList())
        val viewModel = RateStackViewModel(FakeSource(home), FakeStore())
        viewModel.refreshHome().join()
        assertTrue(viewModel.home.value is LoadState.Ready)
        assertEquals(home.lastUpdated, (viewModel.home.value as LoadState.Ready).data.lastUpdated)
        Dispatchers.resetMain()
    }

    @Test
    fun viewModelHandlesThemeModeChange() = runBlocking {
        Dispatchers.setMain(Dispatchers.Unconfined)
        val home = HomeData(emptyList(), com.ratestack.app.data.SilverRate("999", 222.0, 222000.0, 2220.0, null, null, null, "INR"), "2026-07-23T13:18:00.814Z", SourceInfo("IBJA", "2026-07-23T12:30:00.000Z"), emptyList())
        val store = FakeStore()
        val viewModel = RateStackViewModel(FakeSource(home), store)
        assertEquals(AppThemeMode.SYSTEM, viewModel.themeMode.value)
        viewModel.setThemeMode(AppThemeMode.DARK)
        assertEquals(AppThemeMode.DARK, viewModel.themeMode.value)
        assertEquals(AppThemeMode.DARK, store.currentTheme)
        Dispatchers.resetMain()
    }

    @Test
    fun selectedSilverWeightPreferencePersists() = runBlocking {
        val store = FakeStore()
        assertEquals(10, store.readSilverWeight())
        store.saveSilverWeight(500)
        assertEquals(500, store.readSilverWeight())
    }

    private class FakeSource(private val homeData: HomeData) : RatesDataSource {
        override suspend fun home() = RepositoryResult.Success(homeData)
        override suspend fun states() = RepositoryResult.Success(emptyList<StateOption>())
        override suspend fun cities() = RepositoryResult.Success(emptyList<CityOption>())
        override suspend fun rates(state: String, city: String) = RepositoryResult.Failure("not used")
    }

    private class FakeStore : PreferencesStore {
        var currentTheme = AppThemeMode.SYSTEM
        var silverWeight = 10
        override suspend fun saveSelection(stateSlug: String, citySlug: String) = Unit
        override suspend fun readSelection() = null to null
        override suspend fun readFavorites() = emptyList<FavoriteCity>()
        override suspend fun saveFavorites(favorites: List<FavoriteCity>) = Unit
        override suspend fun notificationsEnabled() = true
        override suspend fun setNotificationsEnabled(enabled: Boolean) = Unit
        override suspend fun readThemeMode() = currentTheme
        override suspend fun setThemeMode(mode: AppThemeMode) { currentTheme = mode }
        override suspend fun saveHome(home: HomeData) = Unit
        override suspend fun readHome() = null
        override suspend fun saveRateDetails(details: RateDetails) = Unit
        override suspend fun readRateDetails(state: String, city: String) = null
        override suspend fun clearCache() = Unit
        override suspend fun readSilverWeight() = silverWeight
        override suspend fun saveSilverWeight(grams: Int) { silverWeight = grams }
    }
}
