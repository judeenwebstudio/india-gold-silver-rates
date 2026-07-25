package com.ratestack.app.ui.schemes

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForgotPasswordScreen(
    isLoading: Boolean,
    errorMessage: String?,
    onSendOtpSubmit: (phone: String) -> Unit,
    onNavigateBack: () -> Unit,
) {
    var phone by remember { mutableStateOf("") }
    var validationError by remember { mutableStateOf<String?>(null) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF0F0D0B),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            SmallTopAppBar(
                title = { Text("Forgot Password", color = Color.White, fontWeight = FontWeight.Bold) },
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
                            text = "Forgot Password",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFFEF3C7),
                        )

                        Text(
                            text = "Enter your registered mobile number. We will send an OTP to verify your account.",
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

                        // Mobile Number Field
                        OutlinedTextField(
                            value = phone,
                            onValueChange = { input ->
                                val digits = input.replace(Regex("\\D"), "")
                                val clean = if (digits.length == 12 && digits.startsWith("91")) {
                                    digits.substring(2)
                                } else if (digits.length == 11 && digits.startsWith("0")) {
                                    digits.substring(1)
                                } else {
                                    digits
                                }
                                if (clean.length <= 10) {
                                    phone = clean
                                    validationError = null
                                }
                            },
                            label = { Text("Mobile Number (10 digits)", color = Color.Gray) },
                            leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = Color(0xFFD97706)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFFD97706),
                                unfocusedBorderColor = Color(0xFF44403C),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                            ),
                            shape = RoundedCornerShape(14.dp),
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        // Send OTP Button
                        Button(
                            onClick = {
                                if (phone.length != 10) {
                                    validationError = "Enter a valid 10-digit mobile number."
                                } else {
                                    validationError = null
                                    onSendOtpSubmit(phone.trim())
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            enabled = !isLoading,
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
                                    text = "Send OTP →",
                                    color = Color.Black,
                                    fontSize = 14.sp,
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
