package com.ratestack.app.ui.schemes

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OtpVerificationScreen(
    mobileNumber: String,
    isLoading: Boolean,
    errorMessage: String?,
    onVerifyOtpSubmit: (otp: String) -> Unit,
    onResendOtp: () -> Unit,
    onNavigateBack: () -> Unit,
) {
    var otp by remember { mutableStateOf("") }
    var validationError by remember { mutableStateOf<String?>(null) }
    var timerSeconds by remember { mutableStateOf(45) }

    LaunchedEffect(timerSeconds) {
        if (timerSeconds > 0) {
            delay(1000L)
            timerSeconds--
        }
    }

    val maskedPhone = remember(mobileNumber) {
        val clean = mobileNumber.replace(Regex("\\D"), "")
        if (clean.length >= 4) "******" + clean.takeLast(4) else "******"
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF0F0D0B),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            SmallTopAppBar(
                title = { Text("Verify OTP Code", color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.smallTopAppBarColors(containerColor = Color(0xFF1C1917)),
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f),
                contentAlignment = Alignment.Center,
            ) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth(0.92f)
                        .padding(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1C1917)),
                    shape = RoundedCornerShape(24.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFD97706).copy(alpha = 0.4f)),
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            text = "Enter Verification Code",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFFEF3C7),
                        )

                        Text(
                            text = "A 6-digit code has been sent to $maskedPhone",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFA8A29E),
                            modifier = Modifier.padding(top = 8.dp, bottom = 20.dp),
                        )

                        if (errorMessage != null || validationError != null) {
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 16.dp),
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFF451A03),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444)),
                            ) {
                                Text(
                                    text = "⚠️ ${errorMessage ?: validationError}",
                                    color = Color(0xFFFCA5A5),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(12.dp),
                                )
                            }
                        }

                        // 6-digit OTP Field
                        OutlinedTextField(
                            value = otp,
                            onValueChange = { input ->
                                val digits = input.replace(Regex("\\D"), "")
                                if (digits.length <= 6) {
                                    otp = digits
                                    validationError = null
                                }
                            },
                            label = { Text("6-Digit OTP Code", color = Color.Gray) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            textStyle = LocalTextStyle.current.copy(
                                textAlign = TextAlign.Center,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFFBBF24),
                            ),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFFD97706),
                                unfocusedBorderColor = Color(0xFF44403C),
                                focusedTextColor = Color(0xFFFBBF24),
                                unfocusedTextColor = Color(0xFFFBBF24),
                            ),
                            shape = RoundedCornerShape(14.dp),
                        )

                        Spacer(modifier = Modifier.height(20.dp))

                        // Verify OTP Button
                        Button(
                            onClick = {
                                if (otp.length != 6) {
                                    validationError = "The verification code is incorrect."
                                } else {
                                    validationError = null
                                    onVerifyOtpSubmit(otp)
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            enabled = !isLoading && otp.length == 6,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                            shape = RoundedCornerShape(14.dp),
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(22.dp),
                                    color = Color.Black,
                                    strokeWidth = 2.5.dp,
                                )
                            } else {
                                Text(
                                    text = "Verify OTP →",
                                    color = Color.Black,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Resend OTP & Countdown
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = if (timerSeconds > 0) "Resend in ${timerSeconds}s" else "Didn't receive code?",
                                color = Color.Gray,
                                fontSize = 12.sp,
                            )

                            TextButton(
                                onClick = {
                                    timerSeconds = 45
                                    onResendOtp()
                                },
                                enabled = timerSeconds == 0 && !isLoading,
                            ) {
                                Text(
                                    text = "Resend OTP",
                                    color = if (timerSeconds == 0) Color(0xFFFBBF24) else Color.Gray,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
