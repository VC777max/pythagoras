package com.example.padelplanner.ui.screens

import android.app.DatePickerDialog
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.padelplanner.data.Availability
import com.example.padelplanner.data.OnceAvailability
import com.example.padelplanner.ui.PadelViewModel
import com.example.padelplanner.theme.*
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AvailabilityScreen(
    viewModel: PadelViewModel,
    modifier: Modifier = Modifier
) {
    val myAvailability     by viewModel.myAvailability.collectAsState()
    val myOnceAvailability by viewModel.myOnceAvailability.collectAsState()
    val isLoading          by viewModel.isLoading.collectAsState()
    val context = LocalContext.current

    // Tab state
    var selectedTab by remember { mutableIntStateOf(0) }

    // --- Shared slot definitions (08:00 → 22:30 in 30-min steps, 90-min window) ---
    val standardSlots = remember {
        buildList {
            var hour = 8; var minute = 0
            while (hour < 22 || (hour == 22 && minute == 0)) {
                val start = "${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')}"
                val endMin = hour * 60 + minute + 90
                val end   = "${(endMin / 60).toString().padStart(2,'0')}:${(endMin % 60).toString().padStart(2,'0')}"
                add(TimeSlot(start, end))
                minute += 30
                if (minute >= 60) { hour += 1; minute = 0 }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Availability", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                        Text(
                            if (selectedTab == 0) "Recurring weekly slots" else "Specific date slots",
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
                // Tab row
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = DeepSpaceBlack,
                    contentColor = NeonPadelGreen,
                    divider = {}
                ) {
                    listOf("Weekly", "One-time").forEachIndexed { idx, label ->
                        Tab(
                            selected = selectedTab == idx,
                            onClick  = { selectedTab = idx },
                            text = {
                                Text(
                                    label,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 13.sp,
                                    color = if (selectedTab == idx) NeonPadelGreen else TextMuted
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

                when (selectedTab) {
                    0 -> WeeklyAvailabilityTab(
                        myAvailability = myAvailability,
                        standardSlots  = standardSlots,
                        onSave = { slots ->
                            viewModel.updateAvailability(slots)
                            Toast.makeText(context, "Weekly availability saved.", Toast.LENGTH_SHORT).show()
                        }
                    )
                    1 -> OnceAvailabilityTab(
                        myOnceAvailability = myOnceAvailability,
                        standardSlots = standardSlots,
                        onSave = { slots ->
                            viewModel.updateOnceAvailability(slots)
                            Toast.makeText(context, "One-time availability saved.", Toast.LENGTH_SHORT).show()
                        }
                    )
                }
            }
        }
    }
}

// ============================
// Weekly tab (existing grid)
// ============================
@Composable
fun WeeklyAvailabilityTab(
    myAvailability: List<Availability>,
    standardSlots: List<TimeSlot>,
    onSave: (List<Availability>) -> Unit
) {
    val daysOfWeek = listOf("maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag","zondag")
    var selectedDay by remember { mutableStateOf("maandag") }
    val selectedSlots = remember { mutableStateMapOf<String, Boolean>() }

    LaunchedEffect(myAvailability) {
        selectedSlots.clear()
        myAvailability.forEach { avail ->
            selectedSlots["${avail.day_name.lowercase()}|${avail.start_time}"] = true
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Day chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            daysOfWeek.forEach { day ->
                val isActive = day == selectedDay
                val hasDots  = selectedSlots.keys.any { it.startsWith("${day}|") && selectedSlots[it] == true }
                Box(
                    modifier = Modifier
                        .background(
                            if (isActive) NeonPadelGreen else GlassSurfaceStrong,
                            RoundedCornerShape(8.dp)
                        )
                        .border(1.dp, if (isActive) NeonPadelGreen else GlassBorder, RoundedCornerShape(8.dp))
                        .clickable { selectedDay = day }
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            day.replaceFirstChar { it.uppercase() },
                            color = if (isActive) DeepSpaceBlack else TextMuted,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 12.sp
                        )
                        if (hasDots) {
                            Box(modifier = Modifier.size(6.dp).background(if (isActive) DeepSpaceBlack else NeonPadelGreen, CircleShape))
                        }
                    }
                }
            }
        }

        // Slots grid
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.weight(1f)
        ) {
            item {
                Text(
                    "Tap slots when you can play on ${selectedDay.replaceFirstChar { it.uppercase() }}. Every 30 min, 90-min window.",
                    color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
            }
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        standardSlots.chunked(3).forEach { row ->
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                row.forEach { slot ->
                                    val key = "${selectedDay.lowercase()}|${slot.start}"
                                    val on  = selectedSlots[key] ?: false
                                    Button(
                                        onClick = { selectedSlots[key] = !(selectedSlots[key] ?: false) },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (on) NeonPadelGreen else GlassSurfaceStrong
                                        ),
                                        border = if (!on) BorderStroke(1.dp, GlassBorder) else null,
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(2.dp),
                                        modifier = Modifier.weight(1f).height(44.dp)
                                    ) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text(slot.start, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = if (on) DeepSpaceBlack else TextMuted)
                                            Text("→ ${slot.end}", fontSize = 8.sp, color = if (on) DeepSpaceBlack.copy(alpha = 0.7f) else TextFaint)
                                        }
                                    }
                                }
                                repeat(3 - row.size) { Spacer(modifier = Modifier.weight(1f)) }
                            }
                        }
                    }
                }
            }
        }

        // Save button
        Button(
            onClick = {
                val list = selectedSlots
                    .filter { it.value }
                    .mapNotNull { (key, _) ->
                        val parts = key.split("|")
                        val slot = standardSlots.find { it.start == parts[1] } ?: return@mapNotNull null
                        Availability(parts[0], slot.start, slot.end)
                    }
                onSave(list)
            },
            colors = ButtonDefaults.buttonColors(containerColor = NeonPadelGreen),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Text("Save Weekly Schedule", color = DeepSpaceBlack, fontWeight = FontWeight.ExtraBold)
        }
    }
}

