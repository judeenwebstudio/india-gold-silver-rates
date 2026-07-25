package com.ratestack.app.data

import android.content.Context
import android.content.SharedPreferences

class SchemeRepository(
    private val api: RateStackApi,
    private val context: Context,
) {
    private val prefs: SharedPreferences = context.getSharedPreferences("ratestack_scheme_prefs", Context.MODE_PRIVATE)

    fun getUserToken(): String? {
        return prefs.getString("scheme_user_token", null)
    }

    fun saveUserToken(token: String) {
        prefs.edit().putString("scheme_user_token", token).apply()
    }

    fun clearUserToken() {
        prefs.edit().remove("scheme_user_token").apply()
    }

    suspend fun getSchemes(): RepositoryResult<SchemeListResponseDto> {
        return try {
            val response = api.getSchemes()
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    RepositoryResult.Success(data)
                } else {
                    RepositoryResult.Failure("Empty scheme response")
                }
            } else {
                RepositoryResult.Failure(response.body()?.error?.message ?: "Failed to fetch schemes")
            }
        } catch (e: Exception) {
            RepositoryResult.Failure(e.message ?: "Network error")
        }
    }

    suspend fun getMySchemes(token: String): RepositoryResult<List<SchemeEnrollmentDto>> {
        return try {
            val response = api.getMySchemes("Bearer $token")
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: emptyList()
                RepositoryResult.Success(data)
            } else {
                RepositoryResult.Failure(response.body()?.error?.message ?: "Failed to fetch my schemes")
            }
        } catch (e: Exception) {
            RepositoryResult.Failure(e.message ?: "Network error")
        }
    }

    suspend fun getSchemeDashboard(token: String, enrollmentId: String): RepositoryResult<SchemeDashboardDto> {
        return try {
            val response = api.getSchemeDashboard("Bearer $token", enrollmentId)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    RepositoryResult.Success(data)
                } else {
                    RepositoryResult.Failure("Dashboard data not found")
                }
            } else {
                RepositoryResult.Failure(response.body()?.error?.message ?: "Failed to fetch dashboard")
            }
        } catch (e: Exception) {
            RepositoryResult.Failure(e.message ?: "Network error")
        }
    }
}
