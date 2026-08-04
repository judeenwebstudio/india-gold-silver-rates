package com.ratestack.app.data

import android.util.Log
import com.ratestack.app.BuildConfig
import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

data class ApiErrorInfo(
    val code: String?,
    val message: String?,
)

internal fun parseApiErrorInfo(rawBody: String?): ApiErrorInfo {
    val payload = runCatching {
        rawBody?.let { Gson().fromJson(it, JsonObject::class.java) }
    }.getOrNull()
    val error = payload?.getAsJsonObject("error")
    return ApiErrorInfo(
        code = (error?.get("code") ?: payload?.get("code")).stringOrNull(),
        message = (error?.get("message") ?: payload?.get("message")).stringOrNull(),
    )
}

private fun JsonElement?.stringOrNull(): String? = runCatching {
    this?.takeUnless { it.isJsonNull }?.asString?.takeIf { it.isNotBlank() }
}.getOrNull()

object ApiProvider {
    @Volatile private var tokenProvider: (() -> String?)? = null

    fun setTokenProvider(provider: () -> String?) {
        tokenProvider = provider
    }

    val service: RateStackApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.WEBSITE_URL.trimEnd('/') + "/")
            .client(
                OkHttpClient.Builder()
                    .addInterceptor { chain ->
                        val requestBuilder = chain.request().newBuilder()
                            .header("X-RateStack-Platform", "ANDROID")
                            .header("X-RateStack-App-Version", BuildConfig.VERSION_NAME)

                        val existingAuth = chain.request().header("Authorization")
                        if (existingAuth.isNullOrBlank()) {
                            val token = tokenProvider?.invoke()
                            if (!token.isNullOrBlank()) {
                                requestBuilder.header("Authorization", "Bearer ${token.trim()}")
                            }
                        }

                        chain.proceed(requestBuilder.build())
                    }
                    .connectTimeout(10, TimeUnit.SECONDS)
                    .readTimeout(15, TimeUnit.SECONDS)
                    .writeTimeout(15, TimeUnit.SECONDS)
                    .build(),
            )
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(RateStackApi::class.java)
    }

    fun errorInfo(response: retrofit2.Response<*>): ApiErrorInfo {
        val error = parseApiErrorInfo(runCatching { response.errorBody()?.string() }.getOrNull())
        Log.w("RateStackApi", "request failed status=${response.code()} code=${error.code ?: "UNKNOWN"}")
        return error
    }

    fun errorMessage(response: retrofit2.Response<*>, fallback: String): String {
        return errorInfo(response).message ?: fallback
    }
}
