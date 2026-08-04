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

internal fun sanitizeToken(raw: String?): String {
    if (raw.isNullOrBlank()) return ""
    var t = raw.trim()
    while (t.startsWith("Bearer ", ignoreCase = true)) {
        t = t.substring(7).trim()
    }
    return t.removeSurrounding("\"").removeSurrounding("'").trim()
}

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
                        val originalRequest = chain.request()
                        var finalAuth = originalRequest.header("Authorization")?.trim()

                        if (finalAuth.isNullOrBlank() || finalAuth.equals("Bearer", ignoreCase = true) || finalAuth.equals("Bearer ", ignoreCase = true)) {
                            val token = tokenProvider?.invoke()
                            val cleanToken = sanitizeToken(token)
                            if (cleanToken.isNotBlank()) {
                                finalAuth = "Bearer $cleanToken"
                            }
                        } else {
                            var clean = finalAuth.orEmpty()
                            while (clean.startsWith("Bearer ", ignoreCase = true)) {
                                clean = clean.substring(7).trim()
                            }
                            clean = clean.removeSurrounding("\"").removeSurrounding("'").trim()
                            finalAuth = if (clean.isNotBlank()) "Bearer $clean" else null
                        }

                        val requestBuilder = originalRequest.newBuilder()
                            .header("X-RateStack-Platform", "ANDROID")
                            .header("X-RateStack-App-Version", BuildConfig.VERSION_NAME)

                        if (!finalAuth.isNullOrBlank()) {
                            requestBuilder.header("Authorization", finalAuth)
                        }

                        var response = chain.proceed(requestBuilder.build())

                        // Follow domain redirects (e.g., HTTP 301/302/307/308) while preserving Authorization header
                        if ((response.code == 301 || response.code == 302 || response.code == 307 || response.code == 308) && !finalAuth.isNullOrBlank()) {
                            val location = response.header("Location")
                            if (!location.isNullOrBlank()) {
                                response.close()
                                val redirectRequest = originalRequest.newBuilder()
                                    .url(location)
                                    .header("X-RateStack-Platform", "ANDROID")
                                    .header("X-RateStack-App-Version", BuildConfig.VERSION_NAME)
                                    .header("Authorization", finalAuth)
                                    .build()
                                response = chain.proceed(redirectRequest)
                            }
                        }

                        response
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
