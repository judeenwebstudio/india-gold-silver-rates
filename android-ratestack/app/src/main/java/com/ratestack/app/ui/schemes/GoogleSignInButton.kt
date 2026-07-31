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
import androidx.credentials.exceptions.NoCredentialException
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
                if (BuildConfig.GOOGLE_SERVER_CLIENT_ID.isBlank()) {
                    Log.w("RateStackGoogleAuth", "Google sign-in unavailable: server OAuth client ID configured=false")
                    onError("Google sign-in is currently unavailable.")
                    return@OutlinedButton
                }
                selecting = true
                scope.launch {
                    try {
                        val option = GetGoogleIdOption.Builder()
                            .setServerClientId(BuildConfig.GOOGLE_SERVER_CLIENT_ID)
                            .setFilterByAuthorizedAccounts(false)
                            .setAutoSelectEnabled(false)
                            .build()
                        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
                        val credential = CredentialManager.create(context).getCredential(context, request).credential
                        if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                            onIdToken(GoogleIdTokenCredential.createFrom(credential.data).idToken)
                        } else {
                            onError("Google sign-in could not be completed. Please try again.")
                        }
                    } catch (exception: NoCredentialException) {
                        Log.w("RateStackGoogleAuth", "Credential selection failed: ${exception::class.java.simpleName}")
                        onError("No eligible Google account was found on this device.")
                    } catch (exception: Exception) {
                        Log.e("RateStackGoogleAuth", "Google sign-in failed: ${exception::class.java.simpleName}")
                        onError("Google sign-in could not be completed. Please try again.")
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
