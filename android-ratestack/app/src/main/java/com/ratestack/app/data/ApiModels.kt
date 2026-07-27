package com.ratestack.app.data

data class ApiEnvelope<T>(
    val success: Boolean,
    val data: T?,
    val error: ApiErrorDto?,
    val meta: ApiMetaDto?,
)

data class ApiErrorDto(
    val code: String?,
    val message: String?,
)

data class ApiMetaDto(
    val apiVersion: String?,
)

data class HomeDto(
    val latestGoldRates: List<RateDto>?,
    val latestSilverRate: SilverRateDto?,
    val lastUpdated: String?,
    val source: SourceDto?,
    val featuredCities: List<FeaturedCityDto>?,
)

data class StateListDto(
    val states: List<StateDto>?,
    val total: Int?,
)

data class CityListDto(
    val cities: List<CityDto>?,
    val total: Int?,
)

data class CityRatesDto(
    val state: LocationDto?,
    val city: LocationDto?,
    val goldRates: List<RateDto>?,
    val silverRate: SilverRateDto?,
    val lastUpdated: String?,
    val source: SourceDto?,
    val indicative: Boolean?,
)

data class RateDto(
    val purity: String?,
    val pricePerGram: Double?,
    val previousPricePerGram: Double?,
    val change: Double?,
    val changePercent: Double?,
    val currency: String?,
)

data class SilverRateDto(
    val purity: String?,
    val pricePerGram: Double?,
    val pricePerKilogram: Double?,
    val previousPricePerGram: Double?,
    val changePerGram: Double?,
    val changePercent: Double?,
    val currency: String?,
)

data class SourceDto(
    val name: String?,
    val timestamp: String?,
)

data class FeaturedCityDto(
    val name: String?,
    val slug: String?,
    val state: LocationDto?,
    val ratesUrl: String?,
)

data class StateDto(
    val name: String?,
    val slug: String?,
    val code: String?,
    val cityCount: Int?,
)

data class CityDto(
    val name: String?,
    val slug: String?,
    val state: LocationDto?,
    val ratesUrl: String?,
)

data class LocationDto(
    val name: String?,
    val slug: String?,
    val code: String? = null,
)

data class GoldRate(
    val purity: String,
    val pricePerGram: Double,
    val previousPricePerGram: Double?,
    val change: Double?,
    val changePercent: Double?,
    val currency: String,
)

data class SilverRate(
    val purity: String,
    val pricePerGram: Double,
    val pricePerKilogram: Double?,
    val previousPricePerGram: Double?,
    val changePerGram: Double?,
    val changePercent: Double?,
    val currency: String,
)

data class SourceInfo(
    val name: String,
    val timestamp: String,
)

data class Location(
    val name: String,
    val slug: String,
    val code: String? = null,
)

data class FeaturedCity(
    val name: String,
    val slug: String,
    val state: Location,
)

data class HomeData(
    val latestGoldRates: List<GoldRate>,
    val latestSilverRate: SilverRate,
    val lastUpdated: String,
    val source: SourceInfo,
    val featuredCities: List<FeaturedCity>,
)

data class StateOption(
    val name: String,
    val slug: String,
    val code: String,
    val cityCount: Int,
)

data class CityOption(
    val name: String,
    val slug: String,
    val state: Location,
)

data class RateDetails(
    val state: Location,
    val city: Location,
    val goldRates: List<GoldRate>,
    val silverRate: SilverRate,
    val lastUpdated: String,
    val source: SourceInfo,
    val indicative: Boolean,
)

sealed interface RepositoryResult<out T> {
    data class Success<T>(
        val data: T,
        val fromCache: Boolean = false,
        val warning: String? = null,
    ) : RepositoryResult<T>

    data class Failure(
        val message: String,
        val retryable: Boolean = true,
    ) : RepositoryResult<Nothing>
}

// Savings Scheme DTOs
data class JoinSchemeRequestDto(
    val monthlyAmount: Double,
    val nomineeFullName: String,
    val nomineeRelationship: String,
    val nomineePhone: String? = null,
    val nomineeAge: Int? = null,
    val acceptedTermsVersion: String = "v1.0-2026",
)

data class JoinSchemeResponseDto(
    val enrollmentId: String?,
    val accountNumber: String?,
    val productName: String?,
    val monthlyAmount: Double?,
    val totalScheduledAmount: Double?,
    val tenureMonths: Int?,
    val startDate: String?,
    val maturityDate: String?,
)

data class RedemptionQuotationRequestDto(
    val coinDenominationId: String? = null,
)

data class VerifyOtpResponseDto(
    val success: Boolean,
    val resetToken: String?,
    val error: ApiErrorDto?,
)

data class SchemeListResponseDto(
    val plans: List<SchemePlanDto>?,
    val prevailingRates: SchemePrevailingRatesDto?,
)

data class SchemePrevailingRatesDto(
    val gold22kPerGram: Double?,
    val silver999PerGram: Double?,
)

