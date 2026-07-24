package com.ratestack.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ratestack.app.data.CityOption
import com.ratestack.app.data.FavoriteCity
import com.ratestack.app.data.HomeData
import com.ratestack.app.data.PreferencesStore
import com.ratestack.app.data.RateDetails
import com.ratestack.app.data.RatesDataSource
import com.ratestack.app.data.RepositoryResult
import com.ratestack.app.data.StateOption
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface LoadState<out T> {
    data object Loading : LoadState<Nothing>
    data class Ready<T>(val data: T, val fromCache: Boolean = false, val warning: String? = null) : LoadState<T>
    data class Error(val message: String, val retryable: Boolean = true) : LoadState<Nothing>
}

class RateStackViewModel(
    private val repository: RatesDataSource,
    private val preferences: PreferencesStore,
) : ViewModel() {
    private val _home = MutableStateFlow<LoadState<HomeData>>(LoadState.Loading)
    val home: StateFlow<LoadState<HomeData>> = _home.asStateFlow()
    private val _states = MutableStateFlow<LoadState<List<StateOption>>>(LoadState.Loading)
    val states: StateFlow<LoadState<List<StateOption>>> = _states.asStateFlow()
    private val _cities = MutableStateFlow<LoadState<List<CityOption>>>(LoadState.Loading)
    val cities: StateFlow<LoadState<List<CityOption>>> = _cities.asStateFlow()
    private val _rates = MutableStateFlow<LoadState<RateDetails>?>(null)
    val rates: StateFlow<LoadState<RateDetails>?> = _rates.asStateFlow()
    private val _favorites = MutableStateFlow<List<FavoriteCity>>(emptyList())
    val favorites: StateFlow<List<FavoriteCity>> = _favorites.asStateFlow()
    private val _selection = MutableStateFlow<Pair<String?, String?>>(null to null)
    val selection: StateFlow<Pair<String?, String?>> = _selection.asStateFlow()

    init {
        refreshHome()
        loadFavorites()
        loadSelection()
    }

    fun refreshHome() = launchLoad(_home) { repository.home() }

    fun loadLocations() {
        if (_states.value is LoadState.Ready && _cities.value is LoadState.Ready) return
        viewModelScope.launch {
            _states.value = LoadState.Loading
            _cities.value = LoadState.Loading
            val stateResult = repository.states()
            val cityResult = repository.cities()
            _states.value = stateResult.toLoadState()
            _cities.value = cityResult.toLoadState()
        }
    }

    fun loadRates(state: String, city: String) {
        _rates.value = LoadState.Loading
        viewModelScope.launch {
            _rates.value = repository.rates(state, city).toLoadState()
        }
    }

    fun select(state: String, city: String) {
        _selection.value = state to city
        viewModelScope.launch { preferences.saveSelection(state, city) }
    }

    fun toggleFavorite(city: FavoriteCity) {
        viewModelScope.launch {
            val current = _favorites.value.toMutableList()
            val index = current.indexOfFirst { it.stateSlug == city.stateSlug && it.citySlug == city.citySlug }
            if (index >= 0) current.removeAt(index) else current.add(city)
            _favorites.value = current
            preferences.saveFavorites(current)
        }
    }

    fun removeFavorite(city: FavoriteCity) = toggleFavorite(city)

    fun moveFavorite(index: Int, direction: Int) {
        val target = index + direction
        if (index !in _favorites.value.indices || target !in _favorites.value.indices) return
        viewModelScope.launch {
            val current = _favorites.value.toMutableList()
            current[index] = current[target].also { current[target] = current[index] }
            _favorites.value = current
            preferences.saveFavorites(current)
        }
    }

    fun setNotifications(enabled: Boolean) {
        viewModelScope.launch { preferences.setNotificationsEnabled(enabled) }
    }

    fun clearCache() {
        viewModelScope.launch { preferences.clearCache() }
    }

    private fun loadFavorites() = viewModelScope.launch { _favorites.value = preferences.readFavorites() }
    private fun loadSelection() = viewModelScope.launch { _selection.value = preferences.readSelection() }

    private fun <T> launchLoad(
        state: MutableStateFlow<LoadState<T>>,
        request: suspend () -> RepositoryResult<T>,
    ) = viewModelScope.launch {
        state.value = LoadState.Loading
        state.value = request().toLoadState()
    }
}

private fun <T> RepositoryResult<T>.toLoadState(): LoadState<T> = when (this) {
    is RepositoryResult.Success -> LoadState.Ready(data, fromCache, warning)
    is RepositoryResult.Failure -> LoadState.Error(message, retryable)
}
