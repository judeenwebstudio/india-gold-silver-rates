package com.ratestack.app

import android.content.Context
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.AlertDialog
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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SmallTopAppBar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberTopAppBarState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import com.ratestack.app.data.ApiProvider
import com.ratestack.app.data.AppThemeMode
import com.ratestack.app.data.CityOption
import com.ratestack.app.data.FavoriteCity
import com.ratestack.app.data.GoldRate
import com.ratestack.app.data.HomeData
import com.ratestack.app.data.PreferencesRepository
import com.ratestack.app.data.PreferencesStore
import com.ratestack.app.data.RateDetails
import com.ratestack.app.data.RateRepository
import com.ratestack.app.data.StateOption
import com.ratestack.app.ui.components.EmptyPanel
import com.ratestack.app.ui.components.ErrorPanel
import com.ratestack.app.ui.components.LastUpdatedBadge
import com.ratestack.app.ui.components.PriceDeltaBadge
import com.ratestack.app.ui.components.ProminentGoldHeroCard
import com.ratestack.app.ui.components.SilverRateCard
import com.ratestack.app.ui.components.SkeletonListCard
import com.ratestack.app.ui.components.SkeletonMarketCard
import com.ratestack.app.ui.components.formatInr
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private object Routes {
    const val HOME = "home"
    const val SCHEMES = "shop"
    const val SCHEME_JOIN = "scheme_join/{planId}"
    const val MY_SCHEMES = "my_schemes"
    const val CUSTOMER_LOGIN = "customer_login"
    const val CUSTOMER_REGISTER = "customer_register"
    const val FORGOT_PASSWORD = "forgot_password"
    const val OTP_VERIFICATION = "otp_verification"
    const val RESET_PASSWORD = "reset_password"
    const val CUSTOMER_PROFILE = "customer_profile"
    const val STATES = "states"
    const val CITIES = "cities/{state}"
    const val RATES = "rates/{state}/{city}"
    const val FAVORITES = "favorites"
    const val MY_ORDERS = "my_orders"
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
    val schemeRepository = remember { com.ratestack.app.data.SchemeRepository(ApiProvider.service, context.applicationContext) }
    val schemeViewModel: com.ratestack.app.ui.schemes.SchemeViewModel = viewModel(
        factory = remember { SchemeViewModelFactory(schemeRepository) },
    )

    val navController = rememberNavController()
    var splashVisible by remember { mutableStateOf(true) }

    val themeMode by viewModel.themeMode.collectAsState()

    LaunchedEffect(Unit) {
        delay(700)
        splashVisible = false
    }

    LaunchedEffect(initialUrl) {
        if (!initialUrl.isNullOrBlank()) navigateLink(navController, initialUrl)
    }

    RateStackTheme(themeMode = themeMode) {
        if (splashVisible) {
            SplashScreen()
            return@RateStackTheme
        }

        val selection by viewModel.selection.collectAsState()
        LaunchedEffect(selection) {
            val (state, city) = selection
            if (!state.isNullOrBlank() && !city.isNullOrBlank()) viewModel.loadRates(state, city)
        }

        val backStackEntry by navController.currentBackStackEntryAsState()
        val currentRoute = backStackEntry?.destination?.route

        Scaffold(
            topBar = { AppTopBar(currentRoute, selection, navController) },
            bottomBar = {
                NavigationBar {
                    BottomItem(Routes.HOME, "Home", Icons.Default.Home, currentRoute, navController)
                    BottomItem(Routes.SCHEMES, "Shop", Icons.Default.Star, currentRoute, navController)
                    BottomItem(Routes.MY_ORDERS, "Dashboard", Icons.Default.Person, currentRoute, navController)
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
                    val userToken by schemeViewModel.userToken.collectAsState()
                    HomeScreen(home, rates, selection, userToken, viewModel, navController)
                }

                composable(Routes.SCHEMES) {
                    val userToken by schemeViewModel.userToken.collectAsState()
                    com.ratestack.app.ui.shop.NativeShopScreen(
                        token = userToken,
                        onLogin = { navController.navigate(Routes.CUSTOMER_LOGIN) },
                        onRegister = { navController.navigate(Routes.CUSTOMER_REGISTER) },
                        onGoogleLogin = { navController.navigate(Routes.CUSTOMER_LOGIN) },
                        onOrders = { navController.navigate(Routes.MY_ORDERS) },
                    )
                }

                composable(
                    "scheme_join/{planId}",
                    arguments = listOf(navArgument("planId") { type = NavType.StringType }),
                ) { entry ->
                    val planId = entry.arguments?.getString("planId").orEmpty()
                    val schemePlansState by schemeViewModel.schemePlans.collectAsState()
                    val plans = (schemePlansState as? LoadState.Ready)?.data?.plans ?: emptyList()
                    val selectedPlan = plans.firstOrNull { it.id == planId } ?: schemeViewModel.selectedPlan.collectAsState().value

                    val joinState by schemeViewModel.joinSchemeActionState.collectAsState()
                    val isLoading = joinState is LoadState.Loading
                    val errorMessage = (joinState as? LoadState.Error)?.message
                    val initialAmount = schemeViewModel.pendingJoinAmount.collectAsState().value

                    if (com.ratestack.app.BuildConfig.DEBUG) {
                        android.util.Log.d(
                            "RateStackNav",
                            "Entered Destination: scheme_join/{planId} | planId=$planId | FoundPlan=${selectedPlan?.name}"
                        )
                    }

                    com.ratestack.app.ui.schemes.JoinSchemeScreen(
                        plan = selectedPlan,
                        initialMonthlyAmount = initialAmount,
                        isLoading = isLoading,
                        errorMessage = errorMessage,
                        onBackClick = {
                            schemeViewModel.resetJoinSchemeActionState()
                            navController.popBackStack()
                        },
                        onSubmitJoin = { amount, nomineeName, relationship, phone, age, termsVersion ->
                            schemeViewModel.joinScheme(
                                planId = planId,
                                monthlyAmount = amount,
                                nomineeFullName = nomineeName,
                                nomineeRelationship = relationship,
                                nomineePhone = phone,
                                nomineeAge = age,
                                acceptedTermsVersion = termsVersion,
                                onSuccess = { enrollmentId ->
                                    schemeViewModel.resetJoinSchemeActionState()
                                    schemeViewModel.clearPendingJoin()
                                    navController.navigate("scheme_dashboard/$enrollmentId") {
                                        popUpTo(Routes.SCHEMES)
                                    }
                                },
                                onError = { }
                            )
                        }
                    )
                }

                composable(Routes.CUSTOMER_LOGIN) {
                    val authState by schemeViewModel.authActionState.collectAsState()
                    val isLoading = authState is LoadState.Loading
                    val errorMsg = (authState as? LoadState.Error)?.message

                    com.ratestack.app.ui.schemes.CustomerLoginScreen(
                        isLoading = isLoading,
                        errorMessage = errorMsg,
                        onLoginSubmit = { phone, pass ->
                            schemeViewModel.login(phone, pass) {
                                schemeViewModel.resetAuthActionState()
                                val pendingId = schemeViewModel.pendingJoinPlanId.value
                                if (!pendingId.isNullOrBlank()) {
                                    navController.navigate("scheme_join/${android.net.Uri.encode(pendingId)}") {
                                        popUpTo(Routes.CUSTOMER_LOGIN) { inclusive = true }
                                    }
                                } else {
                                    navController.navigate(Routes.SCHEMES) {
                                        popUpTo(Routes.CUSTOMER_LOGIN) { inclusive = true }
                                    }
                                }
                            }
                        },
                        onGoogleIdToken = { idToken ->
                            schemeViewModel.googleSignIn(idToken) {
                                schemeViewModel.resetAuthActionState()
                                val pendingId = schemeViewModel.pendingJoinPlanId.value
                                if (!pendingId.isNullOrBlank()) {
                                    navController.navigate("scheme_join/${android.net.Uri.encode(pendingId)}") {
                                        popUpTo(Routes.CUSTOMER_LOGIN) { inclusive = true }
                                    }
                                } else {
                                    navController.navigate(Routes.SCHEMES) {
                                        popUpTo(Routes.CUSTOMER_LOGIN) { inclusive = true }
                                    }
                                }
                            }
                        },
                        onNavigateRegister = {
                            schemeViewModel.resetAuthActionState()
                            navController.navigate(Routes.CUSTOMER_REGISTER) {
                                popUpTo(Routes.CUSTOMER_LOGIN) { inclusive = true }
                            }
                        },
                        onNavigateForgotPassword = {
                            schemeViewModel.clearForgotState()
                            navController.navigate(Routes.FORGOT_PASSWORD)
                        }
                    )
                }

                composable(Routes.CUSTOMER_REGISTER) {
                    val authState by schemeViewModel.authActionState.collectAsState()
                    val isLoading = authState is LoadState.Loading
                    val errorMsg = (authState as? LoadState.Error)?.message

                    com.ratestack.app.ui.schemes.CustomerRegisterScreen(
                        isLoading = isLoading,
                        errorMessage = errorMsg,
                        onRegisterSubmit = { fullName, phone, pass ->
                            schemeViewModel.register(fullName, phone, pass) {
                                schemeViewModel.resetAuthActionState()
                                val destination = if (schemeViewModel.userToken.value.isNullOrBlank()) Routes.CUSTOMER_LOGIN else Routes.SCHEMES
                                navController.navigate(destination) {
                                    popUpTo(Routes.CUSTOMER_REGISTER) { inclusive = true }
                                }
                            }
                        },
                        onGoogleIdToken = { idToken ->
                            schemeViewModel.googleSignIn(idToken) {
                                schemeViewModel.resetAuthActionState()
                                navController.navigate(Routes.SCHEMES) {
                                    popUpTo(Routes.CUSTOMER_REGISTER) { inclusive = true }
                                }
                            }
                        },
                        onNavigateLogin = {
                            schemeViewModel.resetAuthActionState()
                            navController.navigate(Routes.CUSTOMER_LOGIN) {
                                popUpTo(Routes.CUSTOMER_REGISTER) { inclusive = true }
                            }
                        }
                    )
                }

                composable(Routes.FORGOT_PASSWORD) {
                    val forgotState by schemeViewModel.forgotActionState.collectAsState()
                    val isLoading = forgotState is LoadState.Loading
                    val errorMsg = (forgotState as? LoadState.Error)?.message

                    com.ratestack.app.ui.schemes.ForgotPasswordScreen(
                        isLoading = isLoading,
                        errorMessage = errorMsg,
                        onSendOtpSubmit = { phone ->
                            schemeViewModel.requestPasswordResetOtp(phone) {
                                navController.navigate(Routes.OTP_VERIFICATION)
                            }
                        },
                        onNavigateBack = { navController.popBackStack() }
                    )
                }

                composable(Routes.OTP_VERIFICATION) {
                    val mobileNumber by schemeViewModel.forgotMobile.collectAsState()
                    val forgotState by schemeViewModel.forgotActionState.collectAsState()
                    val isLoading = forgotState is LoadState.Loading
                    val errorMsg = (forgotState as? LoadState.Error)?.message

                    com.ratestack.app.ui.schemes.OtpVerificationScreen(
                        mobileNumber = mobileNumber,
                        isLoading = isLoading,
                        errorMessage = errorMsg,
                        onVerifyOtpSubmit = { otp ->
                            schemeViewModel.verifyPasswordResetOtp(otp) {
                                navController.navigate(Routes.RESET_PASSWORD)
                            }
                        },
                        onResendOtp = {
                            schemeViewModel.requestPasswordResetOtp(mobileNumber) {}
                        },
                        onNavigateBack = { navController.popBackStack() }
                    )
                }

                composable(Routes.RESET_PASSWORD) {
                    val mobileNumber by schemeViewModel.forgotMobile.collectAsState()
                    val forgotState by schemeViewModel.forgotActionState.collectAsState()
                    val isLoading = forgotState is LoadState.Loading
                    val errorMsg = (forgotState as? LoadState.Error)?.message

                    com.ratestack.app.ui.schemes.ResetPasswordScreen(
                        mobileNumber = mobileNumber,
                        isLoading = isLoading,
                        errorMessage = errorMsg,
                        onResetPasswordSubmit = { newPass ->
                            schemeViewModel.resetPassword(newPass) {
                                navController.navigate(Routes.CUSTOMER_LOGIN) {
                                    popUpTo(Routes.CUSTOMER_LOGIN) { inclusive = true }
                                }
                            }
                        },
                        onNavigateBack = { navController.popBackStack() }
                    )
                }

                composable(
                    "scheme_dashboard/{enrollmentId}",
                    arguments = listOf(navArgument("enrollmentId") { type = NavType.StringType }),
                ) { entry ->
                    val enrollmentId = entry.arguments?.getString("enrollmentId").orEmpty()
                    LaunchedEffect(enrollmentId) {
                        schemeViewModel.loadSchemeDashboard(enrollmentId)
                    }

                    val context = androidx.compose.ui.platform.LocalContext.current
                    val activity = context as? MainActivity
                    val userPhone by schemeViewModel.userPhone.collectAsState()
                    val dashboardState by schemeViewModel.schemeDashboard.collectAsState()
                    val paymentFlowState by schemeViewModel.paymentFlowState.collectAsState()
                    val isLoading = dashboardState is LoadState.Loading
                    val dashboardData = (dashboardState as? LoadState.Ready)?.data
                    val isOffline = (dashboardState as? LoadState.Ready)?.fromCache ?: false

                    com.ratestack.app.ui.schemes.SchemeDashboardScreen(
                        dashboard = dashboardData,
                        isLoading = isLoading,
                        paymentActionState = paymentFlowState,
                        onDismissPaymentBanner = { schemeViewModel.resetPaymentFlowState() },
                        onPayInstallment = {
                            schemeViewModel.startPaymentFlow(
                                enrollmentId = enrollmentId,
                                onLaunchCheckout = { checkoutValue, gatewayOrderId, paymentOrderId, gateway, amount ->
                                    if (activity != null) {
                                        if (gateway == "PHONEPE") {
                                            activity.startPhonePePaymentSheet(
                                                redirectUrl = checkoutValue,
                                                merchantTransactionId = gatewayOrderId,
                                                onSuccess = { txId ->
                                                    schemeViewModel.handlePaymentSuccess(
                                                        enrollmentId = enrollmentId,
                                                        paymentOrderId = paymentOrderId,
                                                        gatewayPaymentId = txId,
                                                        gatewaySignature = "PHONEPE_VERIFIED"
                                                    )
                                                },
                                                onError = { desc ->
                                                    schemeViewModel.handlePaymentFailed(desc)
                                                }
                                            )
                                        } else if (gateway == "RAZORPAY") {
                                            activity.startRazorpayCheckout(
                                                keyId = checkoutValue,
                                                gatewayOrderId = gatewayOrderId,
                                                amountPaise = (amount * 100).toLong(),
                                                onSuccess = { paymentId, signature ->
                                                    schemeViewModel.handlePaymentSuccess(
                                                        enrollmentId = enrollmentId,
                                                        paymentOrderId = paymentOrderId,
                                                        gatewayPaymentId = paymentId,
                                                        gatewaySignature = signature,
                                                    )
                                                },
                                                onError = { desc -> schemeViewModel.handlePaymentFailed(desc) },
                                            )
                                        } else {
                                            schemeViewModel.handlePaymentFailed("Unsupported payment gateway.")
                                        }
                                    } else {
                                        schemeViewModel.handlePaymentFailed("Activity context unavailable")
                                    }
                                }
                            )
                        },
                        onRequestRedemption = { },
                        isOffline = isOffline
                    )
                }

                composable(Routes.CUSTOMER_PROFILE) {
                    LaunchedEffect(Unit) {
                        navController.navigate(Routes.MY_ORDERS) {
                            popUpTo(Routes.CUSTOMER_PROFILE) { inclusive = true }
                        }
                    }
                }

                composable(Routes.STATES) {
                    LaunchedEffect(Unit) {
                        navController.navigate(Routes.SCHEMES) {
                            popUpTo(Routes.STATES) { inclusive = true }
                        }
                    }
                }
                composable(
                    Routes.CITIES,
                    arguments = listOf(navArgument("state") { type = NavType.StringType }),
                ) {
                    LaunchedEffect(Unit) {
                        navController.navigate(Routes.SCHEMES) {
                            popUpTo(Routes.CITIES) { inclusive = true }
                        }
                    }
                }
                composable(
                    Routes.RATES,
                    arguments = listOf(
                        navArgument("state") { type = NavType.StringType },
                        navArgument("city") { type = NavType.StringType },
                    ),
                ) {
                    LaunchedEffect(Unit) {
                        navController.navigate(Routes.SCHEMES) {
                            popUpTo(Routes.RATES) { inclusive = true }
                        }
                    }
                }
                composable(Routes.FAVORITES) {
                    LaunchedEffect(Unit) {
                        navController.navigate(Routes.SCHEMES) {
                            popUpTo(Routes.FAVORITES) { inclusive = true }
                        }
                    }
                }
                composable(Routes.MY_ORDERS) {
                    val userToken by schemeViewModel.userToken.collectAsState()
                    com.ratestack.app.ui.shop.MyOrdersScreen(
                        token = userToken,
                        onLogin = { navController.navigate(Routes.CUSTOMER_LOGIN) },
                        onRegister = { navController.navigate(Routes.CUSTOMER_REGISTER) },
                        onGoogleLogin = { navController.navigate(Routes.CUSTOMER_LOGIN) },
                        onLogout = { schemeViewModel.logout() },
                        onShop = { navController.navigate(Routes.SCHEMES) },
                    )
                }
                composable(Routes.SETTINGS) {
                    val userToken by schemeViewModel.userToken.collectAsState()
                    val userName by schemeViewModel.userName.collectAsState()
                    val isLoggedIn = !userToken.isNullOrBlank()

                    SettingsScreen(
                        viewModel = viewModel,
                        isLoggedIn = isLoggedIn,
                        userName = userName,
                        openExternal = onOpenExternal,
                        onShare = onShare,
                        onRateApp = onRateApp,
                        onProfileClick = { navController.navigate(Routes.MY_ORDERS) },
                        onLogoutClick = { schemeViewModel.logout() },
                        onLoginClick = { navController.navigate(Routes.CUSTOMER_LOGIN) },
                        onRegisterClick = { navController.navigate(Routes.CUSTOMER_REGISTER) },
                    )
                }
            }
        }
    }
}