data class SchemePlanDto(
    val id: String?,
    val name: String?,
    val metalType: String?,
    val purity: String?,
    val tenureMonths: Int?,
    val minMonthlyAmount: Double?,
    val maxMonthlyAmount: Double?,
    val presetAmounts: List<Double>?,
    val gracePeriodDays: Int?,
    val termsVersion: String?,
    val kycRequired: Boolean?,
    val coinDenominations: List<CoinDenomDto>?,
    val minCoinEstPriceInr: Double?,
)

data class CoinDenomDto(
    val id: String?,
    val title: String?,
    val weightGrams: Double?,
    val mintingFee: Double?,
    val packagingFee: Double?,
    val inStock: Boolean?,
)

data class SchemeEnrollmentDto(
    val id: String?,
    val accountNumber: String?,
    val productName: String?,
    val metalType: String?,
    val purity: String?,
    val tenureMonths: Int?,
    val monthlyAmount: Double?,
    val totalScheduledAmount: Double?,
    val schemePurchaseBalance: Double?,
    val remainingAmount: Double?,
    val paidInstallmentCount: Int?,
    val remainingInstallmentCount: Int?,
    val nextDueDate: String?,
    val overdueAmount: Double?,
    val status: String?,
    val progressPercent: Double?,
    val startDate: String?,
    val maturityDate: String?,
)

data class EnrollmentSummaryDto(
    val id: String?,
    val accountNumber: String?,
    val productName: String?,
    val metalType: String?,
    val purity: String?,
    val tenureMonths: Int?,
    val monthlyAmount: Double?,
    val totalScheduledAmount: Double?,
    val startDate: String?,
    val maturityDate: String?,
    val nextDueDate: String?,
    val status: String?,
)

data class NextInstallmentDto(
    val id: String?,
    val installmentNo: Int?,
    val dueDate: String?,
    val amount: Double?,
    val status: String?,
    val statusTag: String?,
)

data class PaymentOrderHistoryDto(
    val id: String?,
    val orderId: String?,
    val amount: Double?,
    val gateway: String?,
    val status: String?,
    val gatewayPaymentId: String?,
    val createdAt: String?,
    val retryable: Boolean?,
)

data class RedemptionEligibilityDto(
    val isEligible: Boolean?,
    val maturityDate: String?,
    val remainingInstallments: Int?,
    val reasonIfNotEligible: String?,
)

data class MetalRateInfoDto(
    val metalType: String?,
    val purity: String?,
    val pricePerGramInr: Double?,
    val pricePerKgInr: Double?,
    val source: String?,
    val recordedAt: String?,
)

data class SchemeDashboardDto(
    val enrollment: EnrollmentSummaryDto?,
    val schemePlan: SchemePlanDto?,
    val schemePurchaseBalance: Double?,
    val eligiblePurchaseValue: Double?,
    val verifiedContributionTotal: Double?,
    val scheduledTotal: Double?,
    val remainingScheduledAmount: Double?,
    val paidInstallmentCount: Int?,
    val remainingInstallmentCount: Int?,
    val totalInstallments: Int?,
    val progressPercent: Double?,
    val nextInstallment: NextInstallmentDto?,
    val installments: List<InstallmentDto>?,
    val recentPayments: List<PaymentOrderHistoryDto>?,
    val recentReceipts: List<ReceiptDto>?,
    val redemptionEligibility: RedemptionEligibilityDto?,
    val redemptionStatus: Map<String, Any>?,
    val relevantCurrentMetalRate: MetalRateInfoDto?,
)

data class InstallmentDto(
    val id: String?,
    val installmentNo: Int?,
    val dueDate: String?,
    val amount: Double?,
    val status: String?,
    val paidAt: String?,
)

data class ReceiptDto(
    val id: String?,
    val receiptNumber: String?,
    val amount: Double?,
    val paymentDate: String?,
    val paymentOrderId: String?,
)

data class DetailedReceiptDto(
    val id: String?,
    val receiptNumber: String?,
    val amount: Double?,
    val paymentDate: String?,
    val accountNumber: String?,
    val productName: String?,
    val userName: String?,
    val merchantDetails: MerchantDetailsDto?,
)

data class MerchantDetailsDto(
    val sellerName: String?,
    val gstin: String?,
    val invoiceIssuer: String?,
)

data class RedemptionQuotationDto(
    val redemptionRequestId: String?,
    val quotationNumber: String?,
    val rateSource: String?,
    val rateTimestamp: String?,
    val validUntil: String?,
    val ratePerGram: Double?,
    val selectedWeightGrams: Double?,
    val metalValue: Double?,
    val mintingCharges: Double?,
    val packagingCharges: Double?,
    val gstRatePercent: Double?,
    val gstAmount: Double?,
    val deliveryCharges: Double?,
    val totalGrossValue: Double?,
    val schemePurchaseBalanceApplied: Double?,
    val netDifferencePayable: Double?,
    val userAccepted: Boolean?,
)

data class PaymentOrderResponseDto(
    val paymentOrderId: String?,
    val orderId: String?,
    val gatewayOrderId: String?,
    val amount: Double?,
    val currency: String?,
    val gateway: String?,
)

data class AuthResponseDto(
    val token: String?,
    val user: SchemeUserDto?,
)

data class SchemeUserDto(
    val id: String?,
    val fullName: String?,
    val phone: String?,
    val email: String?,
)
