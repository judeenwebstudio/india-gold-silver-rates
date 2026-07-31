package com.ratestack.app.data

import java.math.BigDecimal
import java.math.RoundingMode

val SILVER_WEIGHT_OPTIONS = listOf(1, 5, 10, 20, 50, 100, 250, 500, 1000)
const val DEFAULT_SILVER_WEIGHT_GRAMS = 10

fun normalizeSilverPerGram(sourcePer10Gram: String): BigDecimal? = runCatching {
    BigDecimal(sourcePer10Gram).takeIf { it > BigDecimal.ZERO }
        ?.divide(BigDecimal.TEN, 4, RoundingMode.HALF_UP)
}.getOrNull()

fun silverValuePaise(ratePerGram: String, weightGrams: Int): Long? {
    if (weightGrams !in SILVER_WEIGHT_OPTIONS) return null
    return runCatching {
        BigDecimal(ratePerGram).takeIf { it > BigDecimal.ZERO }
            ?.multiply(BigDecimal(weightGrams))?.movePointRight(2)
            ?.setScale(0, RoundingMode.HALF_UP)?.longValueExact()
    }.getOrNull()
}

fun silverWeightLabel(grams: Int) = if (grams == 1000) "1 kg" else "$grams g"
