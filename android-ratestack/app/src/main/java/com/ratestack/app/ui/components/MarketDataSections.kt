package com.ratestack.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.unit.dp
import com.ratestack.app.data.ApiProvider
import com.ratestack.app.data.CityComparisonDto
import com.ratestack.app.data.CityComparisonRecordDto
import com.ratestack.app.data.RateHistoryDto
import java.text.NumberFormat
import java.util.Locale

private fun inr(value: Double?) = if (value == null) "—" else NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(value)

@Composable
fun RealRateHistorySection() {
    var metal by remember { mutableStateOf("gold22k") }
    var history by remember { mutableStateOf<RateHistoryDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(metal) {
        error = null
        runCatching { ApiProvider.service.getRateHistory(metal = metal) }
            .onSuccess { response -> if (response.isSuccessful) history = response.body()?.data else error = "Stored rate history is temporarily unavailable." }
            .onFailure { error = "Stored rate history is temporarily unavailable." }
    }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("7-Day Movement", style = MaterialTheme.typography.titleLarge)
        Text("Real stored IBJA publications; missing trading days are not estimated.", style = MaterialTheme.typography.bodySmall)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("gold24k" to "24K", "gold22k" to "22K", "silver" to "Silver").forEach { choice ->
                if (metal == choice.first) Button(onClick = { metal = choice.first }) { Text(choice.second) }
                else OutlinedButton(onClick = { metal = choice.first }) { Text(choice.second) }
            }
        }
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        history?.let { data ->
            val points = data.records.orEmpty().mapNotNull { it.rate }
            if (points.isEmpty()) Text("No stored rate history is available for this selection.")
            else OutlinedCard(Modifier.fillMaxWidth()) {
                Canvas(Modifier.fillMaxWidth().height(180.dp).padding(20.dp)) {
                    val low = points.min()
                    val range = (points.max() - low).takeIf { it > 0 } ?: 1.0
                    val path = Path()
                    points.forEachIndexed { index, value ->
                        val x = if (points.size == 1) size.width / 2 else index * size.width / (points.size - 1)
                        val y = size.height - ((value - low) / range * size.height).toFloat()
                        if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
                        drawCircle(Color(0xFF8A5B12), 6f, Offset(x, y))
                    }
                    drawPath(path, Color(0xFFB7791F), style = androidx.compose.ui.graphics.drawscope.Stroke(4f))
                }
                Text("Current ${inr(data.summary?.current)}  •  High ${inr(data.summary?.high)}  •  Low ${inr(data.summary?.low)}", Modifier.padding(16.dp))
                if ((data.availableDays ?: 0) < 7) Text("Showing ${data.availableDays ?: 0} available trading days.", Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
                Text("Indicative calculated Tiruchirappalli rate", Modifier.padding(16.dp), style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
fun CityComparisonSection() {
    var search by remember { mutableStateOf("") }
    var page by remember { mutableStateOf(1) }
    var data by remember { mutableStateOf<CityComparisonDto?>(null) }
    var rows by remember { mutableStateOf(emptyList<CityComparisonRecordDto>()) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(search, page) {
        runCatching { ApiProvider.service.getCityComparison(page = page, search = search.takeIf { it.isNotBlank() }) }
            .onSuccess { response ->
                if (response.isSuccessful) response.body()?.data?.let { result ->
                    data = result
                    rows = if (page == 1) result.records.orEmpty() else (rows + result.records.orEmpty()).distinctBy { it.citySlug }
                    error = null
                } else error = "City comparison rates are temporarily unavailable."
            }.onFailure { error = "City comparison rates are temporarily unavailable." }
    }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Live Rates Across Indian Cities", style = MaterialTheme.typography.titleLarge)
        Text("Indicative city calculations use the stored market-reference rate and configured city adjustments. Source-published Trichy rates are shown without adjustment.", style = MaterialTheme.typography.bodySmall)
        OutlinedTextField(search, { search = it; page = 1 }, Modifier.fillMaxWidth(), label = { Text("Search all cities") }, singleLine = true)
        if (data?.identicalRates == true) Text("Multiple cities currently have the same calculated rate; none is labelled lowest.", style = MaterialTheme.typography.bodySmall)
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        rows.forEach { row ->
            OutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp)) {
                    Text("#${row.rank ?: "—"}  ${row.city ?: "Unknown city"}, ${row.state ?: ""}", style = MaterialTheme.typography.titleSmall)
                    Text("24K ${inr(row.gold24kPerGram)}/g  •  22K ${inr(row.gold22kPerGram)}/g")
                    Text("Silver ${inr(row.silverPerKg)}/kg")
                    Text("Indicative calculated rate • ${row.sourceName ?: "Configured source"} • ${row.rateDate ?: ""}", style = MaterialTheme.typography.labelSmall)
                }
            }
        }
        if (data?.pagination?.hasMore == true) Button(onClick = { page += 1 }) { Text("Show more") }
    }
}