@Composable
private fun SplashScreen() {
    val scale = remember { Animatable(0.85f) }
    val alpha = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        launch { scale.animateTo(1.0f, animationSpec = tween(500)) }
        launch { alpha.animateTo(1.0f, animationSpec = tween(500)) }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier
                    .scale(scale.value)
                    .alpha(alpha.value),
            ) {
                Surface(
                    shape = RoundedCornerShape(24.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier.size(110.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Image(
                            painter = painterResource(R.drawable.ratestack_logo),
                            contentDescription = "RateStack Logo",
                            modifier = Modifier.size(80.dp),
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Text(
                    text = "RateStack",
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp,
                    ),
                    color = MaterialTheme.colorScheme.onBackground,
                )

                Text(
                    text = "Live Gold & Silver Prices",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.Medium,
                    ),
                    color = MaterialTheme.colorScheme.primary,
                )

                Spacer(modifier = Modifier.height(32.dp))

                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    strokeWidth = 2.5.dp,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppTopBar(
    route: String?,
    selection: Pair<String?, String?>,
    navController: NavHostController,
) {
    val isRoot = route == Routes.HOME || route == Routes.SCHEMES ||
        route == Routes.MY_ORDERS || route == Routes.FAVORITES || route == Routes.SETTINGS
    SmallTopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Image(
                    painter = painterResource(R.drawable.ratestack_logo),
                    contentDescription = "RateStack Logo",
                    modifier = Modifier.size(36.dp),
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = if (route == Routes.HOME) "RateStack" else routeTitle(route),
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                        ),
                    )
                    if (route == Routes.HOME && selection.second != null) {
                        Text(
                            text = "${selection.second}, ${selection.first}",
                            style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp),
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }
        },
        navigationIcon = {
            if (!isRoot) {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            }
        },
        colors = TopAppBarDefaults.smallTopAppBarColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior(rememberTopAppBarState()),
    )
}

