package com.ratestack.app

import android.content.Context
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SmallTopAppBar
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberTopAppBarState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.Image
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material.ExperimentalMaterialApi
import com.ratestack.app.data.ApiProvider
import com.ratestack.app.data.CityOption
import com.ratestack.app.data.FavoriteCity
import com.ratestack.app.data.PreferencesRepository
import com.ratestack.app.data.PreferencesStore
import com.ratestack.app.data.RateDetails
import com.ratestack.app.data.RateRepository
import com.ratestack.app.data.StateOption
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.TimeZone
import java.util.Locale

private object Routes {
    const val HOME = "home"
    const val STATES = "states"
    const val CITIES = "cities/{state}"
    const val RATES = "rates/{state}/{city}"
    const val FAVORITES = "favorites"
    const val SETTINGS = "settings"
}

@Composable
fun RateStackApp(
    initialUrl: String?,
    onOpenExternal: (String) -> Unit,
    onShare: (String) -> Unit,
    onRateApp: () -> Unit,
) {
    val context = LocalContext.current
    val preferences = remember { PreferencesRepository(context.applicationContext) }
    val repository = remember { RateRepository(ApiProvider.service, preferences) }
    val viewModel: RateStackViewModel = viewModel(
        factory = remember { RateStackViewModelFactory(repository, preferences) },
    )
    val navController = rememberNavController()
    var splashVisible by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) { kotlinx.coroutines.delay(700); splashVisible = false }
    val citiesForLink by viewModel.cities.collectAsState()
    LaunchedEffect(initialUrl, citiesForLink) {
        if (!initialUrl.isNullOrBlank()) navigateLink(navController, initialUrl, citiesForLink, viewModel)
    }

    if (splashVisible) {
        SplashScreen()
        return
    }

    val selection by viewModel.selection.collectAsState()
    LaunchedEffect(selection) {
        val (state, city) = selection
        if (!state.isNullOrBlank() && !city.isNullOrBlank()) viewModel.loadRates(state, city)
    }

    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    Scaffold(
        topBar = { AppTopBar(currentRoute, navController) },
        bottomBar = {
            NavigationBar {
                BottomItem(Routes.HOME, "Home", Icons.Default.Home, currentRoute, navController)
                BottomItem(Routes.FAVORITES, "Favorites", Icons.Default.Favorite, currentRoute, navController)
                BottomItem(Routes.SETTINGS, "Settings", Icons.Default.Settings, currentRoute, navController)
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Routes.HOME,
            modifier = Modifier.padding(padding),
        ) {
            composable(Routes.HOME) {
                val home by viewModel.home.collectAsState()
                val rates by viewModel.rates.collectAsState()
                HomeScreen(home, rates, selection, viewModel, navController, onShare)
            }
            composable(Routes.STATES) {
                val states by viewModel.states.collectAsState()
                LaunchedEffect(Unit) { viewModel.loadLocations() }
                StateSelectionScreen(states) { state ->
                    navController.navigate("cities/${state.slug}")
                }
            }
            composable(
                Routes.CITIES,
                arguments = listOf(navArgument("state") { type = NavType.StringType }),
            ) { entry ->
                val stateSlug = entry.arguments?.getString("state").orEmpty()
                val cities by viewModel.cities.collectAsState()
                val states by viewModel.states.collectAsState()
                LaunchedEffect(Unit) { viewModel.loadLocations() }
                CitySelectionScreen(stateSlug, states, cities) { city ->
                    viewModel.select(city.state.slug, city.slug)
                    navController.navigate("rates/${city.state.slug}/${city.slug}")
                }
            }
            composable(
                Routes.RATES,
                arguments = listOf(
                    navArgument("state") { type = NavType.StringType },
                    navArgument("city") { type = NavType.StringType },
                ),
            ) { entry ->
                val state = entry.arguments?.getString("state").orEmpty()
                val city = entry.arguments?.getString("city").orEmpty()
                LaunchedEffect(state, city) { viewModel.loadRates(state, city) }
                val rates by viewModel.rates.collectAsState()
                val favorites by viewModel.favorites.collectAsState()
                RateDetailsScreen(rates, favorites, viewModel, onShare)
            }
            composable(Routes.FAVORITES) {
                val favorites by viewModel.favorites.collectAsState()
                FavoritesScreen(favorites, viewModel, navController)
            }
            composable(Routes.SETTINGS) {
                SettingsScreen(viewModel, onOpenExternal, onShare, onRateApp)
            }
        }
    }
}

