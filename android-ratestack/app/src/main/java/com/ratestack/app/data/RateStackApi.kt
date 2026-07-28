package com.ratestack.app.data

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface RateStackApi {
    @GET("api/v1/payment/config")
    suspend fun getPaymentConfig(): Response<PaymentConfigDto>

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

    // Savings Scheme Endpoints
    @GET("api/v1/schemes")
    suspend fun getSchemes(): Response<ApiEnvelope<SchemeListResponseDto>>

    @POST("api/v1/auth/register")
    suspend fun registerUser(
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<ApiEnvelope<AuthResponseDto>>

    @POST("api/v1/auth/login")
    suspend fun loginUser(
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<ApiEnvelope<AuthResponseDto>>

    @POST("api/v1/auth/forgot-password/request-otp")
    suspend fun requestPasswordResetOtp(
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<ApiEnvelope<Map<String, String>>>

    @POST("api/v1/auth/forgot-password/verify-otp")
    suspend fun verifyPasswordResetOtp(
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<VerifyOtpResponseDto>

    @POST("api/v1/auth/forgot-password/reset")
    suspend fun resetPassword(
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<ApiEnvelope<Map<String, String>>>

    @POST("api/v1/schemes/{id}/join")
    suspend fun joinScheme(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @Path("id") planId: String,
        @retrofit2.http.Body request: JoinSchemeRequestDto,
    ): Response<ApiEnvelope<JoinSchemeResponseDto>>

    @GET("api/v1/me/schemes")
    suspend fun getMySchemes(
        @retrofit2.http.Header("Authorization") authHeader: String,
    ): Response<ApiEnvelope<List<SchemeEnrollmentDto>>>

    @GET("api/v1/me/schemes/{enrollmentId}")
    suspend fun getSchemeDashboard(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @Path("enrollmentId") enrollmentId: String,
    ): Response<ApiEnvelope<SchemeDashboardDto>>

    @POST("api/v1/me/schemes/{enrollmentId}/payments/order")
    suspend fun createPaymentOrder(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @Path("enrollmentId") enrollmentId: String,
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<ApiEnvelope<PaymentOrderResponseDto>>

    @POST("api/v1/me/schemes/{enrollmentId}/payments/verify")
    suspend fun verifyPayment(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @Path("enrollmentId") enrollmentId: String,
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<ApiEnvelope<Map<String, String>>>

    @POST("api/v1/me/schemes/{enrollmentId}/redemption/quotation")
    suspend fun requestRedemptionQuotation(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @Path("enrollmentId") enrollmentId: String,
        @retrofit2.http.Body request: RedemptionQuotationRequestDto,
    ): Response<ApiEnvelope<RedemptionQuotationDto>>

    @POST("api/v1/me/schemes/{enrollmentId}/redemption/accept")
    suspend fun acceptRedemptionQuotation(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @Path("enrollmentId") enrollmentId: String,
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<ApiEnvelope<Map<String, String>>>
}