@Composable
private fun RowScope.BottomItem(
    route: String,
    label: String,
    icon: ImageVector,
    currentRoute: String?,
    navController: NavHostController,
) {
    NavigationBarItem(
        selected = currentRoute == route,
        onClick = {
            navController.navigate(route) {
                popUpTo(Routes.HOME) { saveState = true }
                launchSingleTop = true
                restoreState = true
            }
        },
        icon = { Icon(icon, contentDescription = label) },
        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
    )
}

@OptIn(ExperimentalMaterialApi::class)
@Composable
private fun HomeScreen(
    home: LoadState<HomeData>,
    rates: LoadState<RateDetails>?,
    selection: Pair<String?, String?>,
    userToken: String?,
    viewModel: RateStackViewModel,
    navController: NavHostController,
) {
    val isRefreshing = home is LoadState.Loading || rates is LoadState.Loading
    val refreshState = rememberPullRefreshState(isRefreshing, viewModel::refreshHome)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .pullRefresh(refreshState),
    ) {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text(
                            text = "Today's Rates",
                            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onBackground,
                        )
                        Text(
                            text = "Indicative market prices in INR",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            when {
                rates is LoadState.Ready -> {
                    val details = rates.data
                    item {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f),
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    imageVector = Icons.Default.LocationOn,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "${details.city.name}, ${details.state.name}",
                                    style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                )
                            }
                        }
                    }

                    item {
                        ProminentGoldHeroCard(goldRates = details.goldRates)
                    }

                    item {
                        SilverRateCard(silverRate = details.silverRate)
                    }

                    item {
                        LastUpdatedBadge(
                            updatedTimeIso = details.lastUpdated,
                            sourceName = details.source.name,
                            fromCache = rates.fromCache,
                        )
                    }
                }

                home is LoadState.Ready -> {
                    val data = home.data
                    item {
                        ProminentGoldHeroCard(goldRates = data.latestGoldRates)
                    }

                    item {
                        SilverRateCard(silverRate = data.latestSilverRate)
                    }

                    item {
                        LastUpdatedBadge(
                            updatedTimeIso = data.lastUpdated,
                            sourceName = data.source.name,
                            fromCache = home.fromCache,
                        )
                    }
                }

                home is LoadState.Error -> {
                    item {
                        ErrorPanel(
                            message = home.message,
                            retryable = home.retryable,
                            onRetry = { viewModel.refreshHome() },
                        )
                    }
                }

                else -> {
                    item { SkeletonMarketCard() }
                    item { SkeletonListCard() }
                }
            }

            item {
                com.ratestack.app.ui.components.RealRateHistorySection()
            }

            item {
                com.ratestack.app.ui.shop.NativeShopScreen(
                    token = userToken,
                    onLogin = { navController.navigate(Routes.CUSTOMER_LOGIN) },
                    onRegister = { navController.navigate(Routes.CUSTOMER_REGISTER) },
                    onGoogleLogin = { navController.navigate(Routes.CUSTOMER_LOGIN) },
                    onOrders = { navController.navigate(Routes.MY_ORDERS) },
                    embedded = true,
                )
            }

            item { Spacer(modifier = Modifier.height(16.dp)) }
        }

        PullRefreshIndicator(
            refreshing = isRefreshing,
            state = refreshState,
            modifier = Modifier.align(Alignment.TopCenter),
        )
    }
}

