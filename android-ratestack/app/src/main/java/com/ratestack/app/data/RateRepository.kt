package com.ratestack.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import retrofit2.Response
import java.io.IOException

interface RatesDataSource {
    suspend fun home(): RepositoryResult<HomeData>
    suspend fun states(): RepositoryResult<List<StateOption>>
    suspend fun cities(): RepositoryResult<List<CityOption>>
    suspend fun rates(state: String, city: String): RepositoryResult<RateDetails>
}

class RateRepository(
    private val api: RateStackApi,
    private val preferences: PreferencesRepository,
    private val timeoutMillis: Long = 15_000,
) : RatesDataSource {
    override suspend fun home(): RepositoryResult<HomeData> = homeInternal()
    override suspend fun states(): RepositoryResult<List<StateOption>> = statesInternal()
    override suspend fun cities(): RepositoryResult<List<CityOption>> = citiesInternal()
    override suspend fun rates(state: String, city: String): RepositoryResult<RateDetails> = ratesInternal(state, city)

    private suspend fun homeInternal(): RepositoryResult<HomeData> = requestWithCache(
        readCache = preferences::readHome,
        saveCache = preferences::saveHome,
        fetch = { api.getHome().toModel(::homeModel) },
    )

    private suspend fun statesInternal(): RepositoryResult<List<StateOption>> = request {
        api.getStates().toModel { body ->
            val states = body.states ?: throw ApiRequestException("States are unavailable.", false)
            states.map { dto ->
                val name = dto.name ?: throw ApiRequestException("A state name is missing.", false)
                val slug = dto.slug ?: throw ApiRequestException("A state slug is missing.", false)
                StateOption(name, slug, dto.code.orEmpty(), dto.cityCount ?: 0)
            }
        }
    }

    private suspend fun citiesInternal(): RepositoryResult<List<CityOption>> = request {
        api.getCities().toModel { body ->
            val cities = body.cities ?: throw ApiRequestException("Cities are unavailable.", false)
            cities.map { dto ->
                val name = dto.name ?: throw ApiRequestException("A city name is missing.", false)
                val slug = dto.slug ?: throw ApiRequestException("A city slug is missing.", false)
                val state = dto.state.toLocation() ?: throw ApiRequestException("A city state is missing.", false)
                CityOption(name, slug, state)
            }
        }
    }

    private suspend fun ratesInternal(state: String, city: String): RepositoryResult<RateDetails> = requestWithCache(
        readCache = { preferences.readRateDetails(state, city) },
        saveCache = preferences::saveRateDetails,
        fetch = { api.getRates(state, city).toModel(::rateDetailsModel) },
    )

    private suspend fun <T> requestWithCache(
        readCache: suspend () -> T?,
        saveCache: suspend (T) -> Unit,
        fetch: suspend () -> T,
    ): RepositoryResult<T> {
        val result = request { fetch() }
        if (result is RepositoryResult.Success) {
            try { saveCache(result.data) } catch (_: Exception) { }
            return result
        }
        val cached = try { readCache() } catch (_: Exception) { null }
        return if (cached != null) {
            RepositoryResult.Success(cached, fromCache = true, warning = (result as RepositoryResult.Failure).message)
        } else {
            result
        }
    }

    private suspend fun <T> request(block: suspend () -> T): RepositoryResult<T> =
        withContext(Dispatchers.IO) {
            var lastFailure: RepositoryResult.Failure? = null
            repeat(MAX_ATTEMPTS) { attempt ->
                try {
                    return@withContext RepositoryResult.Success(withTimeout(timeoutMillis) { block() })
                } catch (error: ApiRequestException) {
                    lastFailure = RepositoryResult.Failure(error.message ?: "The service returned an error.", error.retryable)
                    if (!error.retryable) return@withContext lastFailure!!
                } catch (error: IOException) {
                    lastFailure = RepositoryResult.Failure("Unable to connect. Check your internet connection.")
                } catch (error: Exception) {
                    lastFailure = RepositoryResult.Failure(error.message ?: "Something went wrong.")
                }
                if (attempt < MAX_ATTEMPTS - 1) delay(RETRY_DELAY_MILLIS * (1L shl attempt))
            }
            lastFailure ?: RepositoryResult.Failure("The service is temporarily unavailable.")
        }

    private suspend fun <T, R> Response<ApiEnvelope<T>>.toModel(map: (T) -> R): R {
        if (!isSuccessful) {
            throw ApiRequestException("Service error (${code()}).", code() >= 500)
        }
        val envelope = body() ?: throw ApiRequestException("The service returned an empty response.", false)
        if (!envelope.success || envelope.data == null) {
            throw ApiRequestException(envelope.error?.message ?: "The service rejected the request.", false)
        }
        return map(envelope.data)
    }

    private fun homeModel(dto: HomeDto): HomeData {
        val gold = requireGoldRates(dto.latestGoldRates)
        val silver = dto.latestSilverRate?.let(::silverRateModel)
            ?: throw ApiRequestException("Silver rate is unavailable.", false)
        val lastUpdated = dto.lastUpdated ?: throw ApiRequestException("Last updated time is unavailable.", false)
        val source = dto.source.toSource() ?: throw ApiRequestException("Rate source is unavailable.", false)
        return HomeData(
            latestGoldRates = gold,
            latestSilverRate = silver,
            lastUpdated = lastUpdated,
            source = source,
            featuredCities = (dto.featuredCities ?: throw ApiRequestException("Featured cities are unavailable.", false)).map { city ->
                val name = city.name ?: throw ApiRequestException("A featured city name is missing.", false)
                val slug = city.slug ?: throw ApiRequestException("A featured city slug is missing.", false)
                val state = city.state.toLocation() ?: throw ApiRequestException("A featured city state is missing.", false)
                FeaturedCity(name, slug, state)
            },
        )
    }

    private fun rateDetailsModel(dto: CityRatesDto): RateDetails {
        val state = dto.state.toLocation() ?: throw ApiRequestException("State is unavailable.", false)
        val city = dto.city.toLocation() ?: throw ApiRequestException("City is unavailable.", false)
        val gold = requireGoldRates(dto.goldRates)
        val silver = dto.silverRate?.let(::silverRateModel)
            ?: throw ApiRequestException("Silver rate is unavailable.", false)
        val lastUpdated = dto.lastUpdated ?: throw ApiRequestException("Last updated time is unavailable.", false)
        val source = dto.source.toSource() ?: throw ApiRequestException("Rate source is unavailable.", false)
        return RateDetails(state, city, gold, silver, lastUpdated, source, dto.indicative ?: false)
    }

    private fun goldRateModel(dto: RateDto): GoldRate? {
        val purity = dto.purity ?: return null
        val price = dto.pricePerGram ?: return null
        if (price <= 0) return null
        return GoldRate(purity, price, dto.previousPricePerGram, dto.change, dto.changePercent, dto.currency ?: "INR")
    }

    private fun silverRateModel(dto: SilverRateDto): SilverRate? {
        val purity = dto.purity ?: return null
        val price = dto.pricePerGram ?: return null
        if (price <= 0) return null
        return SilverRate(purity, price, dto.pricePerKilogram, dto.previousPricePerGram, dto.changePerGram, dto.changePercent, dto.currency ?: "INR")
    }

    private fun requireGoldRates(rates: List<RateDto>?): List<GoldRate> {
        val mapped = rates?.map { goldRateModel(it) ?: throw ApiRequestException("A gold rate is malformed.", false) }
            ?: throw ApiRequestException("Gold rates are unavailable.", false)
        val required = setOf("24K", "22K", "18K")
        if (!mapped.map { it.purity }.containsAll(required)) {
            throw ApiRequestException("Required gold purities are unavailable.", false)
        }
        return mapped
    }

    private fun LocationDto?.toLocation(): Location? {
        val name = this?.name ?: return null
        val slug = this.slug ?: return null
        return Location(name, slug, this.code)
    }

    private fun SourceDto?.toSource(): SourceInfo? {
        val name = this?.name ?: return null
        val timestamp = this.timestamp ?: return null
        return SourceInfo(name, timestamp)
    }

    private class ApiRequestException(message: String, val retryable: Boolean) : IOException(message)

    private companion object {
        const val MAX_ATTEMPTS = 3
        const val RETRY_DELAY_MILLIS = 400L
    }
}
