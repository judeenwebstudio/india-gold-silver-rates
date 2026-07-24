package com.ratestack.app

internal class ReviewPromptPolicy(
    private val minimumSuccessfulSessions: Int = 5,
    private val sessionsBetweenAttempts: Int = 10,
) {
    fun isEligible(successfulSessions: Int, lastAttemptSession: Int): Boolean {
        if (successfulSessions < minimumSuccessfulSessions) {
            return false
        }
        return lastAttemptSession == 0 ||
            successfulSessions - lastAttemptSession >= sessionsBetweenAttempts
    }
}
