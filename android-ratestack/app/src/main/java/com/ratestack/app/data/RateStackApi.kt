package com.ratestack.app.data

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path

interface RateStackApi {
    @GET("api/v1/home")
    suspend fun getHome(): Response<ApiEnvelope<HomeDto>>

    @GET("api/v1/states")
    suspend fun getStates(): Response<ApiEnvelope<StateListDto>>

    @GET("api/v1/cities")
    suspend fun getCities(): Response<ApiEnvelope<CityListDto>>

    @GET("api/v1/rates/{state}/{city}")
    suspend fun getRates(
        @Path("state") state: String,
        @Path("city") city: String,
    ): Response<ApiEnvelope<CityRatesDto>>
}
