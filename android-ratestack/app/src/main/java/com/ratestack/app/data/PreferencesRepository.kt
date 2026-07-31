package com.ratestack.app.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.first

private val Context.rateStackDataStore by preferencesDataStore(name = "ratestack_preferences")

enum class AppThemeMode { SYSTEM, LIGHT, DARK }

interface PreferencesStore {
    suspend fun saveSelection(stateSlug: String, citySlug: String)
    suspend fun readSelection(): Pair<String?, String?>
    suspend fun readFavorites(): List<FavoriteCity>
    suspend fun saveFavorites(favorites: List<FavoriteCity>)
    suspend fun notificationsEnabled(): Boolean
    suspend fun setNotificationsEnabled(enabled: Boolean)
    suspend fun readThemeMode(): AppThemeMode
    suspend fun setThemeMode(mode: AppThemeMode)
    suspend fun saveHome(home: HomeData)
    suspend fun readHome(): HomeData?
    suspend fun saveRateDetails(details: RateDetails)
    suspend fun readRateDetails(state: String, city: String): RateDetails?
    suspend fun clearCache()
    suspend fun readSilverWeight(): Int
    suspend fun saveSilverWeight(grams: Int)
}

class PreferencesRepository(
    private val context: Context,
    private val gson: Gson = Gson(),
) : PreferencesStore {
    private val selectedStateKey = stringPreferencesKey("selected_state")
    private val selectedCityKey = stringPreferencesKey("selected_city")
    private val favoritesKey = stringPreferencesKey("favorite_cities")
    private val notificationsKey = booleanPreferencesKey("notifications_enabled")
    private val themeModeKey = stringPreferencesKey("theme_mode")
    private val homeCacheKey = stringPreferencesKey("cache_home")
    private val silverWeightKey = intPreferencesKey("silver_weight_grams")

    override suspend fun readSilverWeight(): Int {
        val saved = context.rateStackDataStore.data.first()[silverWeightKey] ?: DEFAULT_SILVER_WEIGHT_GRAMS
        return if (saved in SILVER_WEIGHT_OPTIONS) saved else DEFAULT_SILVER_WEIGHT_GRAMS
    }

    override suspend fun saveSilverWeight(grams: Int) {
        require(grams in SILVER_WEIGHT_OPTIONS)
        context.rateStackDataStore.edit { it[silverWeightKey] = grams }
    }

    override suspend fun saveSelection(stateSlug: String, citySlug: String) {
        context.rateStackDataStore.edit {
            it[selectedStateKey] = stateSlug
            it[selectedCityKey] = citySlug
        }
    }

    override suspend fun readSelection(): Pair<String?, String?> {
        val preferences = context.rateStackDataStore.data.first()
        return preferences[selectedStateKey] to preferences[selectedCityKey]
    }

    override suspend fun readFavorites(): List<FavoriteCity> {
        val raw = context.rateStackDataStore.data.first()[favoritesKey] ?: return emptyList()
        val type = object : TypeToken<List<FavoriteCity>>() {}.type
        return runCatching { gson.fromJson<List<FavoriteCity>>(raw, type) }.getOrNull().orEmpty()
    }

    override suspend fun saveFavorites(favorites: List<FavoriteCity>) {
        context.rateStackDataStore.edit { it[favoritesKey] = gson.toJson(favorites) }
    }

    override suspend fun notificationsEnabled(): Boolean =
        context.rateStackDataStore.data.first()[notificationsKey] ?: true

    override suspend fun setNotificationsEnabled(enabled: Boolean) {
        context.rateStackDataStore.edit { it[notificationsKey] = enabled }
    }

    override suspend fun readThemeMode(): AppThemeMode {
        val raw = context.rateStackDataStore.data.first()[themeModeKey] ?: return AppThemeMode.SYSTEM
        return runCatching { AppThemeMode.valueOf(raw) }.getOrDefault(AppThemeMode.SYSTEM)
    }

    override suspend fun setThemeMode(mode: AppThemeMode) {
        context.rateStackDataStore.edit { it[themeModeKey] = mode.name }
    }

    override suspend fun saveHome(home: HomeData) {
        context.rateStackDataStore.edit { it[homeCacheKey] = gson.toJson(home) }
    }

    override suspend fun readHome(): HomeData? = context.rateStackDataStore.data.first()[homeCacheKey]
        ?.let { runCatching { gson.fromJson(it, HomeData::class.java) }.getOrNull() }

    override suspend fun saveRateDetails(details: RateDetails) {
        val key = rateCacheKey(details.state.slug, details.city.slug)
        context.rateStackDataStore.edit { it[stringPreferencesKey(key)] = gson.toJson(details) }
    }

    override suspend fun readRateDetails(state: String, city: String): RateDetails? {
        val raw = context.rateStackDataStore.data.first()[stringPreferencesKey(rateCacheKey(state, city))]
        return raw?.let { runCatching { gson.fromJson(it, RateDetails::class.java) }.getOrNull() }
    }

    override suspend fun clearCache() {
        context.rateStackDataStore.edit { preferences ->
            preferences.asMap().keys.filter { it.name.startsWith("cache_") }.forEach { key ->
                @Suppress("UNCHECKED_CAST")
                preferences.remove(key as Preferences.Key<Any>)
            }
        }
    }

    private fun rateCacheKey(state: String, city: String) = "cache_rate_${state}_$city"
}

data class FavoriteCity(
    val stateSlug: String,
    val citySlug: String,
    val stateName: String,
    val cityName: String,
)
