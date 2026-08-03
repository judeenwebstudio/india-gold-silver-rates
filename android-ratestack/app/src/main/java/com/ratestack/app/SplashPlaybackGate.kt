package com.ratestack.app

import java.util.concurrent.atomic.AtomicBoolean

internal class SplashPlaybackGate(private val navigate: () -> Unit) {
    private val completed = AtomicBoolean(false)

    fun finish(): Boolean {
        if (!completed.compareAndSet(false, true)) return false
        navigate()
        return true
    }
}
