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
