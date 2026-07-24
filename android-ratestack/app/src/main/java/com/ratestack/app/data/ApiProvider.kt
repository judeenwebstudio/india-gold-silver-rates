package com.ratestack.app.data

import com.ratestack.app.BuildConfig
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiProvider {
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
}
