package com.ratestack.app.data

import android.util.Log
import com.ratestack.app.BuildConfig
import com.google.gson.Gson
import com.google.gson.JsonObject
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiProvider {
    private val gson = Gson()
    val service: RateStackApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.WEBSITE_URL.trimEnd('/') + "/")
            .client(
                OkHttpClient.Builder()
                    .connectTimeout(10, TimeUnit.SECONDS)
                    .readTimeout(15, TimeUnit.SECONDS)
                    .writeTimeout(15, TimeUnit.SECONDS)
                    .build(),
            )
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(RateStackApi::class.java)
    }

    fun errorMessage(response: retrofit2.Response<*>, fallback: String): String {
        val payload = runCatching {
            response.errorBody()?.string()?.let { gson.fromJson(it, JsonObject::class.java) }
        }.getOrNull()
        val error = payload?.getAsJsonObject("error")
        val code = error?.get("code")?.asString
        val message = error?.get("message")?.asString
        Log.w("RateStackApi", "request failed status=${response.code()} code=${code ?: "UNKNOWN"}")
        return message?.takeIf { it.isNotBlank() } ?: fallback
    }
}
