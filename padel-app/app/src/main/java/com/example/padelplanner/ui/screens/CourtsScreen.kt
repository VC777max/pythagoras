package com.example.padelplanner.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.padelplanner.data.Court
import com.example.padelplanner.ui.PadelViewModel
import com.example.padelplanner.theme.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourtsScreen(
    viewModel: PadelViewModel,
    modifier: Modifier = Modifier
) {
    val courts by viewModel.courts.collectAsState()
    val activePlayer by viewModel.activePlayer.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val context = LocalContext.current

    // Date tabs: Today / Tomorrow / +2
    val dateOptions = remember {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val labels = listOf("Today", "Tomorrow", "+2 Days")
        val today = Calendar.getInstance()
        labels.mapIndexed { idx, label ->
            val cal = Calendar.getInstance()
            cal.add(Calendar.DATE, idx)
            Pair(label, sdf.format(cal.time))
        }
    }
    var selectedDateIdx by remember { mutableIntStateOf(0) }

    LaunchedEffect(selectedDateIdx) {
        viewModel.loadCourtsForDate(dateOptions[selectedDateIdx].second)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Available Courts",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 20.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = activePlayer?.city ?: "Groningen",
                            color = NeonPadelGreen,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DeepSpaceBlack)
            )
        },
        containerColor = DeepSpaceBlack,
        modifier = modifier
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(listOf(DeepSpaceBlack, DeepSpaceNavy)))
                .padding(paddingValues)
        ) {
            Column {
                // Date selector tabs
                ScrollableTabRow(
                    selectedTabIndex = selectedDateIdx,
                    containerColor = DeepSpaceBlack,
                    contentColor = NeonPadelGreen,
                    edgePadding = 16.dp,
                    divider = {}
                ) {
                    dateOptions.forEachIndexed { idx, (label, _) ->
                        Tab(
                            selected = selectedDateIdx == idx,
                            onClick = { selectedDateIdx = idx },
                            text = {
                                Text(
                                    text = label,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 13.sp,
                                    color = if (selectedDateIdx == idx) NeonPadelGreen else TextMuted
                                )
                            }
                        )
                    }
                }

                if (isLoading) {
                    LinearProgressIndicator(
                        modifier = Modifier.fillMaxWidth(),
                        color = NeonPadelGreen,
                        trackColor = GlassBorder
                    )
                }

                if (courts.isEmpty() && !isLoading) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "No open slots found",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 16.sp,
                                color = TextMuted
                            )
                            Text(
                                text = "Try a different date or update your city in Settings.",
                                fontSize = 12.sp,
                                color = TextFaint,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(courts) { court ->
                            CourtCard(court = court, onBook = {
                                Toast.makeText(context, "Opening Peakz booking for ${court.location}...", Toast.LENGTH_SHORT).show()
                            })
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CourtCard(court: Court, onBook: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = NeonPadelGreen,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = court.location,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${court.time}  •  ${court.courtType}  •  ${court.price}",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextMuted
                )
                if (court.isOutdoor && court.weather != null) {
                    val w = court.weather
                    val weatherIcon = when {
                        w.weather_code < 3 -> "☀️"
                        w.weather_code < 50 -> "☁️"
                        else -> "🌧️"
                    }
                    val playabilityText = if (w.is_playable) "Playable" else "Unplayable"
                    val playabilityColor = if (w.is_playable) SuccessGreen else DangerRed
                    
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = "$weatherIcon ${w.temperature}°C • ${w.wind_speed} km/h",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = CyanHighlight
                        )
                        Box(
                            modifier = Modifier
                                .background(playabilityColor.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = playabilityText,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = playabilityColor
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Button(
                onClick = onBook,
                colors = ButtonDefaults.buttonColors(containerColor = NeonPadelGreen),
                shape = RoundedCornerShape(8.dp),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Text(
                    text = "Book",
                    color = DeepSpaceBlack,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }
        }
    }
}

