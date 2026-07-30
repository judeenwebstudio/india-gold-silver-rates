package com.ratestack.app.data

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.DELETE
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface RateStackApi {
    @GET("api/v1/shop")
    suspend fun getShop(): Response<ApiEnvelope<ShopResponseDto>>

    @POST("api/v1/shop/checkout")
    suspend fun createShopCheckout(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @retrofit2.http.Body request: ShopCheckoutRequestDto,
    ): Response<ApiEnvelope<ShopCheckoutDto>>

    @POST("api/v1/shop/verify")
    suspend fun verifyShopPayment(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @retrofit2.http.Body request: ShopVerifyRequestDto,
    ): Response<ApiEnvelope<ShopVerifyResultDto>>

    @GET("api/v1/me/orders")
    suspend fun getShopOrders(
        @retrofit2.http.Header("Authorization") authHeader: String,
    ): Response<ApiEnvelope<List<ShopOrderDto>>>

    @GET("api/v1/me/addresses")
    suspend fun getDeliveryAddresses(
        @retrofit2.http.Header("Authorization") authHeader: String,
    ): Response<ApiEnvelope<List<ShopAddressDto>>>

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

    @GET("api/v1/rates/history")
    suspend fun getRateHistory(
        @Query("city") city: String = "tiruchirappalli",
        @Query("days") days: Int = 7,
        @Query("metal") metal: String = "gold22k",
        @Query("unit") unit: String = "gram",
    ): Response<ApiEnvelope<RateHistoryDto>>

    @GET("api/v1/rates/cities")
    suspend fun getCityComparison(
        @Query("metal") metal: String = "gold22k",
        @Query("sort") sort: String = "asc",
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 12,
        @Query("search") search: String? = null,
        @Query("state") state: String? = null,
        @Query("rateType") rateType: String = "ALL",
    ): Response<ApiEnvelope<CityComparisonDto>>

    // Savings Scheme Endpoints
    @GET("api/v1/schemes")
    suspend fun getSchemes(): Response<ApiEnvelope<SchemeListResponseDto>>

    @POST("api/v1/auth/register")
    suspend fun registerUser(
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<ApiEnvelope<AuthResponseDto>>

    @POST("api/v1/auth/register/email")
    suspend fun registerEmailUser(
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<ApiEnvelope<AuthResponseDto>>

    @POST("api/v1/auth/forgot-password/email")
    suspend fun requestEmailPasswordReset(
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<ApiEnvelope<GoogleConnectionDto>>

    @POST("api/v1/auth/login")
    suspend fun loginUser(
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<ApiEnvelope<AuthResponseDto>>

    @POST("api/v1/auth/google")
    suspend fun googleSignIn(
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<ApiEnvelope<AuthResponseDto>>

    @GET("api/v1/me/profile")
    suspend fun getCustomerProfile(
        @retrofit2.http.Header("Authorization") authHeader: String,
    ): Response<ApiEnvelope<CustomerProfileDto>>

    @POST("api/v1/me/profile")
    suspend fun connectGoogleAccount(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<ApiEnvelope<GoogleConnectionDto>>

    @DELETE("api/v1/me/profile")
    suspend fun disconnectGoogleAccount(
        @retrofit2.http.Header("Authorization") authHeader: String,
    ): Response<ApiEnvelope<Map<String, String>>>

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