// ============================
// One-time tab
// ============================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OnceAvailabilityTab(
    myOnceAvailability: List<OnceAvailability>,
    standardSlots: List<TimeSlot>,
    onSave: (List<OnceAvailability>) -> Unit
) {
    val context = LocalContext.current
    val today = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()) }

    // Working copy — mutable map: date -> set of start_times
    val slotsMap = remember { mutableStateMapOf<String, MutableSet<String>>() }

    // Selected date for the slot picker
    var pickedDate by remember { mutableStateOf("") }

    // Sync from backend
    LaunchedEffect(myOnceAvailability) {
        slotsMap.clear()
        myOnceAvailability.forEach { slot ->
            slotsMap.getOrPut(slot.date) { mutableSetOf() }.add(slot.start_time)
        }
    }

    // All unique dates present (sorted ascending future only)
    val sortedDates = remember(slotsMap.keys.toList()) {
        slotsMap.keys.filter { it >= today }.sorted()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(1f)
        ) {
            item {
                Text(
                    "Add a date you're available for a one-off game. These are temporary — they don't repeat.",
                    color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Medium
                )
            }

            // Add date button
            item {
                Button(
                    onClick = {
                        val cal = Calendar.getInstance()
                        DatePickerDialog(
                            context,
                            { _, y, m, d ->
                                val selected = String.format(Locale.getDefault(), "%04d-%02d-%02d", y, m + 1, d)
                                if (selected >= today) {
                                    pickedDate = selected
                                    // Ensure date entry exists so user can pick slots
                                    slotsMap.getOrPut(selected) { mutableSetOf() }
                                } else {
                                    Toast.makeText(context, "Pick a future date.", Toast.LENGTH_SHORT).show()
                                }
                            },
                            cal.get(Calendar.YEAR),
                            cal.get(Calendar.MONTH),
                            cal.get(Calendar.DAY_OF_MONTH)
                        ).also { dlg ->
                            dlg.datePicker.minDate = cal.timeInMillis
                        }.show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = GlassSurfaceStrong),
                    border = BorderStroke(1.dp, NeonPadelGreen.copy(alpha = 0.5f)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, tint = NeonPadelGreen, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Add a Date", color = NeonPadelGreen, fontWeight = FontWeight.ExtraBold)
                }
            }

            // Show slot picker for the picked date
            if (pickedDate.isNotEmpty() && slotsMap.containsKey(pickedDate)) {
                item {
                    DateSlotPicker(
                        date = pickedDate,
                        selectedStarts = slotsMap[pickedDate] ?: mutableSetOf(),
                        standardSlots = standardSlots,
                        onToggle = { start ->
                            val set = slotsMap.getOrPut(pickedDate) { mutableSetOf() }
                            if (set.contains(start)) set.remove(start) else set.add(start)
                            // Trigger recompose
                            slotsMap[pickedDate] = set.toMutableSet()
                        },
                        onRemoveDate = {
                            slotsMap.remove(pickedDate)
                            pickedDate = ""
                        }
                    )
                }
            }

            // Existing date entries
            if (sortedDates.isNotEmpty()) {
                item {
                    Text("Your one-time slots:", fontWeight = FontWeight.ExtraBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                }
            }

            items(sortedDates) { date ->
                val starts = slotsMap[date] ?: emptySet()
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.DateRange, contentDescription = null, tint = NeonPadelGreen, modifier = Modifier.size(16.dp))
                                Text(formatDate(date), fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                TextButton(
                                    onClick = { pickedDate = date },
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text("Edit", color = NeonPadelGreen, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold)
                                }
                                IconButton(
                                    onClick = {
                                        slotsMap.remove(date)
                                        if (pickedDate == date) pickedDate = ""
                                    },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(Icons.Default.Close, contentDescription = "Remove", tint = DangerRed, modifier = Modifier.size(14.dp))
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        if (starts.isEmpty()) {
                            Text("No slots selected — tap Edit to add slots.", color = TextFaint, fontSize = 11.sp)
                        } else {
                            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                starts.sorted().forEach { start ->
                                    val slot = standardSlots.find { it.start == start }
                                    Surface(
                                        color = NeonPadelGreen.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(6.dp),
                                        border = BorderStroke(1.dp, NeonPadelGreen.copy(alpha = 0.4f))
                                    ) {
                                        Text(
                                            text = if (slot != null) "$start → ${slot.end}" else start,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = NeonPadelGreen,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Save button
        Button(
            onClick = {
                val result = slotsMap.flatMap { (date, starts) ->
                    starts.mapNotNull { start ->
                        val slot = standardSlots.find { it.start == start } ?: return@mapNotNull null
                        OnceAvailability(date, slot.start, slot.end)
                    }
                }
                onSave(result)
            },
            colors = ButtonDefaults.buttonColors(containerColor = NeonPadelGreen),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Text("Save One-Time Slots", color = DeepSpaceBlack, fontWeight = FontWeight.ExtraBold)
        }
    }
}

// Slot picker for a single picked date
@Composable
fun DateSlotPicker(
    date: String,
    selectedStarts: Set<String>,
    standardSlots: List<TimeSlot>,
    onToggle: (String) -> Unit,
    onRemoveDate: () -> Unit
) {
    GlassCard(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    "Slots for ${formatDate(date)}",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                IconButton(onClick = onRemoveDate, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.Close, contentDescription = "Remove date", tint = DangerRed, modifier = Modifier.size(14.dp))
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                standardSlots.chunked(3).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        row.forEach { slot ->
                            val on = selectedStarts.contains(slot.start)
                            Button(
                                onClick = { onToggle(slot.start) },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (on) NeonPadelGreen else GlassSurfaceStrong
                                ),
                                border = if (!on) BorderStroke(1.dp, GlassBorder) else null,
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(2.dp),
                                modifier = Modifier.weight(1f).height(44.dp)
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(slot.start, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = if (on) DeepSpaceBlack else TextMuted)
                                    Text("→ ${slot.end}", fontSize = 8.sp, color = if (on) DeepSpaceBlack.copy(alpha = 0.7f) else TextFaint)
                                }
                            }
                        }
                        repeat(3 - row.size) { Spacer(modifier = Modifier.weight(1f)) }
                    }
                }
            }
        }
    }
}

private fun formatDate(dateStr: String): String {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val out = SimpleDateFormat("EEE d MMM", Locale("nl", "NL"))
        out.format(sdf.parse(dateStr)!!)
    } catch (e: Exception) {
        dateStr
    }
}

data class TimeSlot(val start: String, val end: String)
