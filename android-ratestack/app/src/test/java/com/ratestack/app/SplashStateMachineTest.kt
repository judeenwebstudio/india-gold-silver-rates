package com.ratestack.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SplashStateMachineTest {

    @Test
    fun testNormalPlaybackFlowTriggersAppStartOnce() {
        var appStartedCount = 0
        val stateMachine = SplashStateMachine { appStartedCount++ }

        assertEquals(SplashState.INITIALIZING, stateMachine.state)
        stateMachine.onReady()
        assertEquals(SplashState.READY, stateMachine.state)

        stateMachine.onFirstFrameRendered()
        assertEquals(SplashState.FIRST_FRAME_RENDERED, stateMachine.state)

        stateMachine.onPlaybackEnded(firstFrameRendered = true)
        assertEquals(SplashState.APP_STARTED, stateMachine.state)
        assertEquals(1, appStartedCount)

        // Duplicate call should be idempotent
        stateMachine.onPlaybackEnded(firstFrameRendered = true)
        assertEquals(1, appStartedCount)
    }

    @Test
    fun testErrorFlowTriggersAppStartOnce() {
        var appStartedCount = 0
        val stateMachine = SplashStateMachine { appStartedCount++ }

        stateMachine.onError("DECODER_ERROR")
        assertEquals(SplashState.APP_STARTED, stateMachine.state)
        assertEquals(1, appStartedCount)

        // Subsequent timeout or completion ignored
        stateMachine.onTimeout()
        assertEquals(1, appStartedCount)
    }

    @Test
    fun testTimeoutFlowTriggersAppStartOnce() {
        var appStartedCount = 0
        val stateMachine = SplashStateMachine { appStartedCount++ }

        stateMachine.onTimeout()
        assertEquals(SplashState.APP_STARTED, stateMachine.state)
        assertEquals(1, appStartedCount)

        // Late playback completion does not duplicate app start
        stateMachine.onPlaybackEnded(firstFrameRendered = true)
        assertEquals(1, appStartedCount)
    }

    @Test
    fun testCompletionTriggersAppStart() {
        var appStartedCount = 0
        val stateMachine = SplashStateMachine { appStartedCount++ }

        stateMachine.onReady()
        stateMachine.onPlaybackEnded(firstFrameRendered = false)

        assertEquals(SplashState.APP_STARTED, stateMachine.state)
        assertEquals(1, appStartedCount)
    }
}
