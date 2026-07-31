package com.ratestack.app.data

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import com.google.firebase.messaging.FirebaseMessaging
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SchemeRepository(
    private val api: RateStackApi,
    private val context: Context,
) {
    private val prefs: SharedPreferences = context.getSharedPreferences("ratestack_scheme_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    fun getUserToken(): String? {
        return prefs.getString("scheme_user_token", null)
    }

    fun saveUserToken(token: String) {
        prefs.edit { putString("scheme_user_token", token) }
    }

    fun clearUserToken() {
        prefs.edit { remove("scheme_user_token") }
    }

    fun revokePushToken(onComplete: () -> Unit) {
        val auth = getUserToken()
        if (auth.isNullOrBlank()) { onComplete(); return }
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            val token = task.result
            if (token.isNullOrBlank()) onComplete() else CoroutineScope(Dispatchers.IO).launch {
                runCatching { api.revokePushDevice("Bearer $auth", mapOf("token" to token)) }
                onComplete()
            }
        }
    }

    fun getUserName(): String? {
        return prefs.getString("scheme_user_name", null)
    }

    fun getUserPhone(): String? {
        return prefs.getString("scheme_user_phone", null)
    }

    fun saveUserDetails(name: String, phone: String) {
        prefs.edit {
            putString("scheme_user_name", name)
            putString("scheme_user_phone", phone)
        }
    }

    fun clearUserDetails() {
        prefs.edit {
            remove("scheme_user_name")
            remove("scheme_user_phone")
        }
    }

    suspend fun getSchemes(): RepositoryResult<SchemeListResponseDto> {
        return try {
            val response = api.getSchemes()
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    prefs.edit { putString("cached_schemes_list", gson.toJson(data)) }
                    RepositoryResult.Success(data)
                } else {
                    RepositoryResult.Failure("Empty scheme response")
                }
            } else {
                readCachedSchemes() ?: RepositoryResult.Failure(response.body()?.error?.message ?: "Failed to fetch schemes")
            }
        } catch (e: Exception) {
            readCachedSchemes() ?: RepositoryResult.Failure(e.message ?: "Network error")
        }
    }

    private fun readCachedSchemes(): RepositoryResult<SchemeListResponseDto>? {
        val json = prefs.getString("cached_schemes_list", null) ?: return null
        return try {
            val data = gson.fromJson(json, SchemeListResponseDto::class.java)
            RepositoryResult.Success(data, fromCache = true, warning = "Offline read-only view")
        } catch (e: Exception) {
            null
        }
    }

    suspend fun getMySchemes(token: String): RepositoryResult<List<SchemeEnrollmentDto>> {
        return try {
            val response = api.getMySchemes("Bearer $token")
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: emptyList()
                prefs.edit { putString("cached_my_schemes", gson.toJson(data)) }
                RepositoryResult.Success(data)
            } else {
                readCachedMySchemes() ?: RepositoryResult.Failure(response.body()?.error?.message ?: "Failed to fetch my schemes")
            }
        } catch (e: Exception) {
            readCachedMySchemes() ?: RepositoryResult.Failure(e.message ?: "Network error")
        }
    }

    private fun readCachedMySchemes(): RepositoryResult<List<SchemeEnrollmentDto>>? {
        val json = prefs.getString("cached_my_schemes", null) ?: return null
        return try {
            val data = gson.fromJson(json, Array<SchemeEnrollmentDto>::class.java).toList()
            RepositoryResult.Success(data, fromCache = true, warning = "Offline read-only view")
        } catch (e: Exception) {
            null
        }
    }

    suspend fun getSchemeDashboard(token: String, enrollmentId: String): RepositoryResult<SchemeDashboardDto> {
        return try {
            val response = api.getSchemeDashboard("Bearer $token", enrollmentId)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    prefs.edit { putString("cached_dashboard_$enrollmentId", gson.toJson(data)) }
                    RepositoryResult.Success(data)
                } else {
                    RepositoryResult.Failure("Dashboard data not found")
                }
            } else {
                readCachedDashboard(enrollmentId) ?: RepositoryResult.Failure(response.body()?.error?.message ?: "Failed to fetch dashboard")
            }
        } catch (e: Exception) {
            readCachedDashboard(enrollmentId) ?: RepositoryResult.Failure(e.message ?: "Network error")
        }
    }

    private fun readCachedDashboard(enrollmentId: String): RepositoryResult<SchemeDashboardDto>? {
        val json = prefs.getString("cached_dashboard_$enrollmentId", null) ?: return null
        return try {
            val data = gson.fromJson(json, SchemeDashboardDto::class.java)
            RepositoryResult.Success(data, fromCache = true, warning = "Offline read-only view")
        } catch (e: Exception) {
            null
        }
    }
}
