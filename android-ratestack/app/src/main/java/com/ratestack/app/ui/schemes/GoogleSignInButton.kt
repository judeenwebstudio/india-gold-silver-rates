package com.ratestack.app.ui.schemes

import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.credentials.exceptions.GetCredentialUnknownException
import androidx.credentials.exceptions.GetCredentialUnsupportedException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.api.ApiException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
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

    // Fallback Activity Launcher using Google Identity Services (GoogleSignInClient)
    val fallbackLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        Log.d("RateStackGoogleAuth", "Stage 3 (Fallback Launcher): Activity result code=${result.resultCode}")
        try {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            val account = task.getResult(ApiException::class.java)
            val googleIdToken = account?.idToken
            if (!googleIdToken.isNullOrBlank()) {
                Log.d("RateStackGoogleAuth", "Stage 4 (Fallback Launcher): Account selected! ID Token extracted (length=${googleIdToken.length})")
                Log.d("RateStackGoogleAuth", "Stage 5 (Fallback Launcher): /api/v1/auth/google request BEGINS!")
                onIdToken(googleIdToken)
            } else {
                Log.w("RateStackGoogleAuth", "Stage 4 (Fallback Launcher): Account selected but ID token was null/empty")
                onError("Google sign-in did not return an ID token.")
            }
        } catch (e: ApiException) {
            Log.e("RateStackGoogleAuth", "Stage 4 (Fallback Launcher): GoogleSignIn API Exception status=${e.statusCode}: ${e.message}", e)
            if (e.statusCode == 12501 || e.statusCode == 16) {
                onError("Google sign-in was cancelled.")
            } else {
                onError("Google sign-in failed (status code: ${e.statusCode}).")
            }
        } catch (e: Exception) {
            Log.e("RateStackGoogleAuth", "Stage 4 (Fallback Launcher): Unexpected exception: ${e::class.java.name}: ${e.message}", e)
            onError("Google sign-in error: ${e::class.java.simpleName}")
        } finally {
            selecting = false
        }
    }

    fun launchGoogleSignInClientFallback(serverClientId: String, reason: String) {
        Log.i("RateStackGoogleAuth", "Stage 3 Fallback: Triggering GoogleSignInClient launcher due to: $reason")
        try {
            val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(serverClientId)
                .requestEmail()
                .build()
            val googleSignInClient = GoogleSignIn.getClient(context, gso)
            googleSignInClient.signOut().addOnCompleteListener {
                fallbackLauncher.launch(googleSignInClient.signInIntent)
            }
        } catch (e: Exception) {
            Log.e("RateStackGoogleAuth", "Stage 3 Fallback Error: Failed to launch GoogleSignInClient intent: ${e.message}", e)
            onError("Google sign-in is currently unavailable.")
            selecting = false
        }
    }

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

                // 1. Google Play Services Check
                val playServicesStatus = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context)
                if (playServicesStatus != ConnectionResult.SUCCESS) {
                    Log.w("RateStackGoogleAuth", "Stage 1 Diagnostic: Google Play Services status code=$playServicesStatus")
                    onError("Google Play Services is not available on this device.")
                    return@OutlinedButton
                }

                // 2. Server Client ID Check
                val serverClientId = BuildConfig.GOOGLE_SERVER_CLIENT_ID
                if (serverClientId.isBlank()) {
                    Log.w("RateStackGoogleAuth", "Stage 2 Diagnostic: Missing Server Client ID")
                    onError("Missing Server Client ID: GOOGLE_SERVER_CLIENT_ID is not configured in Android app.")
                    return@OutlinedButton
                }
                Log.d("RateStackGoogleAuth", "Stage 2 Diagnostic: Client ID loaded (length=${serverClientId.length})")

                selecting = true
                scope.launch {
                    try {
                        Log.d("RateStackGoogleAuth", "Stage 3 Diagnostic: Executing GetGoogleIdOption(serverClientId, filterByAuthorizedAccounts=false, autoSelectEnabled=false)")
                        val option = GetGoogleIdOption.Builder()
                            .setServerClientId(serverClientId)
                            .setFilterByAuthorizedAccounts(false)
                            .setAutoSelectEnabled(false)
                            .build()
                        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()

                        Log.d("RateStackGoogleAuth", "Stage 3 Diagnostic: Calling CredentialManager.getCredential()")
                        val result = CredentialManager.create(context).getCredential(context, request)
                        val credential = result.credential
                        Log.d("RateStackGoogleAuth", "Stage 3 Diagnostic: CredentialManager.getCredential() COMPLETED!")

                        Log.d("RateStackGoogleAuth", "Post-Selection Diagnostic 1: Credential runtime class = ${credential::class.java.name} (simpleName=${credential::class.java.simpleName})")
                        Log.d("RateStackGoogleAuth", "Post-Selection Diagnostic 2: Credential type = ${credential.type}")
                        Log.d("RateStackGoogleAuth", "Post-Selection Diagnostic 3: is CustomCredential = ${credential is CustomCredential}")

                        val isGoogleIdTokenCredentialType = credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                        Log.d("RateStackGoogleAuth", "Post-Selection Diagnostic 4: type == TYPE_GOOGLE_ID_TOKEN_CREDENTIAL = $isGoogleIdTokenCredentialType")

                        if (credential is CustomCredential && isGoogleIdTokenCredentialType) {
                            try {
                                Log.d("RateStackGoogleAuth", "Post-Selection Diagnostic 5: Executing GoogleIdTokenCredential.createFrom(credential.data)")
                                val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                                val idToken = googleIdTokenCredential.idToken
                                Log.d("RateStackGoogleAuth", "Post-Selection Diagnostic 5: GoogleIdTokenCredential.createFrom() SUCCEEDED!")
                                Log.d("RateStackGoogleAuth", "Post-Selection Diagnostic 6: ID Token length = ${idToken.length}")
                                Log.d("RateStackGoogleAuth", "Post-Selection Diagnostic 7: /api/v1/auth/google request BEGINS!")
                                onIdToken(idToken)
                            } catch (e: GoogleIdTokenParsingException) {
                                Log.e("RateStackGoogleAuth", "Post-Selection Diagnostic 5 FAILED: GoogleIdTokenParsingException: ${e.message}", e)
                                onError("Google credential parsing failed.")
                                selecting = false
                            } catch (e: Exception) {
                                Log.e("RateStackGoogleAuth", "Post-Selection Diagnostic 5 FAILED: Exception: ${e::class.java.name}: ${e.message}", e)
                                onError("Google credential parsing failed.")
                                selecting = false
                            }
                        } else {
                            Log.w("RateStackGoogleAuth", "Post-Selection Diagnostic: Non-ID-Token credential class=${credential::class.java.simpleName}, type=${credential.type}. Launching fallback GoogleSignInClient...")
                            launchGoogleSignInClientFallback(serverClientId, "Unsupported credential type ${credential.type}")
                        }
                    } catch (e: GetCredentialCancellationException) {
                        Log.i("RateStackGoogleAuth", "Stage 3 Diagnostic: Google sign-in was cancelled by user")
                        onError("Google sign-in was cancelled.")
                        selecting = false
                    } catch (e: NoCredentialException) {
                        Log.w("RateStackGoogleAuth", "Stage 3 Diagnostic: NoCredentialException encountered. Launching fallback GoogleSignInClient...", e)
                        launchGoogleSignInClientFallback(serverClientId, "NoCredentialException")
                    } catch (e: GetCredentialProviderConfigurationException) {
                        Log.w("RateStackGoogleAuth", "Stage 3 Diagnostic: Provider configuration error encountered. Launching fallback GoogleSignInClient...", e)
                        launchGoogleSignInClientFallback(serverClientId, "GetCredentialProviderConfigurationException: ${e.message}")
                    } catch (e: GetCredentialUnsupportedException) {
                        Log.w("RateStackGoogleAuth", "Stage 3 Diagnostic: GetCredentialUnsupportedException encountered. Launching fallback GoogleSignInClient...", e)
                        launchGoogleSignInClientFallback(serverClientId, "GetCredentialUnsupportedException")
                    } catch (e: GetCredentialUnknownException) {
                        Log.w("RateStackGoogleAuth", "Stage 3 Diagnostic: GetCredentialUnknownException encountered. Launching fallback GoogleSignInClient...", e)
                        launchGoogleSignInClientFallback(serverClientId, "GetCredentialUnknownException: ${e.message}")
                    } catch (e: GetCredentialException) {
                        Log.w("RateStackGoogleAuth", "Stage 3 Diagnostic: GetCredentialException [${e.type}]: '${e.message}'. Launching fallback GoogleSignInClient...", e)
                        launchGoogleSignInClientFallback(serverClientId, "GetCredentialException [${e.type}]: ${e.message}")
                    } catch (e: Exception) {
                        Log.e("RateStackGoogleAuth", "Stage 3 Diagnostic: Unexpected Exception: ${e::class.java.name}: ${e.message}. Launching fallback GoogleSignInClient...", e)
                        launchGoogleSignInClientFallback(serverClientId, "Exception ${e::class.java.simpleName}")
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
