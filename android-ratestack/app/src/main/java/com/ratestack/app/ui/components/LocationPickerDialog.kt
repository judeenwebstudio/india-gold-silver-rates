package com.ratestack.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ratestack.app.data.CityOption
import com.ratestack.app.data.StateOption

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationPickerDialog(
    states: List<StateOption>,
    cities: List<CityOption>,
    currentSelection: Pair<String?, String?>,
    onDismiss: () -> Unit,
    onSelectCity: (stateSlug: String, citySlug: String) -> Unit,
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedStateSlug by remember { mutableStateOf(currentSelection.first ?: states.firstOrNull()?.slug) }

    val filteredCities = remember(cities, selectedStateSlug, searchQuery) {
        cities.filter { city ->
            (selectedStateSlug == null || city.state.slug.equals(selectedStateSlug, ignoreCase = true)) &&
            (searchQuery.isBlank() || city.name.contains(searchQuery, ignoreCase = true) || city.state.name.contains(searchQuery, ignoreCase = true))
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Select Location / City", fontWeight = FontWeight.Bold)
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }
        },
        text = {
            Column(Modifier.fillMaxWidth().heightIn(max = 450.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Search city or state…") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true
                )

                if (states.isNotEmpty() && searchQuery.isBlank()) {
                    Text("Filter by State", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                    ScrollableTabRow(
                        selectedTabIndex = states.indexOfFirst { it.slug == selectedStateSlug }.coerceAtLeast(0),
                        edgePadding = 0.dp
                    ) {
                        states.forEach { state ->
                            Tab(
                                selected = state.slug == selectedStateSlug,
                                onClick = { selectedStateSlug = state.slug },
                                text = { Text(state.name, fontSize = 12.sp, fontWeight = FontWeight.SemiBold) }
                            )
                        }
                    }
                }

                Text("Available Cities (${filteredCities.size})", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)

                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    items(filteredCities, key = { "${it.state.slug}-${it.slug}" }) { city ->
                        val isCurrent = city.slug.equals(currentSelection.second, ignoreCase = true)
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    onSelectCity(city.state.slug, city.slug)
                                    onDismiss()
                                },
                            color = if (isCurrent) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(city.name, fontWeight = FontWeight.Bold)
                                    Text(city.state.name, style = MaterialTheme.typography.bodySmall)
                                }
                                if (isCurrent) {
                                    Text("Selected", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {}
    )
}
