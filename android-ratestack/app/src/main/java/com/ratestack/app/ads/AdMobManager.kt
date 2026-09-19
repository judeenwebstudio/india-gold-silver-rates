package com.ratestack.app.ads

import android.app.Activity
import android.content.Context
import android.util.Log
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.ratestack.app.BuildConfig

object AdMobManager {
    private const val TAG = "AdMobManager"
    const val MIN_INTERVAL_MS = 180_000L // 180 seconds (3 minutes)
    const val MIN_ELIGIBLE_TRANSITIONS = 3

    private var interstitialAd: InterstitialAd? = null
    private var isLoadingInterstitial = false
    private var lastShownTimestampMs = 0L
    private var eligibleTransitionCount = 0

    // Explicitly excluded routes where Interstitial Ads must NEVER be shown
    val EXCLUDED_ROUTE_PREFIXES = listOf(
        "customer_login",
        "customer_register",
        "forgot_password",
        "otp_verification",
        "reset_password",
        "scheme_join",
        "scheme_dashboard",
        "order_tracking",
        "checkout",
        "payment",
    )

    fun isRouteEligible(route: String?): Boolean {
        if (route.isNullOrBlank()) return false
        val cleanRoute = route.lowercase()
        return EXCLUDED_ROUTE_PREFIXES.none { prefix -> cleanRoute.startsWith(prefix) }
    }

    fun isTransitionEligible(fromRoute: String?, toRoute: String?): Boolean {
        if (!isRouteEligible(fromRoute) || !isRouteEligible(toRoute)) return false
        if (fromRoute == toRoute) return false
        return true
    }

    fun shouldShowInterstitial(currentTimeMs: Long): Boolean {
        val timePassed = currentTimeMs - lastShownTimestampMs
        val cooldownSatisfied = timePassed >= MIN_INTERVAL_MS
        val transitionThresholdSatisfied = eligibleTransitionCount >= MIN_ELIGIBLE_TRANSITIONS
        return cooldownSatisfied && transitionThresholdSatisfied && interstitialAd != null
    }

    private fun logDebug(tag: String, msg: String) {
        if (BuildConfig.DEBUG) {
            runCatching { Log.d(tag, msg) }
        }
    }

    private fun logWarning(tag: String, msg: String) {
        if (BuildConfig.DEBUG) {
            runCatching { Log.w(tag, msg) }
        }
    }

    fun recordEligibleTransition(fromRoute: String?, toRoute: String?): Boolean {
        if (isTransitionEligible(fromRoute, toRoute)) {
            eligibleTransitionCount++
            logDebug(TAG, "Recorded eligible transition ($fromRoute -> $toRoute). Current count: $eligibleTransitionCount")
            return true
        }
        return false
    }

    fun resetMetricsForTest() {
        lastShownTimestampMs = 0L
        eligibleTransitionCount = 0
        interstitialAd = null
        isLoadingInterstitial = false
    }

    fun preloadInterstitial(context: Context) {
        if (interstitialAd != null || isLoadingInterstitial) return

        isLoadingInterstitial = true
        val adUnitId = BuildConfig.ADMOB_INTERSTITIAL_ID
        logDebug(TAG, "Preloading interstitial with adUnitId: $adUnitId")

        val adRequest = AdRequest.Builder().build()
        InterstitialAd.load(
            context.applicationContext,
            adUnitId,
            adRequest,
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialAd = ad
                    isLoadingInterstitial = false
                    logDebug(TAG, "Interstitial ad loaded successfully")
                }

                override fun onAdFailedToLoad(loadAdError: LoadAdError) {
                    interstitialAd = null
                    isLoadingInterstitial = false
                    logWarning(TAG, "Interstitial ad failed to load: ${loadAdError.message}")
                }
            }
        )
    }

    fun showInterstitialIfReady(
        activity: Activity,
        currentTimeMs: Long = System.currentTimeMillis(),
        onAdClosedOrFailed: () -> Unit
    ) {
        val ad = interstitialAd
        if (ad != null && shouldShowInterstitial(currentTimeMs)) {
            ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                override fun onAdDismissedFullScreenContent() {
                    interstitialAd = null
                    lastShownTimestampMs = System.currentTimeMillis()
                    eligibleTransitionCount = 0
                    logDebug(TAG, "Interstitial ad dismissed")
                    preloadInterstitial(activity)
                    onAdClosedOrFailed()
                }

                override fun onAdFailedToShowFullScreenContent(adError: com.google.android.gms.ads.AdError) {
                    interstitialAd = null
                    logWarning(TAG, "Interstitial ad failed to show: ${adError.message}")
                    preloadInterstitial(activity)
                    onAdClosedOrFailed()
                }

                override fun onAdShowedFullScreenContent() {
                    interstitialAd = null
                    logDebug(TAG, "Interstitial ad shown")
                }
            }
            ad.show(activity)
        } else {
            onAdClosedOrFailed()
        }
    }

    fun checkAndShowOnTransition(
        activity: Activity,
        fromRoute: String?,
        toRoute: String?,
        onComplete: () -> Unit
    ) {
        recordEligibleTransition(fromRoute, toRoute)
        val now = System.currentTimeMillis()
        if (shouldShowInterstitial(now)) {
            showInterstitialIfReady(activity, now, onComplete)
        } else {
            preloadInterstitial(activity)
            onComplete()
        }
    }
}
