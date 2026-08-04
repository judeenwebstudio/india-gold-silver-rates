package com.ratestack.app.data

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.math.BigDecimal
import java.math.RoundingMode

data class CartItem(
    val product: ShopProductDto,
    val selectedWeightGrams: Double,
    val quantity: Int,
) {
    fun calculateTotal(liveRatePerGram: Double): Double {
        val rate = if (liveRatePerGram > 0) liveRatePerGram else (product.ratePerGram ?: 0.0)
        val metalValue = BigDecimal.valueOf(rate).multiply(BigDecimal.valueOf(selectedWeightGrams)).setScale(2, RoundingMode.HALF_UP).toDouble()
        val serviceCharge = ((product.serviceChargePercent ?: 0.0) / 100.0) * metalValue
        val gst = BigDecimal.valueOf(metalValue + serviceCharge).multiply(BigDecimal.valueOf(0.03)).setScale(2, RoundingMode.HALF_UP).toDouble()
        return (metalValue + serviceCharge + gst) * quantity
    }
}

class CartRepository(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("ratestack_cart_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val _items = MutableStateFlow<List<CartItem>>(emptyList())
    val items: StateFlow<List<CartItem>> = _items.asStateFlow()

    init {
        loadCart()
    }

    private fun loadCart() {
        val json = prefs.getString("cart_items", null)
        if (!json.isNullOrBlank()) {
            runCatching {
                val type = object : TypeToken<List<CartItem>>() {}.type
                val loaded: List<CartItem> = gson.fromJson(json, type)
                _items.value = loaded
            }
        }
    }

    private fun saveCart(newList: List<CartItem>) {
        _items.value = newList
        val json = gson.toJson(newList)
        prefs.edit().putString("cart_items", json).apply()
    }

    fun addToCart(product: ShopProductDto, weightGrams: Double, quantity: Int) {
        val current = _items.value.toMutableList()
        val pId = product.productId.orEmpty()
        val existingIndex = current.indexOfFirst { it.product.productId.orEmpty() == pId && it.selectedWeightGrams == weightGrams }
        if (existingIndex >= 0) {
            val existing = current[existingIndex]
            current[existingIndex] = existing.copy(quantity = existing.quantity + quantity)
        } else {
            current.add(CartItem(product, weightGrams, quantity))
        }
        saveCart(current)
    }

    fun removeFromCart(productId: String, weightGrams: Double) {
        val current = _items.value.filterNot { it.product.productId.orEmpty() == productId && it.selectedWeightGrams == weightGrams }
        saveCart(current)
    }

    fun updateQuantity(productId: String, weightGrams: Double, quantity: Int) {
        if (quantity <= 0) {
            removeFromCart(productId, weightGrams)
            return
        }
        val current = _items.value.toMutableList()
        val index = current.indexOfFirst { it.product.productId.orEmpty() == productId && it.selectedWeightGrams == weightGrams }
        if (index >= 0) {
            current[index] = current[index].copy(quantity = quantity)
            saveCart(current)
        }
    }

    fun clearCart() {
        saveCart(emptyList())
    }
}
