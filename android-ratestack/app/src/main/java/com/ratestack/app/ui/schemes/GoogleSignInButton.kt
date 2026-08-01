package com.ratestack.app.ui.schemes

import android.util.Log
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.GetCredentialProviderConfigurationException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.ratestack.app.BuildConfig
import kotlinx.coroutines.launch

@Composable
fun GoogleSignInButton(
    isLoading: Boolean,
    onIdToken: (String) -> Unit,
    onError: (String) -> Unit,
    label: String = "Continue with Google",
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var selecting by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Divider(modifier = Modifier.weight(1f), color = Color(0xFF57534E))
            Text("OR", modifier = Modifier.padding(horizontal = 12.dp), color = Color(0xFFA8A29E))
            Divider(modifier = Modifier.weight(1f), color = Color(0xFF57534E))
        }
        Spacer(Modifier.height(12.dp))
        OutlinedButton(
            onClick = {
                if (selecting || isLoading) return@OutlinedButton

                // 1. Google Play Services Availability Check
                val playServicesStatus = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context)
                if (playServicesStatus != ConnectionResult.SUCCESS) {
                    Log.w("RateStackGoogleAuth", "Stage 1 Diagnostic: Google Play Services unavailable. Status code=$playServicesStatus")
                    onError("Google Play Services is not available on this device.")
                    return@OutlinedButton
                }

                // 2. Server Client ID Check
                val serverClientId = BuildConfig.GOOGLE_SERVER_CLIENT_ID
                if (serverClientId.isBlank()) {
                    Log.w("RateStackGoogleAuth", "Stage 2 Diagnostic: Missing Server Client ID (GOOGLE_SERVER_CLIENT_ID is blank)")
                    onError("Missing Server Client ID: GOOGLE_SERVER_CLIENT_ID is not configured in Android app.")
                    return@OutlinedButton
                }
                Log.d("RateStackGoogleAuth", "Stage 2 Diagnostic: Client ID loaded (prefix=${serverClientId.take(12)}...)")

                selecting = true
                scope.launch {
                    try {
                        Log.d("RateStackGoogleAuth", "Stage 3 Diagnostic: Launching CredentialManager request with serverClientId")
                        val option = GetGoogleIdOption.Builder()
                            .setServerClientId(serverClientId)
                            .setFilterByAuthorizedAccounts(false)
                            .setAutoSelectEnabled(false)
                            .build()
                        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
                        val credential = CredentialManager.create(context).getCredential(context, request).credential

                        if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                            val googleIdToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
                            Log.d("RateStackGoogleAuth", "Stage 4 Diagnostic: ID token received successfully (length=${googleIdToken.length}, prefix=${googleIdToken.take(15)}...)")
                            onIdToken(googleIdToken)
                        } else {
                            Log.w("RateStackGoogleAuth", "Stage 4 Diagnostic: Unexpected credential type received: ${credential::class.java.name}")
                            onError("Google sign-in returned an unsupported credential type.")
                        }
                    } catch (e: GetCredentialCancellationException) {
                        Log.i("RateStackGoogleAuth", "Stage 3 Diagnostic: Google sign-in was cancelled by user")
                        onError("Google sign-in was cancelled.")
                    } catch (e: NoCredentialException) {
                        Log.w("RateStackGoogleAuth", "Stage 3 Diagnostic: NoCredentialException - OAuth configuration mismatch or no account")
                        onError("OAuth configuration mismatch or no Google account found on device.")
                    } catch (e: GetCredentialProviderConfigurationException) {
                        Log.e("RateStackGoogleAuth", "Stage 3 Diagnostic: Provider configuration error: ${e.message}")
                        onError("Firebase / Google Provider configuration invalid.")
                    } catch (e: GetCredentialException) {
                        Log.e("RateStackGoogleAuth", "Stage 3 Diagnostic: GetCredentialException [${e.type}]: ${e.message}")
                        onError("Google sign-in failed: ${e.type ?: e.message}")
                    } catch (e: Exception) {
                        Log.e("RateStackGoogleAuth", "Stage 3 Diagnostic: Unexpected Exception: ${e::class.java.name}: ${e.message}")
                        onError("Google sign-in error: ${e::class.java.simpleName}")
                    } finally {
                        selecting = false
                    }
                }
            },
            enabled = !selecting && !isLoading,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, Color(0xFFD6D3D1)),
            colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White, contentColor = Color(0xFF292524)),
        ) {
            if (selecting || isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
            } else {
                GoogleMark()
                Spacer(Modifier.width(10.dp))
                Text(label, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun GoogleMark() {
    Canvas(Modifier.size(20.dp)) {
        val stroke = Stroke(width = size.width * 0.20f, cap = StrokeCap.Butt)
        drawArc(Color(0xFF4285F4), -42f, 132f, false, style = stroke)
        drawArc(Color(0xFF34A853), 90f, 86f, false, style = stroke)
        drawArc(Color(0xFFFBBC05), 176f, 76f, false, style = stroke)
        drawArc(Color(0xFFEA4335), 252f, 66f, false, style = stroke)
        drawLine(Color(0xFF4285F4), center, center.copy(x = size.width), strokeWidth = size.width * 0.20f)
    }
}
