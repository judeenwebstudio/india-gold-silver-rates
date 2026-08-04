package com.ratestack.app.data

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class WishlistRepository(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("ratestack_wishlist_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val _items = MutableStateFlow<List<ShopProductDto>>(emptyList())
    val items: StateFlow<List<ShopProductDto>> = _items.asStateFlow()

    init {
        loadWishlist()
    }

    private fun loadWishlist() {
        val json = prefs.getString("wishlist_items", null)
        if (!json.isNullOrBlank()) {
            runCatching {
                val type = object : TypeToken<List<ShopProductDto>>() {}.type
                val loaded: List<ShopProductDto> = gson.fromJson(json, type)
                _items.value = loaded
            }
        }
    }

    private fun saveWishlist(newList: List<ShopProductDto>) {
        _items.value = newList
        val json = gson.toJson(newList)
        prefs.edit().putString("wishlist_items", json).apply()
    }

    fun toggleWishlist(product: ShopProductDto) {
        val current = _items.value.toMutableList()
        val pId = product.productId.orEmpty()
        val index = current.indexOfFirst { it.productId.orEmpty() == pId }
        if (index >= 0) {
            current.removeAt(index)
        } else {
            current.add(product)
        }
        saveWishlist(current)
    }

    fun isWishlisted(productId: String): Boolean {
        return _items.value.any { it.productId.orEmpty() == productId }
    }
}