@Composable
private fun SplashScreen() {
    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxSize(), Arrangement.Center, Alignment.CenterHorizontally) {
            Image(painterResource(R.drawable.ratestack_logo), "RateStack logo", Modifier.size(120.dp))
            Text("RateStack", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("Gold & Silver Rates", style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(24.dp))
            CircularProgressIndicator(modifier = Modifier.size(28.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppTopBar(route: String?, navController: NavHostController) {
    val isRoot = route == Routes.HOME || route == Routes.FAVORITES || route == Routes.SETTINGS
    SmallTopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(R.drawable.ratestack_logo), "RateStack logo", Modifier.size(32.dp))
                Spacer(Modifier.width(8.dp))
                Text(if (route == Routes.HOME) "RateStack" else routeTitle(route))
            }
        },
        navigationIcon = {
            if (!isRoot) IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.Default.ArrowBack, "Back")
            } else {
                Icon(Icons.Default.Menu, contentDescription = "RateStack menu")
            }
        },
        colors = TopAppBarDefaults.smallTopAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
        scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior(rememberTopAppBarState()),
    )
}

@Composable
private fun RowScope.BottomItem(
    route: String,
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    currentRoute: String?,
    navController: NavHostController,
) {
    NavigationBarItem(
        selected = currentRoute == route,
        onClick = { navController.navigate(route) { popUpTo(Routes.HOME); launchSingleTop = true } },
        icon = { Icon(icon, contentDescription = label) },
        label = { Text(label) },
    )
}

@OptIn(ExperimentalMaterialApi::class)
@Composable
private fun HomeScreen(
    home: LoadState<com.ratestack.app.data.HomeData>,
    rates: LoadState<RateDetails>?,
    selection: Pair<String?, String?>,
    viewModel: RateStackViewModel,
    navController: NavHostController,
    onShare: (String) -> Unit,
) {
    val isRefreshing = home is LoadState.Loading
    val refreshState = rememberPullRefreshState(isRefreshing, viewModel::refreshHome)
    Box(Modifier.fillMaxSize().pullRefresh(refreshState)) {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text("Today's rates", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("Indicative prices in INR", style = MaterialTheme.typography.bodyMedium)
            }
            when {
                rates is LoadState.Ready -> {
                    item { Text("${rates.data.city.name} · ${rates.data.state.name}", style = MaterialTheme.typography.titleMedium) }
                    items(rates.data.goldRates) { RateCard(it.purity + " Gold", it.pricePerGram, it.change, it.changePercent) }
                    item { SilverCard(rates.data.silverRate) }
                    item { LastUpdated(rates.data.lastUpdated, rates.data.source.name, rates.fromCache) }
                }
                home is LoadState.Ready -> {
                    items(home.data.latestGoldRates) { RateCard(it.purity + " Gold", it.pricePerGram, it.change, it.changePercent) }
                    item { SilverCard(home.data.latestSilverRate) }
                    item { LastUpdated(home.data.lastUpdated, home.data.source.name, home.fromCache) }
                    item { Text("Choose a city for indicative local rates", style = MaterialTheme.typography.bodyMedium) }
                }
                home is LoadState.Error -> item { ErrorPanel(home.message, home.retryable, viewModel::refreshHome) }
                else -> item { LoadingPanel() }
            }
            item {
                LocationCard(selection, navController)
            }
            if (home is LoadState.Ready && home.data.featuredCities.isNotEmpty()) {
                item { Text("Featured cities", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
                items(home.data.featuredCities) { city ->
                    OutlinedCard(Modifier.fillMaxWidth().clickable { navController.navigate("rates/${city.state.slug}/${city.slug}") }) {
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, contentDescription = null)
                            Spacer(Modifier.width(10.dp)); Text("${city.name}, ${city.state.name}")
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(12.dp)) }
        }
        PullRefreshIndicator(isRefreshing, refreshState, Modifier.align(Alignment.TopCenter))
    }
}

@Composable
private fun LocationCard(selection: Pair<String?, String?>, navController: NavHostController) {
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
        Column(Modifier.padding(16.dp)) {
            Text("Your location", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(if (selection.first == null) "Select a state and city" else "City selection saved", style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(8.dp))
            Button(onClick = { navController.navigate(Routes.STATES) }) { Text("Choose city") }
        }
    }
}

@Composable
private fun StateSelectionScreen(states: LoadState<List<StateOption>>, onSelect: (StateOption) -> Unit) {
    var query by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        SearchField(query, "Search states") { query = it }
        Spacer(Modifier.height(8.dp))
        when (states) {
            is LoadState.Ready -> LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                items(states.data.filter { it.name.contains(query, true) }) { state ->
                    ListRow("${state.name} (${state.cityCount})", state.code) { onSelect(state) }
                }
            }
            is LoadState.Error -> ErrorPanel(states.message, states.retryable, null)
            else -> LoadingPanel()
        }
    }
}

