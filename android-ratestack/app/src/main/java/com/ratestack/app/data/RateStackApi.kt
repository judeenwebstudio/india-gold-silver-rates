package com.ratestack.app.data

import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.DELETE
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface RateStackApi {
    @POST("api/v1/me/devices")
    suspend fun registerPushDevice(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @retrofit2.http.Body request: Map<String, String>,
    ): Response<ApiEnvelope<Map<String, Any>>>

    @retrofit2.http.HTTP(method = "DELETE", path = "api/v1/me/devices", hasBody = true)
    suspend fun revokePushDevice(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @retrofit2.http.Body request: Map<String, String>,
    ): Response<ApiEnvelope<Map<String, Any>>>

    @GET("api/v1/me/notification-preferences")
    suspend fun getNotificationPreferences(
        @retrofit2.http.Header("Authorization") authHeader: String,
    ): Response<ApiEnvelope<NotificationPreferencesDto>>

    @retrofit2.http.PUT("api/v1/me/notification-preferences")
    suspend fun saveNotificationPreferences(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @retrofit2.http.Body request: NotificationPreferencesDto,
    ): Response<ApiEnvelope<NotificationPreferencesDto>>

    @GET("api/v1/shop")
    suspend fun getShop(): Response<ApiEnvelope<ShopResponseDto>>

    @GET("api/v1/shop/products/{productId}")
    suspend fun getProductDetails(
        @Path("productId") productId: String,
    ): Response<ApiEnvelope<ShopProductDto>>

    @GET("api/v1/me/wishlist")
    suspend fun getWishlist(
        @retrofit2.http.Header("Authorization") authHeader: String,
    ): Response<ApiEnvelope<List<ShopProductDto>>>

    @POST("api/v1/me/wishlist")
    suspend fun addToWishlist(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @retrofit2.http.Body body: Map<String, String>,
    ): Response<ApiEnvelope<Map<String, Any>>>

    @DELETE("api/v1/me/wishlist/{productId}")
    suspend fun removeFromWishlist(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @Path("productId") productId: String,
    ): Response<ApiEnvelope<Map<String, Any>>>

    @GET("api/v1/me/notifications")
    suspend fun getNotifications(
        @retrofit2.http.Header("Authorization") authHeader: String,
    ): Response<ApiEnvelope<List<Map<String, Any>>>>

    @POST("api/v1/me/notifications/read-all")
    suspend fun markAllNotificationsRead(
        @retrofit2.http.Header("Authorization") authHeader: String,
    ): Response<ApiEnvelope<Map<String, Boolean>>>

    @retrofit2.http.PATCH("api/v1/me/notifications/{id}/read")
    suspend fun markNotificationRead(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @Path("id") id: String,
    ): Response<ApiEnvelope<Map<String, Boolean>>>

    @GET("api/v1/coupons/active")
    suspend fun getActiveCoupons(): Response<ApiEnvelope<List<CouponDto>>>

    @POST("api/v1/coupons/validate")
    suspend fun validateCoupon(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @retrofit2.http.Body request: CouponValidateRequestDto,
    ): Response<ApiEnvelope<CouponValidationDto>>

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

    @GET("api/v1/me/dashboard")
    suspend fun getCustomerDashboard(
        @retrofit2.http.Header("Authorization") authHeader: String,
    ): Response<ApiEnvelope<CustomerDashboardDto>>

    @GET("api/v1/me/gst-profile")
    suspend fun getGstProfile(@retrofit2.http.Header("Authorization") authHeader:String):Response<ApiEnvelope<CustomerGstProfileDto>>

    @retrofit2.http.PUT("api/v1/me/gst-profile")
    suspend fun saveGstProfile(@retrofit2.http.Header("Authorization") authHeader:String,@retrofit2.http.Body request:GstDetailsDto):Response<ApiEnvelope<CustomerGstProfileDto>>

    @DELETE("api/v1/me/gst-profile")
    suspend fun deleteGstProfile(@retrofit2.http.Header("Authorization") authHeader:String):Response<ApiEnvelope<Map<String,Boolean>>>

    @retrofit2.http.PATCH("api/v1/me/gst-profile")
    suspend fun toggleGstProfile(@retrofit2.http.Header("Authorization") authHeader:String,@retrofit2.http.Body request:Map<String,Boolean>):Response<ApiEnvelope<CustomerGstProfileDto>>

    @GET("api/v1/me/orders/{orderId}/tracking")
    suspend fun getOrderTracking(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @Path("orderId") orderId: String,
    ): Response<ApiEnvelope<OrderTrackingResponseDto>>

    @POST("api/v1/me/orders/{orderId}/tracking")
    suspend fun refreshOrderTracking(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @Path("orderId") orderId: String,
    ): Response<ApiEnvelope<OrderTrackingResponseDto>>


    @GET("api/v1/me/orders/{orderId}/invoice")
    suspend fun downloadShopInvoice(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @Path("orderId") orderId: String,
    ): Response<ResponseBody>

    @GET("api/v1/me/addresses")
    suspend fun getDeliveryAddresses(
        @retrofit2.http.Header("Authorization") authHeader: String,
    ): Response<ApiEnvelope<List<ShopAddressDto>>>

    @POST("api/v1/me/addresses")
    suspend fun createDeliveryAddress(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @retrofit2.http.Body request: ShopAddressDto,
    ): Response<ApiEnvelope<ShopAddressDto>>

    @retrofit2.http.PUT("api/v1/me/addresses/{addressId}")
    suspend fun updateDeliveryAddress(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @Path("addressId") addressId: String,
        @retrofit2.http.Body request: ShopAddressDto,
    ): Response<ApiEnvelope<ShopAddressDto>>

    @DELETE("api/v1/me/addresses/{addressId}")
    suspend fun deleteDeliveryAddress(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @Path("addressId") addressId: String,
    ): Response<ApiEnvelope<Map<String, String>>>

    @POST("api/v1/me/addresses/{addressId}/default")
    suspend fun setDefaultDeliveryAddress(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @Path("addressId") addressId: String,
    ): Response<ApiEnvelope<ShopAddressDto>>

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
