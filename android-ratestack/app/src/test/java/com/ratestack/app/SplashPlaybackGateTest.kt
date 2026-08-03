package com.ratestack.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SplashPlaybackGateTest {
    @Test
    fun playbackCompletionNavigatesExactlyOnce() {
        var navigations = 0
        val gate = SplashPlaybackGate { navigations++ }

        assertTrue(gate.finish())
        assertFalse(gate.finish())
        assertEquals(1, navigations)
    }

    @Test
    fun timeoutAndPlaybackErrorShareTheSameSafeExit() {
        var navigations = 0
        val gate = SplashPlaybackGate { navigations++ }

        val timeoutWon = gate.finish()
        val laterErrorIgnored = gate.finish()

        assertTrue(timeoutWon)
        assertFalse(laterErrorIgnored)
        assertEquals(1, navigations)
    }
}
