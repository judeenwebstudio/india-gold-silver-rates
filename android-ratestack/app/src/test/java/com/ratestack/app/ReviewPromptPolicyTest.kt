package com.ratestack.app

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReviewPromptPolicyTest {
    private val policy = ReviewPromptPolicy()

    @Test
    fun requiresMultipleSuccessfulSessionsBeforeFirstAttempt() {
        assertFalse(policy.isEligible(successfulSessions = 4, lastAttemptSession = 0))
        assertTrue(policy.isEligible(successfulSessions = 5, lastAttemptSession = 0))
    }

    @Test
    fun appliesACooldownBetweenReviewAttempts() {
        assertFalse(policy.isEligible(successfulSessions = 14, lastAttemptSession = 5))
        assertTrue(policy.isEligible(successfulSessions = 15, lastAttemptSession = 5))
    }
}
