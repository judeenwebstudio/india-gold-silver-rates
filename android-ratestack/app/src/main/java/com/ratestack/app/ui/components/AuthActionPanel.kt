package com.ratestack.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ratestack.app.ui.schemes.GoogleSignInButton

enum class AuthActionPanelVariant {
    CARD,
    COMPACT,
}

@Composable
fun AuthActionPanel(
    variant: AuthActionPanelVariant = AuthActionPanelVariant.CARD,
    heading: String? = null,
    supportingText: String? = null,
    onLogin: () -> Unit,
    onRegister: () -> Unit,
    onGoogleLogin: (() -> Unit)? = null,
    onGoogleIdToken: ((String) -> Unit)? = null,
    isGoogleLoading: Boolean = false,
    googleErrorMessage: String? = null,
    isGoogleAvailable: Boolean = true,
    modifier: Modifier = Modifier,
) {
    val isCard = variant == AuthActionPanelVariant.CARD
    val cardShape = RoundedCornerShape(if (isCard) 20.dp else 16.dp)
    val cardPadding = if (isCard) 20.dp else 16.dp
    val verticalSpacing = if (isCard) 12.dp else 10.dp

    val defaultTag = if (isCard) "MY DASHBOARD" else "ACCOUNT & ORDERS"
    val defaultHeading = if (isCard) "Welcome to RateStack" else "Ready to shop?"
    val defaultSupportingText = if (isCard) {
        "Sign in to manage orders, invoices, delivery tracking, saved addresses and account preferences."
    } else {
        "Sign in to purchase, track orders and download invoices."
    }

    val displayHeading = heading ?: defaultHeading
    val displaySupportingText = supportingText ?: defaultSupportingText

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = cardShape,
        color = Color(0xFF1C1917),
        border = BorderStroke(1.dp, Color(0x44E2AD3D)),
        tonalElevation = if (isCard) 4.dp else 2.dp,
        shadowElevation = if (isCard) 6.dp else 2.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(cardPadding),
            verticalArrangement = Arrangement.spacedBy(verticalSpacing),
        ) {
            // Section Tag
            Text(
                text = defaultTag,
                color = Color(0xFFF5C96A),
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.sp,
            )

            // Heading
            Text(
                text = displayHeading,
                style = if (isCard) MaterialTheme.typography.titleLarge else MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Black,
                color = Color.White,
            )

            // Supporting Text
            Text(
                text = displaySupportingText,
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFFD6D3D1),
                fontSize = 13.sp,
                lineHeight = 18.sp,
            )

            Spacer(Modifier.height(4.dp))

            // Responsive Action Buttons: Login & Register
            BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
                val isWide = maxWidth >= 300.dp
                if (isWide) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        PrimaryLoginButton(
                            onClick = onLogin,
                            modifier = Modifier.weight(1f),
                        )
                        SecondaryRegisterButton(
                            onClick = onRegister,
                            modifier = Modifier.weight(1f),
                        )
                    }
                } else {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        PrimaryLoginButton(
                            onClick = onLogin,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        SecondaryRegisterButton(
                            onClick = onRegister,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }

            // Google Sign-In Action
            if (onGoogleIdToken != null) {
                GoogleSignInButton(
                    isLoading = isGoogleLoading,
                    onIdToken = onGoogleIdToken,
                    onError = { /* Handled inline */ },
                )
            } else if (onGoogleLogin != null) {
                TertiaryGoogleButton(
                    onClick = onGoogleLogin,
                    isLoading = isGoogleLoading,
                    isEnabled = isGoogleAvailable,
                )
            }

            // Inline Google Error / Supporting Message
            if (!googleErrorMessage.isNullOrBlank()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Warning",
                        tint = Color(0xFFFCA5A5),
                        modifier = Modifier.size(14.dp),
                    )
                    Text(
                        text = googleErrorMessage,
                        color = Color(0xFFFCA5A5),
                        fontSize = 12.sp,
                    )
                }
            } else if (!isGoogleAvailable) {
                Text(
                    text = "Google sign-in is not available on this device.",
                    color = Color(0xFFA8A29E),
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
    }
}

@Composable
private fun PrimaryLoginButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.97f else 1.0f,
        animationSpec = tween(durationMillis = 150),
        label = "loginPressScale",
    )

    Button(
        onClick = onClick,
        interactionSource = interactionSource,
        modifier = modifier
            .height(52.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .semantics { contentDescription = "Login to your RateStack account" },
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFFE2AD3D),
            contentColor = Color(0xFF141210),
        ),
        elevation = ButtonDefaults.buttonElevation(
            defaultElevation = 2.dp,
            pressedElevation = 4.dp,
        ),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            Icon(
                imageVector = Icons.Default.Lock,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = "Login",
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
            )
        }
    }
}

@Composable
private fun SecondaryRegisterButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.97f else 1.0f,
        animationSpec = tween(durationMillis = 150),
        label = "registerPressScale",
    )

    OutlinedButton(
        onClick = onClick,
        interactionSource = interactionSource,
        modifier = modifier
            .height(52.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .semantics { contentDescription = "Register a new RateStack account" },
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.5.dp, Color(0xFFE2AD3D)),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = Color(0xFF24201C),
            contentColor = Color(0xFFF5C96A),
        ),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = "Register",
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
            )
        }
    }
}

@Composable
private fun TertiaryGoogleButton(
    onClick: () -> Unit,
    isLoading: Boolean,
    isEnabled: Boolean,
    modifier: Modifier = Modifier,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed && isEnabled && !isLoading) 0.97f else 1.0f,
        animationSpec = tween(durationMillis = 150),
        label = "googlePressScale",
    )

    OutlinedButton(
        onClick = onClick,
        enabled = isEnabled && !isLoading,
        interactionSource = interactionSource,
        modifier = modifier
            .fillMaxWidth()
            .height(54.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .semantics { contentDescription = "Continue with Google account" },
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, Color(0xFFD6D3D1)),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = Color.White,
            contentColor = Color(0xFF292524),
            disabledContainerColor = Color(0xFFF5F5F4),
            disabledContentColor = Color(0xFFA8A29E),
        ),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 1.dp, pressedElevation = 3.dp),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = Color(0xFF4285F4),
                )
                Spacer(Modifier.width(10.dp))
                Text(
                    text = "Signing in…",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = Color(0xFF292524),
                )
            } else {
                GoogleMark()
                Spacer(Modifier.width(10.dp))
                Text(
                    text = "Continue with Google",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                )
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
