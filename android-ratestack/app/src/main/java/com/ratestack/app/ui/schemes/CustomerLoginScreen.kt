package com.ratestack.app.ui.schemes

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun CustomerLoginScreen(
    isLoading: Boolean,
    errorMessage: String?,
    onLoginSubmit: (phone: String, pass: String) -> Unit,
    onNavigateRegister: () -> Unit,
) {
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var validationError by remember { mutableStateOf<String?>(null) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF0F0D0B),
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
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
                        text = "Welcome Back",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFFEF3C7),
                    )

                    Text(
                        text = "Sign in to your Gold & Silver Savings Account",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFFA8A29E),
                        modifier = Modifier.padding(top = 4.dp, bottom = 20.dp),
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

                    Spacer(modifier = Modifier.height(14.dp))

                    // Password Field
                    OutlinedTextField(
                        value = password,
                        onValueChange = {
                            password = it
                            validationError = null
                        },
                        label = { Text("Password", color = Color.Gray) },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFFD97706)) },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFFD97706),
                            unfocusedBorderColor = Color(0xFF44403C),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                        ),
                        shape = RoundedCornerShape(14.dp),
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Login Button
                    Button(
                        onClick = {
                            if (phone.length != 10) {
                                validationError = "Please enter a valid 10-digit mobile number."
                            } else if (password.trim().isEmpty()) {
                                validationError = "Password cannot be empty."
                            } else {
                                validationError = null
                                onLoginSubmit(phone.trim(), password)
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
                                text = "Sign In →",
                                color = Color.Black,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Register Link
                    TextButton(onClick = onNavigateRegister) {
                        Text(
                            text = "Don't have an account? Register Now",
                            color = Color(0xFFFBBF24),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }
    }
}