@Composable
private fun LocationCard(
    selection: Pair<String?, String?>,
    navController: NavHostController,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
    ) {
        Row(
            modifier = Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Selected Region",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = if (selection.first == null) "Select your state & city for local rates" else "${selection.second}, ${selection.first}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Button(
                onClick = { navController.navigate(Routes.STATES) },
                shape = RoundedCornerShape(12.dp),
            ) {
                Text(if (selection.first == null) "Choose" else "Change")
            }
        }
    }
}

@Composable
private fun StateSelectionScreen(
    states: LoadState<List<StateOption>>,
    onSelect: (StateOption) -> Unit,
) {
    var query by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .imePadding(),
    ) {
        Text(
            text = "Select State",
            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(modifier = Modifier.height(12.dp))

        SearchField(
            query = query,
            label = "Search state name...",
            onChange = { query = it },
        )

        Spacer(modifier = Modifier.height(16.dp))

        when (states) {
            is LoadState.Ready -> {
                val filtered = states.data.filter { it.name.contains(query, ignoreCase = true) }
                if (filtered.isEmpty()) {
                    EmptyPanel(
                        title = "No states found",
                        message = "No state matches '$query'. Try another search term.",
                    )
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(filtered) { state ->
                            OutlinedCard(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onSelect(state) },
                                shape = RoundedCornerShape(12.dp),
                            ) {
                                Row(
                                    modifier = Modifier.padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Column {
                                        Text(
                                            text = state.name,
                                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                                        )
                                        Text(
                                            text = "${state.cityCount} cities available",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                    ) {
                                        Text(
                                            text = state.code,
                                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                            color = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            is LoadState.Error -> ErrorPanel(
                message = states.message,
                retryable = states.retryable,
                onRetry = null,
            )

            else -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(5) { SkeletonListCard() }
            }
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .imePadding(),
    ) {
        Text(
            text = "Cities in $stateName",
            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(modifier = Modifier.height(12.dp))

        SearchField(
            query = query,
            label = "Search city name...",
            onChange = { query = it },
        )

        Spacer(modifier = Modifier.height(16.dp))

        when (cities) {
            is LoadState.Ready -> {
                val filtered = cities.data.filter { it.state.slug == stateSlug && it.name.contains(query, ignoreCase = true) }
                if (filtered.isEmpty()) {
                    EmptyPanel(
                        title = "No cities found",
                        message = "No city matches '$query' in $stateName.",
                    )
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(filtered) { city ->
                            OutlinedCard(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onSelect(city) },
                                shape = RoundedCornerShape(12.dp),
                            ) {
                                Row(
                                    modifier = Modifier.padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.LocationOn,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(20.dp),
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = city.name,
                                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                                        )
                                        Text(
                                            text = city.state.name,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            is LoadState.Error -> ErrorPanel(
                message = cities.message,
                retryable = cities.retryable,
                onRetry = null,
            )

            else -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(5) { SkeletonListCard() }
            }
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
            val isFavorite = favorites.any { it.stateSlug == details.state.slug && it.citySlug == details.city.slug }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = details.city.name,
                                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                                    color = MaterialTheme.colorScheme.onSurface,
                                )
                                Text(
                                    text = details.state.name,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Row {
                                IconButton(onClick = {
                                    viewModel.toggleFavorite(
                                        FavoriteCity(
                                            stateSlug = details.state.slug,
                                            citySlug = details.city.slug,
                                            stateName = details.state.name,
                                            cityName = details.city.name,
                                        ),
                                    )
                                }) {
                                    Icon(
                                        imageVector = if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                        contentDescription = if (isFavorite) "Remove from favorites" else "Add to favorites",
                                        tint = if (isFavorite) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                IconButton(onClick = {
                                    val goldRate = details.goldRates.firstOrNull { it.purity == "22K" } ?: details.goldRates.firstOrNull { it.purity == "24K" }
                                    val text = "${details.city.name} Rates - ${goldRate?.purity ?: "Gold"}: ${goldRate?.pricePerGram?.let { formatInr(it) } ?: "-"} /g, Silver: ${formatInr(details.silverRate.pricePerGram)} /g. RateStack app: ${BuildConfig.WEBSITE_URL}"
                                    onShare(text)
                                }) {
                                    Icon(Icons.Default.Share, contentDescription = "Share rates")
                                }
                            }
                        }
                    }
                }

                item {
                    ProminentGoldHeroCard(goldRates = details.goldRates)
                }

                item {
                    Text(
                        text = "Gold Rates Breakdown",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                }

                val purityOrder = listOf("22K", "24K", "18K")
                val sortedGoldRates = details.goldRates.sortedBy { rate ->
                    val idx = purityOrder.indexOf(rate.purity.uppercase())
                    if (idx >= 0) idx else 99
                }

                items(sortedGoldRates) { rate ->
                    OutlinedCard(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Column {
                                Text(
                                    text = "${rate.purity} Gold",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                )
                                Text(
                                    text = "per gram",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = formatInr(rate.pricePerGram),
                                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                                )
                                PriceDeltaBadge(change = rate.change, percent = rate.changePercent)
                            }
                        }
                    }
                }

                item {
                    SilverRateCard(silverRate = details.silverRate)
                }

                item {
                    LastUpdatedBadge(
                        updatedTimeIso = details.lastUpdated,
                        sourceName = details.source.name,
                        fromCache = state.fromCache,
                    )
                }

                if (details.indicative) {
                    item {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Indicative city rate based on national benchmark source (${details.source.name}).",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }

        is LoadState.Error -> ErrorPanel(
            message = state.message,
            retryable = state.retryable,
            onRetry = null,
        )

        else -> Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator()
        }
    }
}

@Composable
private fun FavoritesScreen(
    favorites: List<FavoriteCity>,
    viewModel: RateStackViewModel,
    navController: NavHostController,
) {
    if (favorites.isEmpty()) {
        EmptyPanel(
            title = "No Favorite Cities",
            message = "Save your frequently visited cities here for instant access to live rates.",
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text(
                text = "Saved Cities (${favorites.size})",
                style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.onBackground,
            )
        }

        items(favorites) { favorite ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        navController.navigate("rates/${favorite.stateSlug}/${favorite.citySlug}")
                    },
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f),
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            modifier = Modifier.size(40.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(8.dp),
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = favorite.cityName,
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                            Text(
                                text = favorite.stateName,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }

                    IconButton(onClick = { viewModel.removeFavorite(favorite) }) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Remove favorite",
                            tint = MaterialTheme.colorScheme.error.copy(alpha = 0.8f),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsScreen(
    viewModel: RateStackViewModel,
    isLoggedIn: Boolean = false,
    userName: String? = null,
    openExternal: (String) -> Unit,
    onShare: (String) -> Unit,
    onRateApp: () -> Unit,
    onProfileClick: () -> Unit = {},
    onLogoutClick: () -> Unit = {},
    onLoginClick: () -> Unit = {},
    onRegisterClick: () -> Unit = {},
) {
    val context = LocalContext.current
    val selection by viewModel.selection.collectAsState()
    val themeMode by viewModel.themeMode.collectAsState()
    var notifications by remember { mutableStateOf(true) }
    var showThemeDialog by remember { mutableStateOf(false) }

    val coroutineScope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        notifications = viewModelNotificationPreference(viewModel, context)
    }

    if (showThemeDialog) {
        ThemeSelectionDialog(
            currentMode = themeMode,
            onModeSelected = { mode ->
                viewModel.setThemeMode(mode)
                showThemeDialog = false
            },
            onDismiss = { showThemeDialog = false },
        )
    }

    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Text(
                    text = "Settings",
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onBackground,
                )
            }

            if (isLoggedIn) {
                item {
                    SettingsCategoryCard(title = "Customer Account") {
                        SettingTile(
                            title = "My Dashboard (${userName ?: "Customer"})",
                            subtitle = "Orders, addresses, payments and account details",
                            icon = Icons.Default.Info,
                            onClick = onProfileClick,
                        )
                        SettingTile(
                            title = "Logout",
                            subtitle = "Sign out of your RateStack shop account",
                            icon = Icons.Default.Clear,
                            onClick = onLogoutClick,
                        )
                    }
                }
            } else {
                item {
                    SettingsCategoryCard(title = "Customer Account") {
                        SettingTile("Login", "Access orders and checkout", Icons.Default.Info, onClick = onLoginClick)
                        SettingTile("Register", "Create your RateStack account", Icons.Default.Info, onClick = onRegisterClick)
                        SettingTile("Continue with Google", "Use Google on the secure login screen", Icons.Default.Info, onClick = onLoginClick)
                    }
                }
            }

            // Category: Location
            item {
                SettingsCategoryCard(title = "Location") {
                    SettingTile(
                        title = "Selected Region",
                        subtitle = if (selection.first == null) "Not set" else "${selection.second}, ${selection.first}",
                        icon = Icons.Default.LocationOn,
                    )
                }
            }

            // Category: Preferences
            item {
                SettingsCategoryCard(title = "Preferences") {
                    SettingToggleTile(
                        title = "Notifications",
                        subtitle = if (notifications) "Receive price alert notifications" else "Notifications disabled",
                        icon = Icons.Default.Notifications,
                        checked = notifications,
                        onCheckedChange = { enabled ->
                            notifications = enabled
                            viewModel.setNotifications(enabled)
                        },
                    )

                    SettingTile(
                        title = "App Theme",
                        subtitle = when (themeMode) {
                            AppThemeMode.SYSTEM -> "System Default"
                            AppThemeMode.LIGHT -> "Light Mode"
                            AppThemeMode.DARK -> "Dark Mode"
                        },
                        icon = Icons.Default.Settings,
                        onClick = { showThemeDialog = true },
                    )
                }
            }

            // Category: Storage
            item {
                SettingsCategoryCard(title = "Storage & Cache") {
                    SettingTile(
                        title = "Clear Offline Cache",
                        subtitle = "Remove stored rate snapshots",
                        icon = Icons.Default.Refresh,
                        onClick = {
                            viewModel.clearCache()
                            coroutineScope.launch {
                                snackbarHostState.showSnackbar("Offline cache cleared.")
                            }
                        },
                    )
                }
            }

            // Category: About & Legal
            item {
                SettingsCategoryCard(title = "About & Legal") {
                    listOf(
                        "About Us" to "/about-us",
                        "Terms & Conditions" to "/terms-and-conditions",
                        "Refund Policy" to "/refund-policy",
                        "Shipping Policy" to "/shipping-policy",
                        "Privacy Policy" to "/privacy-policy",
                        "FAQ" to "/faq",
                        "Contact Us" to "/contact-us",
                    ).forEach { (title, path) ->
                        SettingTile(
                            title = title,
                            subtitle = "Open RateStack website",
                            icon = Icons.Default.Info,
                            onClick = { openExternal(BuildConfig.WEBSITE_URL.trimEnd('/') + path) },
                        )
                    }

                    SettingTile(
                        title = "BIS Certificate No",
                        subtitle = "HM/C-6590483527",
                        icon = Icons.Default.Info,
                    )
                    SettingTile("Email", "info@ratestack.in", Icons.Default.Info) {
                        openExternal("mailto:info@ratestack.in")
                    }
                    SettingTile("Facebook", "facebook.com", Icons.Default.Share) { openExternal("https://facebook.com/") }
                    SettingTile("X (Twitter)", "x.com", Icons.Default.Share) { openExternal("https://x.com/") }
                    SettingTile("Instagram", "instagram.com", Icons.Default.Share) { openExternal("https://instagram.com/") }

                    SettingTile(
                        title = "Rate App",
                        subtitle = "Open Google Play Store listing",
                        icon = Icons.Default.Star,
                        onClick = onRateApp,
                    )

                    SettingTile(
                        title = "Share App",
                        subtitle = "Tell friends about RateStack",
                        icon = Icons.Default.Share,
                        onClick = { onShare("RateStack - Live Gold & Silver Prices in India: ${BuildConfig.WEBSITE_URL}") },
                    )

                    SettingTile(
                        title = "App Version",
                        subtitle = "v${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})",
                        icon = Icons.Default.Info,
                    )
                }
            }

            item { Spacer(modifier = Modifier.height(16.dp)) }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }
}

@Composable
private fun SettingsCategoryCard(
    title: String,
    content: @Composable () -> Unit,
) {
    Column {
        Text(
            text = title,
            style = MaterialTheme.typography.labelLarge.copy(
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
            ),
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(start = 4.dp, bottom = 6.dp),
        )
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
        ) {
            Column {
                content()
            }
        }
    }
}

@Composable
private fun SettingTile(
    title: String,
    subtitle: String,
    icon: ImageVector,
    onClick: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = onClick != null) { onClick?.invoke() }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(22.dp),
        )
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun SettingToggleTile(
    title: String,
    subtitle: String,
    icon: ImageVector,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(22.dp),
        )
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
        )
    }
}

@Composable
private fun ThemeSelectionDialog(
    currentMode: AppThemeMode,
    onModeSelected: (AppThemeMode) -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Select App Theme", fontWeight = FontWeight.Bold) },
        text = {
            Column(modifier = Modifier.selectableGroup()) {
                AppThemeMode.entries.forEach { mode ->
                    val label = when (mode) {
                        AppThemeMode.SYSTEM -> "System Default"
                        AppThemeMode.LIGHT -> "Light Mode"
                        AppThemeMode.DARK -> "Dark Mode"
                    }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .selectable(
                                selected = (mode == currentMode),
                                onClick = { onModeSelected(mode) },
                                role = Role.RadioButton,
                            )
                            .padding(horizontal = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(
                            selected = (mode == currentMode),
                            onClick = null,
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(text = label, style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
    )
}

@Composable
private fun SearchField(
    query: String,
    label: String,
    onChange: (String) -> Unit,
) {
    OutlinedTextField(
        value = query,
        onValueChange = onChange,
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text(label) },
        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = { onChange("") }) {
                    Icon(Icons.Default.Clear, contentDescription = "Clear search")
                }
            }
        },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
    )
}

private suspend fun viewModelNotificationPreference(viewModel: RateStackViewModel, context: Context): Boolean =
    PreferencesRepository(context.applicationContext).notificationsEnabled()

private fun routeTitle(route: String?): String = when {
    route?.startsWith("states") == true -> "Select State"
    route?.startsWith("cities") == true -> "Select City"
    route?.startsWith("rates") == true -> "Rate Details"
    route == Routes.FAVORITES -> "Favorites"
    route == Routes.MY_ORDERS -> "My Dashboard"
    route == Routes.SCHEMES -> "Shop"
    route == Routes.SETTINGS -> "Settings"
    else -> "RateStack"
}

private fun navigateLink(
    navController: NavHostController,
    raw: String,
) {
    when (val destination = NativeDeepLinkResolver(BuildConfig.TRUSTED_HOST).resolve(raw)) {
        NativeDestination.Home -> navController.navigate(Routes.HOME)
        NativeDestination.Shop -> navController.navigate(Routes.SCHEMES)
        is NativeDestination.External -> Unit
    }
}

class RateStackViewModelFactory(private val repository: RateRepository, private val preferences: PreferencesStore) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = RateStackViewModel(repository, preferences) as T
}

class SchemeViewModelFactory(private val repository: com.ratestack.app.data.SchemeRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = com.ratestack.app.ui.schemes.SchemeViewModel(repository) as T
}

private fun LoadState.Ready<RateDetails>.fromCache(): Boolean = fromCache
