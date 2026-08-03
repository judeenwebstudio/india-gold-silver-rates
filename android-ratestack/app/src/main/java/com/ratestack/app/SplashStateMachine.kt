package com.ratestack.app

import android.util.Log
import java.util.concurrent.atomic.AtomicReference

enum class SplashState {
    INITIALIZING,
    READY,
    FIRST_FRAME_RENDERED,
    COMPLETED,
    FAILED,
    TIMED_OUT,
    APP_STARTED,
}

class SplashStateMachine(private val onAppStartRequested: () -> Unit) {

    private val currentState = AtomicReference(SplashState.INITIALIZING)

    val state: SplashState
        get() = currentState.get()

    fun logDiagnostic(message: String) {
        try {
            Log.d("RateStackSplash", message)
        } catch (_: Throwable) {
            // Log fallback for non-Android unit test environments
            println("RateStackSplash: $message")
        }
    }

    @Synchronized
    fun onReady() {
        if (currentState.get() == SplashState.INITIALIZING) {
            currentState.set(SplashState.READY)
            logDiagnostic("State transition: INITIALIZING -> READY")
        }
    }

    @Synchronized
    fun onFirstFrameRendered() {
        val current = currentState.get()
        if (current == SplashState.INITIALIZING || current == SplashState.READY) {
            currentState.set(SplashState.FIRST_FRAME_RENDERED)
            logDiagnostic("State transition: $current -> FIRST_FRAME_RENDERED")
        }
    }

    @Synchronized
    fun onPlaybackEnded(firstFrameRendered: Boolean) {
        val current = currentState.get()
        if (current == SplashState.APP_STARTED) return

        if (firstFrameRendered || current == SplashState.FIRST_FRAME_RENDERED) {
            currentState.set(SplashState.COMPLETED)
            logDiagnostic("State transition: $current -> COMPLETED")
            triggerAppStartOnce()
        } else {
            logDiagnostic("Playback ended ignored: first frame was not rendered yet")
        }
    }

    @Synchronized
    fun onError(reason: String) {
        val current = currentState.get()
        if (current == SplashState.APP_STARTED) return

        currentState.set(SplashState.FAILED)
        logDiagnostic("State transition: $current -> FAILED (reason: $reason)")
        triggerAppStartOnce()
    }

    @Synchronized
    fun onTimeout() {
        val current = currentState.get()
        if (current == SplashState.APP_STARTED || current == SplashState.COMPLETED) return

        currentState.set(SplashState.TIMED_OUT)
        logDiagnostic("State transition: $current -> TIMED_OUT")
        triggerAppStartOnce()
    }

    @Synchronized
    private fun triggerAppStartOnce() {
        val previous = currentState.getAndSet(SplashState.APP_STARTED)
        if (previous != SplashState.APP_STARTED) {
            logDiagnostic("State transition: $previous -> APP_STARTED (triggering Compose app content)")
            onAppStartRequested()
        }
    }
}