@Composable
private fun CitySelectionScreen(
    stateSlug: String,
    states: LoadState<List<StateOption>>,
    cities: LoadState<List<CityOption>>,
    onSelect: (CityOption) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    val stateName = (states as? LoadState.Ready)?.data?.firstOrNull { it.slug == stateSlug }?.name ?: stateSlug
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text(stateName, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        SearchField(query, "Search cities") { query = it }
        Spacer(Modifier.height(8.dp))
        when (cities) {
            is LoadState.Ready -> LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                items(cities.data.filter { it.state.slug == stateSlug && it.name.contains(query, true) }) { city ->
                    ListRow(city.name, city.state.name) { onSelect(city) }
                }
            }
            is LoadState.Error -> ErrorPanel(cities.message, cities.retryable, null)
            else -> LoadingPanel()
        }
    }
}

@Composable
private fun RateDetailsScreen(
    state: LoadState<RateDetails>?,
    favorites: List<FavoriteCity>,
    viewModel: RateStackViewModel,
    onShare: (String) -> Unit,
) {
    when (state) {
        is LoadState.Ready -> {
            val details = state.data
            val favorite = favorites.any { it.stateSlug == details.state.slug && it.citySlug == details.city.slug }
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column { Text(details.city.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold); Text(details.state.name) }
                        Row {
                            IconButton(onClick = { viewModel.toggleFavorite(FavoriteCity(details.state.slug, details.city.slug, details.state.name, details.city.name)) }) {
                                Icon(if (favorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder, contentDescription = if (favorite) "Remove favorite" else "Add favorite")
                            }
                            IconButton(onClick = { onShare("${details.city.name} rates: ${details.goldRates.firstOrNull { it.purity == "22K" }?.pricePerGram ?: "-"} INR/g") }) { Icon(Icons.Default.Share, "Share rates") }
                        }
                    }
                }
                items(details.goldRates) { RateCard(it.purity + " Gold", it.pricePerGram, it.change, it.changePercent) }
                item { SilverCard(details.silverRate) }
                item { LastUpdated(details.lastUpdated, details.source.name, state.fromCache) }
                if (details.indicative) item { Text("Indicative city rate; national source: ${details.source.name}", style = MaterialTheme.typography.bodySmall) }
            }
        }
        is LoadState.Error -> ErrorPanel(state.message, state.retryable, null)
        else -> LoadingPanel()
    }
}

