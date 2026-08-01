package com.ratestack.app.data

enum class AuthDestinationType { DEFAULT, SHOP, DASHBOARD, CHECKOUT }

data class PendingAuthDestination(
    val type: AuthDestinationType,
    val productId: String? = null,
    val weightGrams: Double? = null,
    val quantity: Int? = null,
) {
    companion object {
        fun checkout(productId: String, weightGrams: Double, quantity: Int) =
            PendingAuthDestination(AuthDestinationType.CHECKOUT, productId, weightGrams, quantity)
    }

    fun validCheckout() = type == AuthDestinationType.CHECKOUT && !productId.isNullOrBlank() &&
        weightGrams != null && weightGrams > 0 && quantity != null && quantity in 1..10
}
