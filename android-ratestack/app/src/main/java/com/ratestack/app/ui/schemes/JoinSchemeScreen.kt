package com.ratestack.app.ui.schemes

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ratestack.app.data.SchemePlanDto
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JoinSchemeScreen(
    plan: SchemePlanDto?,
    initialMonthlyAmount: Double? = null,
    isLoading: Boolean,
    errorMessage: String? = null,
    onBackClick: () -> Unit,
    onSubmitJoin: (
        monthlyAmount: Double,
        nomineeFullName: String,
        nomineeRelationship: String,
        nomineePhone: String?,
        nomineeAge: Int?,
        acceptedTermsVersion: String
    ) -> Unit
) {
    if (plan == null) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = Color(0xFF0F0D0B)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "No scheme plan selected.",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onBackClick,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706))
                ) {
                    Text("Return to Schemes", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            }
        }
        return
    }

    val isGold = plan.metalType == "GOLD"
    val minAmount = plan.minMonthlyAmount ?: 200.0
    val maxAmount = plan.maxMonthlyAmount ?: 100000.0
    val tenureMonths = plan.tenureMonths ?: 12

    val presetAmounts = (plan.presetAmounts ?: listOf(200.0, 500.0, 1000.0, 2000.0, 5000.0))
        .filter { it >= minAmount && it <= maxAmount }

    var selectedAmount by remember(plan.id, initialMonthlyAmount) {
        mutableStateOf(initialMonthlyAmount ?: (presetAmounts.firstOrNull() ?: minAmount))
    }
    var customAmountText by remember(plan.id) {
        mutableStateOf((initialMonthlyAmount ?: selectedAmount).toInt().toString())
    }

    var nomineeFullName by remember { mutableStateOf("") }
    var nomineeRelationship by remember { mutableStateOf("Spouse") }
    var customRelationshipText by remember { mutableStateOf("") }
    var nomineePhone by remember { mutableStateOf("") }
    var nomineeAgeText by remember { mutableStateOf("") }
    var termsAccepted by remember { mutableStateOf(true) }

    var validationError by remember { mutableStateOf<String?>(null) }

    val relationships = listOf("Spouse", "Parent", "Child", "Sibling", "Other")

    Scaffold(
        topBar = {
            SmallTopAppBar(
                title = {
                    Column {
                        Text(
                            text = plan.name ?: "Join Savings Scheme",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = if (isGold) "22K Gold Coin Scheme • ${tenureMonths}M Plan" else "Silver 999 Coin Scheme • ${tenureMonths}M Plan",
                            fontSize = 11.sp,
                            color = if (isGold) Color(0xFFFBBF24) else Color(0xFF38BDF8)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.smallTopAppBarColors(containerColor = Color(0xFF181512))
            )
        },
        containerColor = Color(0xFF0F0D0B)
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Dynamic Scheme Summary Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = if (isGold) Color(0xFF1E1912) else Color(0xFF14171C)
                ),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, if (isGold) Color(0xFF78350F) else Color(0xFF334155))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "TENURE & DURATION",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.Gray,
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = "$tenureMonths Months ($tenureMonths Installments)",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF065F46)
                        ) {
                            Text(
                                text = "${tenureMonths}M Fixed Term",
                                color = Color(0xFF34D399),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    val scheduledTotal = selectedAmount * tenureMonths
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Monthly Contribution", fontSize = 10.sp, color = Color.Gray)
                            Text(
                                "₹${String.format(Locale.US, "%,.0f", selectedAmount)}",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isGold) Color(0xFFFBBF24) else Color(0xFF38BDF8)
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("Total Scheduled Amount", fontSize = 10.sp, color = Color.Gray)
                            Text(
                                "₹${String.format(Locale.US, "%,.0f", scheduledTotal)}",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }
            }

            // 2. Select Installment Amount Section
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1C1917)),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, Color(0xFF44403C))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "1. CHOOSE MONTHLY CONTRIBUTION",
                        color = Color(0xFFFBBF24),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Select a preset or enter custom amount (₹${minAmount.toInt()} - ₹${maxAmount.toInt()})",
                        fontSize = 11.sp,
                        color = Color.Gray
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    // Preset Chips
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(presetAmounts) { amt ->
                            val isSelected = amt == selectedAmount
                            Surface(
                                modifier = Modifier.clickable {
                                    selectedAmount = amt
                                    customAmountText = amt.toInt().toString()
                                    validationError = null
                                },
                                shape = RoundedCornerShape(10.dp),
                                color = if (isSelected) (if (isGold) Color(0xFFD97706) else Color(0xFF38BDF8)) else Color(0xFF262320),
                                border = BorderStroke(1.dp, if (isSelected) Color.White else Color(0xFF44403C))
                            ) {
                                Text(
                                    text = "₹${amt.toInt()}",
                                    color = if (isSelected) Color.Black else Color.LightGray,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Custom Amount Text Field
                    OutlinedTextField(
                        value = customAmountText,
                        onValueChange = { input ->
                            customAmountText = input
                            val parsed = input.toDoubleOrNull()
                            if (parsed != null) {
                                selectedAmount = parsed
                                validationError = null
                            }
                        },
                        label = { Text("Monthly Amount (₹)", color = Color.Gray) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = if (isGold) Color(0xFFFBBF24) else Color(0xFF38BDF8),
                            unfocusedBorderColor = Color(0xFF525252),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )
                }
            }

            // 3. Nominee Details Form
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1C1917)),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, Color(0xFF44403C))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "2. NOMINEE DETAILS",
                        color = Color(0xFFFBBF24),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    // Nominee Full Name
                    OutlinedTextField(
                        value = nomineeFullName,
                        onValueChange = {
                            nomineeFullName = it
                            validationError = null
                        },
                        label = { Text("Nominee Full Name *", color = Color.Gray) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFFFBBF24),
                            unfocusedBorderColor = Color(0xFF525252),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Relationship Chips
                    Text("Nominee Relationship *", fontSize = 11.sp, color = Color.Gray)
                    Spacer(modifier = Modifier.height(6.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(relationships) { rel ->
                            val isSelected = rel == nomineeRelationship
                            Surface(
                                modifier = Modifier.clickable {
                                    nomineeRelationship = rel
                                    validationError = null
                                },
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSelected) Color(0xFF78350F) else Color(0xFF262320),
                                border = BorderStroke(1.dp, if (isSelected) Color(0xFFFBBF24) else Color(0xFF44403C))
                            ) {
                                Text(
                                    text = rel,
                                    color = if (isSelected) Color(0xFFFEF3C7) else Color.LightGray,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }

                    if (nomineeRelationship == "Other") {
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = customRelationshipText,
                            onValueChange = { customRelationshipText = it },
                            label = { Text("Specify Relationship *", color = Color.Gray) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFFFBBF24),
                                unfocusedBorderColor = Color(0xFF525252),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Phone (Optional)
                        OutlinedTextField(
                            value = nomineePhone,
                            onValueChange = { nomineePhone = it },
                            label = { Text("Mobile (Optional)", color = Color.Gray) },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFFFBBF24),
                                unfocusedBorderColor = Color(0xFF525252),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )

                        // Age (Optional)
                        OutlinedTextField(
                            value = nomineeAgeText,
                            onValueChange = { nomineeAgeText = it },
                            label = { Text("Age", color = Color.Gray) },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.width(90.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFFFBBF24),
                                unfocusedBorderColor = Color(0xFF525252),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )
                    }
                }
            }

            // 4. Terms Acceptance Checkbox
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1C1917)),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, Color(0xFF44403C))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { termsAccepted = !termsAccepted }
                        .padding(14.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Checkbox(
                        checked = termsAccepted,
                        onCheckedChange = { termsAccepted = it },
                        colors = CheckboxDefaults.colors(
                            checkedColor = Color(0xFFD97706),
                            uncheckedColor = Color.Gray
                        )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "I accept the RateStack ${plan.name} Scheme Terms & Conditions (${plan.termsVersion ?: "v1.0-2026"}). I confirm that 100% of my monthly contributions will be credited with 0% deduction over $tenureMonths months, and physical coin delivery with GST applies at maturity.",
                        fontSize = 11.sp,
                        color = Color.LightGray,
                        lineHeight = 16.sp
                    )
                }
            }

            // 5. Error Message Banner
            val displayError = validationError ?: errorMessage
            if (!displayError.isNullOrBlank()) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF7F1D1D),
                    border = BorderStroke(1.dp, Color(0xFFEF4444))
                ) {
                    Text(
                        text = displayError,
                        color = Color(0xFFFEE2E2),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            // 6. Confirm & Open Account Button
            Button(
                onClick = {
                    val finalAmount = selectedAmount
                    if (finalAmount < minAmount || finalAmount > maxAmount) {
                        validationError = "Monthly amount must be between ₹${minAmount.toInt()} and ₹${maxAmount.toInt()}"
                        return@Button
                    }
                    if (nomineeFullName.trim().length < 2) {
                        validationError = "Nominee full name is required (min 2 characters)"
                        return@Button
                    }
                    val finalRel = if (nomineeRelationship == "Other") customRelationshipText.trim() else nomineeRelationship
                    if (finalRel.isBlank()) {
                        validationError = "Nominee relationship is required"
                        return@Button
                    }
                    if (!termsAccepted) {
                        validationError = "Please accept the scheme terms and conditions"
                        return@Button
                    }

                    val ageInt = nomineeAgeText.toIntOrNull()

                    validationError = null
                    onSubmitJoin(
                        finalAmount,
                        nomineeFullName.trim(),
                        finalRel,
                        nomineePhone.ifBlank { null },
                        ageInt,
                        plan.termsVersion ?: "v1.0-2026"
                    )
                },
                enabled = !isLoading,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isGold) Color(0xFFD97706) else Color(0xFF38BDF8)
                ),
                shape = RoundedCornerShape(14.dp),
                contentPadding = PaddingValues(vertical = 14.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Color.Black,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = "Confirm & Open ${tenureMonths}M Scheme Account →",
                        fontWeight = FontWeight.Bold,
                        color = Color.Black,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}