@Composable
private fun FavoritesScreen(favorites: List<FavoriteCity>, viewModel: RateStackViewModel, navController: NavHostController) {
    if (favorites.isEmpty()) {
        EmptyPanel("No favorite cities yet", "Add a city from its rate details screen.")
        return
    }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(favorites) { favorite ->
            Card(Modifier.fillMaxWidth().clickable { navController.navigate("rates/${favorite.stateSlug}/${favorite.citySlug}") }) {
                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) { Text(favorite.cityName, fontWeight = FontWeight.Bold); Text(favorite.stateName, style = MaterialTheme.typography.bodySmall) }
                    IconButton(onClick = { viewModel.removeFavorite(favorite) }) { Icon(Icons.Default.Favorite, "Remove favorite") }
                }
            }
        }
    }
}

@Composable
private fun SettingsScreen(viewModel: RateStackViewModel, openExternal: (String) -> Unit, onShare: (String) -> Unit, onRateApp: () -> Unit) {
    val context = LocalContext.current
    val selection by viewModel.selection.collectAsState()
    var notifications by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) { notifications = viewModelNotificationPreference(viewModel, context) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Text("Settings", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold) }
        item { SettingRow("Notifications", if (notifications) "Enabled" else "Disabled") { notifications = !notifications; viewModel.setNotifications(notifications) } }
        item { SettingRow("Default state", selection.first ?: "Not set", null) }
        item { SettingRow("Default city", selection.second ?: "Not set", null) }
        item { SettingRow("Clear offline cache", "Remove stored rate snapshots") { viewModel.clearCache() } }
        item { SettingRow("RateStack version", BuildConfig.VERSION_NAME, null) }
        item { SettingRow("Privacy Policy", "Open in browser") { openExternal(BuildConfig.PRIVACY_POLICY_URL) } }
        item { SettingRow("Rate this app", "Open Google Play") { onRateApp() } }
        item { SettingRow("Share app", "Tell a friend") { onShare("RateStack: ${BuildConfig.WEBSITE_URL}") } }
    }
}

private suspend fun viewModelNotificationPreference(viewModel: RateStackViewModel, context: Context): Boolean =
    PreferencesRepository(context.applicationContext).notificationsEnabled()

@Composable
private fun SettingRow(title: String, subtitle: String, action: (() -> Unit)? = null) {
    OutlinedCard(Modifier.fillMaxWidth().clickable(enabled = action != null) { action?.invoke() }) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Text(title, fontWeight = FontWeight.SemiBold); Text(subtitle, style = MaterialTheme.typography.bodySmall) }
            if (action != null) TextButton(onClick = action) { Text("Open") }
        }
    }
}

@Composable
private fun SearchField(query: String, label: String, onChange: (String) -> Unit) {
    androidx.compose.material3.OutlinedTextField(query, onChange, Modifier.fillMaxWidth(), label = { Text(label) }, singleLine = true)
}

@Composable
private fun ListRow(title: String, subtitle: String, onClick: () -> Unit) {
    OutlinedCard(Modifier.fillMaxWidth().clickable { onClick() }) { Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) { Column { Text(title, fontWeight = FontWeight.SemiBold); Text(subtitle, style = MaterialTheme.typography.bodySmall) } } }
}

@Composable
private fun RateCard(label: String, price: Double, change: Double?, percent: Double?) {
    Card(Modifier.fillMaxWidth()) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Text(label, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold); Text("per gram", style = MaterialTheme.typography.bodySmall) }
            Column(horizontalAlignment = Alignment.End) { Text(formatInr(price), style = MaterialTheme.typography.titleLarge); ChangeIndicator(change, percent) }
        }
    }
}

@Composable
private fun SilverCard(rate: com.ratestack.app.data.SilverRate) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) { Text("Silver 999", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold); Text(formatInr(rate.pricePerGram) + " / gram", style = MaterialTheme.typography.titleLarge); rate.pricePerKilogram?.let { Text(formatInr(it) + " / kilogram") }; ChangeIndicator(rate.changePerGram, rate.changePercent) }
    }
}

@Composable
private fun ChangeIndicator(change: Double?, percent: Double?) {
    val value = change ?: return
    val positive = value >= 0
    Row(verticalAlignment = Alignment.CenterVertically) { Text(if (positive) "↑" else "↓", color = if (positive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold); Text("${if (positive) "+" else ""}${formatInr(value)}${percent?.let { " (${String.format(Locale.US, "%.2f", it)}%)" } ?: ""}", style = MaterialTheme.typography.bodySmall) }
}

@Composable
private fun LastUpdated(updated: String, source: String, fromCache: Boolean) { Text("Updated ${formatDate(updated)} · Source: $source${if (fromCache) " · Offline snapshot" else ""}", style = MaterialTheme.typography.bodySmall) }

@Composable private fun LoadingPanel() { Box(Modifier.fillMaxWidth().padding(36.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
@Composable private fun EmptyPanel(title: String, message: String) { Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) { Column(horizontalAlignment = Alignment.CenterHorizontally) { Text(title, style = MaterialTheme.typography.titleLarge); Text(message, style = MaterialTheme.typography.bodyMedium) } } }
@Composable private fun ErrorPanel(message: String, retryable: Boolean, retry: (() -> Unit)?) { Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) { Text(if (retryable) "Connection problem" else "Unable to load", style = MaterialTheme.typography.titleLarge); Text(message); if (retry != null) OutlinedButton(onClick = retry) { Icon(Icons.Default.Refresh, null); Spacer(Modifier.width(6.dp)); Text("Retry") } } }

private fun formatInr(value: Double): String = NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(value)

private fun formatDate(value: String): String {
    val patterns = listOf("yyyy-MM-dd'T'HH:mm:ss.SSSX", "yyyy-MM-dd'T'HH:mm:ssX")
    for (pattern in patterns) {
        val parsed = runCatching { SimpleDateFormat(pattern, Locale.ENGLISH).parse(value) }.getOrNull() ?: continue
        return SimpleDateFormat("dd MMM yyyy, h:mm a", Locale.ENGLISH).apply { timeZone = TimeZone.getDefault() }.format(parsed)
    }
    return value
}

private fun routeTitle(route: String?): String = when { route?.startsWith("states") == true -> "Choose state"; route?.startsWith("cities") == true -> "Choose city"; route?.startsWith("rates") == true -> "Rate details"; route == Routes.FAVORITES -> "Favorites"; route == Routes.SETTINGS -> "Settings"; else -> "RateStack" }

private fun navigateLink(
    navController: NavHostController,
    raw: String,
    citiesState: LoadState<List<CityOption>>,
    viewModel: RateStackViewModel,
) {
    when (val destination = NativeDeepLinkResolver(BuildConfig.TRUSTED_HOST).resolve(raw)) {
        NativeDestination.Home -> navController.navigate(Routes.HOME)
        is NativeDestination.State -> navController.navigate("cities/${destination.slug}")
        is NativeDestination.Rate -> navController.navigate("rates/${destination.stateSlug}/${destination.citySlug}")
        is NativeDestination.CityLookup -> {
            val match = (citiesState as? LoadState.Ready)?.data?.firstOrNull { it.slug == destination.citySlug }
            if (match != null) navController.navigate("rates/${match.state.slug}/${match.slug}")
            else viewModel.loadLocations()
        }
        is NativeDestination.External -> Unit
    }
}

class RateStackViewModelFactory(private val repository: RateRepository, private val preferences: PreferencesStore) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = RateStackViewModel(repository, preferences) as T
}

private fun LoadState.Ready<RateDetails>.fromCache(): Boolean = fromCache
