package com.example.padelplanner.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.padelplanner.data.Match
import com.example.padelplanner.data.Player
import com.example.padelplanner.data.RankedPlayer
import com.example.padelplanner.ui.PadelViewModel
import com.example.padelplanner.theme.NeonPadelGreen
import com.example.padelplanner.theme.CyanHighlight
import com.example.padelplanner.theme.DangerRed
import com.example.padelplanner.theme.GlassBorder
import com.example.padelplanner.theme.GlassSurfaceStrong
import com.example.padelplanner.theme.DeepSpaceNavy
import com.example.padelplanner.theme.DeepSpaceBlack
import com.example.padelplanner.theme.SuccessGreen
import com.example.padelplanner.theme.TextMuted
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Settings

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: PadelViewModel,
    onSettingsClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val activePlayer by viewModel.activePlayer.collectAsState()
    val activeMatches by viewModel.activeMatches.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val context = LocalContext.current

    // Friendly / Ranked toggle state
    var selectedMatchType by remember { mutableStateOf("friendly") }

    val pendingMatches = remember(activeMatches, activePlayer) {
        activeMatches.filter { m ->
            m.status == "proposed" && m.responses[activePlayer?.id] == "pending"
        }
    }

    val upcomingMatches = remember(activeMatches) {
        activeMatches.filter { m -> m.status in listOf("confirmed", "booked") }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Hallo, ${activePlayer?.name ?: "Speler"}",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 20.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Peakz Rating: ${String.format(java.util.Locale.US, "%.1f", activePlayer?.peakz_rating ?: 7.3)}",
                            color = NeonPadelGreen,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refreshAllData() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = NeonPadelGreen
                        )
                    }
                    IconButton(onClick = onSettingsClick) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = NeonPadelGreen
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
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(DeepSpaceBlack, DeepSpaceNavy)
                    )
                )
                .padding(paddingValues)
        ) {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                // Hero: Auto Matchmaker
                item {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "Auto Matchmaker",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 20.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "Find 4 players, lock a slot, book a court.",
                                color = TextMuted,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(vertical = 8.dp),
                                fontWeight = FontWeight.SemiBold
                            )

                            // Friendly / Ranked toggle
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 12.dp),
                                horizontalArrangement = Arrangement.Center
                            ) {
                                listOf("friendly" to "Friendly", "ranked" to "Ranked").forEach { (type, label) ->
                                    val selected = selectedMatchType == type
                                    Button(
                                        onClick = { selectedMatchType = type },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (selected) NeonPadelGreen else GlassSurfaceStrong
                                        ),
                                        border = BorderStroke(
                                            1.dp,
                                            if (selected) NeonPadelGreen else GlassBorder
                                        ),
                                        shape = RoundedCornerShape(6.dp),
                                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                                        modifier = Modifier.padding(horizontal = 4.dp)
                                    ) {
                                        Text(
                                            text = label,
                                            color = if (selected) DeepSpaceBlack else TextMuted,
                                            fontWeight = FontWeight.ExtraBold,
                                            fontSize = 13.sp
                                        )
                                    }
                                }
                            }

                            Button(
                                onClick = {
                                    viewModel.triggerMatchFind(matchType = selectedMatchType) { match ->
                                        if (match != null) {
                                            Toast.makeText(context, "${label(selectedMatchType)} match proposed for ${match.date}!", Toast.LENGTH_LONG).show()
                                        } else {
                                            Toast.makeText(context, "No overlapping schedules found.", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                },
                                enabled = !isLoading,
                                colors = ButtonDefaults.buttonColors(containerColor = NeonPadelGreen),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = null,
                                    tint = DeepSpaceBlack,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    "Find Padel Match",
                                    fontWeight = FontWeight.ExtraBold,
                                    color = DeepSpaceBlack
                                )
                            }
                        }
                    }
                }

                // Urgent "Play Within the Hour" Section
                item {
                    val isAvailableNow = activePlayer?.available_now == 1
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "Play Within The Hour!",
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 16.sp,
                                        color = Color.White
                                    )
                                    Text(
                                        text = "Instant Matchmaking (±0.5 Peakz tolerance)",
                                        color = TextMuted,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Switch(
                                    checked = isAvailableNow,
                                    onCheckedChange = { checked ->
                                        viewModel.toggleAvailableNow(checked)
                                        Toast.makeText(
                                            context,
                                            if (checked) "Marked as Available Now!" else "Available status cleared.",
                                            Toast.LENGTH_SHORT
                                        ).show()
                                    },
                                    colors = SwitchDefaults.colors(
                                        checkedThumbColor = DeepSpaceBlack,
                                        checkedTrackColor = NeonPadelGreen,
                                        uncheckedThumbColor = TextMuted,
                                        uncheckedTrackColor = GlassSurfaceStrong
                                    )
                                )
                            }
                            
                            if (isAvailableNow) {
                                Button(
                                    onClick = {
                                        viewModel.triggerUrgentMatch { success, message ->
                                            if (success) {
                                                Toast.makeText(context, "Instant Match Created! Go to Schedule.", Toast.LENGTH_LONG).show()
                                            } else {
                                                Toast.makeText(context, message ?: "Looking for nearby players...", Toast.LENGTH_LONG).show()
                                            }
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = CyanHighlight),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "FIND URGENT MATCH NOW",
                                        color = DeepSpaceBlack,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 13.sp
                                    )
                                }
                            }
                        }
                    }
                }

                // Match Invitations
                if (pendingMatches.isNotEmpty()) {
                    item {
                        Text(
                            text = "Invitations (${pendingMatches.size})",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 15.sp,
                            color = NeonPadelGreen
                        )
                    }
                    items(pendingMatches) { match ->
                        MatchInvitationCard(
                            match = match,
                            onAccept = { viewModel.respondToMatch(match.id, true) },
                            onReject  = { viewModel.respondToMatch(match.id, false) }
                        )
                    }
                }

                // Upcoming Games
                item {
                    Text(
                        text = "Upcoming Games",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                if (upcomingMatches.isEmpty()) {
                    item {
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(28.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "No confirmed games yet.",
                                    color = TextMuted,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }
                } else {
                    items(upcomingMatches) { match ->
                        UpcomingMatchCard(
                            match = match,
                            activePlayer = activePlayer,
                            onClaimBooking = { matchId ->
                                viewModel.claimBooking(matchId) { success, bookerName ->
                                    if (success) {
                                        Toast.makeText(context, "You claimed the booking!", Toast.LENGTH_SHORT).show()
                                    } else {
                                        Toast.makeText(context, "${bookerName ?: "Someone"} already claimed it.", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            onConfirmBooked = { matchId, bUrl, tUrl ->
                                viewModel.confirmBooked(matchId, bUrl, tUrl) { success ->
                                    if (success) {
                                        Toast.makeText(context, "Court booked! All players notified.", Toast.LENGTH_LONG).show()
                                    } else {
                                        Toast.makeText(context, "Failed to confirm booking.", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            }
                        )
                    }
                }
            }

            if (isLoading) {
                LinearProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter),
                    color = NeonPadelGreen,
                    trackColor = GlassBorder
                )
            }
        }
    }
}

// Helper to map type key to display label
private fun label(type: String) = if (type == "ranked") "Ranked" else "Friendly"

// Reusable glass card composable
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Surface(
        modifier = modifier,
        color = GlassSurfaceStrong,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, GlassBorder),
        tonalElevation = 0.dp
    ) {
        content()
    }
}

@Composable
fun MatchInvitationCard(
    match: Match,
    onAccept: () -> Unit,
    onReject: () -> Unit
) {
    val matchTypeBadgeColor = if (match.match_type == "ranked") CyanHighlight else NeonPadelGreen.copy(alpha = 0.8f)

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column {
                    Text(
                        text = "${match.date} • ${match.start} - ${match.end}",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        StatusChip("PROPOSED", NeonPadelGreen.copy(alpha = 0.15f), NeonPadelGreen)
                        StatusChip(
                            match.match_type.uppercase(),
                            matchTypeBadgeColor.copy(alpha = 0.15f),
                            matchTypeBadgeColor
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            val team1Names = match.players.filter { it.team_number == 1 }.joinToString(" & ") { it.name }
            val team2Names = match.players.filter { it.team_number == 2 }.joinToString(" & ") { it.name }

            Text(
                text = "$team1Names  vs  $team2Names",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(6.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = TextMuted,
                    modifier = Modifier.size(13.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = match.location, fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.SemiBold)
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(
                    onClick = onAccept,
                    colors = ButtonDefaults.buttonColors(containerColor = NeonPadelGreen),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Check, contentDescription = null, tint = DeepSpaceBlack, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Play", color = DeepSpaceBlack, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold)
                }
                Button(
                    onClick = onReject,
                    colors = ButtonDefaults.buttonColors(containerColor = DangerRed.copy(alpha = 0.15f)),
                    border = BorderStroke(1.dp, DangerRed.copy(alpha = 0.4f)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Close, contentDescription = null, tint = DangerRed, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Decline", color = DangerRed, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
        }
    }
}

@Composable
fun UpcomingMatchCard(
    match: Match,
    activePlayer: Player?,
    onClaimBooking: (String) -> Unit,
    onConfirmBooked: (String, String?, String?) -> Unit
) {
    val uriHandler = LocalUriHandler.current
    var bookingUrl by remember(match) { mutableStateOf(match.booking_url ?: "") }
    var tikkieUrl  by remember(match) { mutableStateOf(match.tikkie_url ?: "") }

    val activePlayerId = activePlayer?.id ?: ""
    val isBooked       = match.status == "booked"
    val hasClaimer     = match.booking_claimed_by != null
    val iAmClaimer     = match.booking_claimed_by == activePlayerId
    val matchTypeBadge = if (match.match_type == "ranked") CyanHighlight else NeonPadelGreen.copy(alpha = 0.8f)

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header row
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column {
                    Text(
                        text = "${match.date} • ${match.start} - ${match.end}",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        val statusLabel = when (match.status) {
                            "booked"    -> "BOOKED"
                            "confirmed" -> "CONFIRMED"
                            else        -> match.status.uppercase()
                        }
                        val statusColor = when (match.status) {
                            "booked"    -> SuccessGreen
                            "confirmed" -> NeonPadelGreen
                            else        -> TextMuted
                        }
                        StatusChip(statusLabel, statusColor.copy(alpha = 0.15f), statusColor)
                        StatusChip(
                            match.match_type.uppercase(),
                            matchTypeBadge.copy(alpha = 0.15f),
                            matchTypeBadge
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            val team1Names = match.players.filter { it.team_number == 1 }.joinToString(" & ") { it.name }
            val team2Names = match.players.filter { it.team_number == 2 }.joinToString(" & ") { it.name }

            Text(
                text = "$team1Names  vs  $team2Names",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(4.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = NeonPadelGreen,
                    modifier = Modifier.size(13.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = match.location, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted)
            }

            Spacer(modifier = Modifier.height(14.dp))

            // === Booker Race / Booking Section ===
            when {
                // Court fully booked — show links to all players
                isBooked -> {
                    Surface(
                        color = SuccessGreen.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, SuccessGreen.copy(alpha = 0.4f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Court Booked by ${match.booker_name ?: "a player"}",
                            color = SuccessGreen,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                        )
                    }

                    val hasBooking = !match.booking_url.isNullOrBlank()
                    val hasTikkie  = !match.tikkie_url.isNullOrBlank()

                    if (hasBooking || hasTikkie) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            if (hasBooking) {
                                Button(
                                    onClick = { uriHandler.openUri(match.booking_url!!) },
                                    colors = ButtonDefaults.buttonColors(containerColor = NeonPadelGreen),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("View Booking", color = DeepSpaceBlack, fontWeight = FontWeight.ExtraBold, fontSize = 12.sp)
                                }
                            }
                            if (hasTikkie) {
                                Button(
                                    onClick = { uriHandler.openUri(match.tikkie_url!!) },
                                    colors = ButtonDefaults.buttonColors(containerColor = CyanHighlight.copy(alpha = 0.15f)),
                                    border = BorderStroke(1.dp, CyanHighlight.copy(alpha = 0.5f)),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Pay via Tikkie", color = CyanHighlight, fontWeight = FontWeight.ExtraBold, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }

                // Race not yet claimed — all 4 players see the claim button
                !hasClaimer -> {
                    Surface(
                        color = NeonPadelGreen.copy(alpha = 0.08f),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, NeonPadelGreen.copy(alpha = 0.3f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Who books the court?",
                            color = TextMuted,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = { onClaimBooking(match.id) },
                        colors = ButtonDefaults.buttonColors(containerColor = NeonPadelGreen),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            "I'll Book the Court!",
                            color = DeepSpaceBlack,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 14.sp
                        )
                    }
                }

                // I am the claimer — show booking form with "Court Booked!" confirm button
                iAmClaimer -> {
                    Surface(
                        color = DangerRed.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, DangerRed.copy(alpha = 0.4f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "YOUR TURN TO BOOK THE COURT",
                            color = DangerRed,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = {
                            val cleanLoc = match.location.replace("Peakz Padel ", "")
                            val encodedLoc = java.net.URLEncoder.encode(cleanLoc, "UTF-8")
                            val playtime = activePlayer?.pref_playtime ?: 90
                            val typeId = if (activePlayer?.pref_court_type == "single") 10 else 13
                            val targetUrl = "https://www.peakzpadel.nl/reserveren/court-booking/reservation?daypart=---&date=${match.date}&location=${encodedLoc}&playingTimes=${playtime}&courtTypeIds=${typeId}"
                            uriHandler.openUri(targetUrl)
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            "Open Peakz Booking Page",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = bookingUrl,
                            onValueChange = { bookingUrl = it },
                            label = { Text("Booking Link / Confirmation URL", fontSize = 11.sp) },
                            singleLine = true,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NeonPadelGreen,
                                unfocusedBorderColor = GlassBorder,
                                focusedLabelColor = NeonPadelGreen,
                                unfocusedLabelColor = TextMuted
                            )
                        )
                        OutlinedTextField(
                            value = tikkieUrl,
                            onValueChange = { tikkieUrl = it },
                            label = { Text("Tikkie Payment Link", fontSize = 11.sp) },
                            singleLine = true,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NeonPadelGreen,
                                unfocusedBorderColor = GlassBorder,
                                focusedLabelColor = NeonPadelGreen,
                                unfocusedLabelColor = TextMuted
                            )
                        )
                        Button(
                            onClick = {
                                onConfirmBooked(
                                    match.id,
                                    bookingUrl.trim().ifEmpty { null },
                                    tikkieUrl.trim().ifEmpty { null }
                                )
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = SuccessGreen),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, tint = DeepSpaceBlack, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                "Court Booked!",
                                color = DeepSpaceBlack,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 14.sp
                            )
                        }
                    }
                }

                // Someone else claimed it — show who
                else -> {
                    Surface(
                        color = CyanHighlight.copy(alpha = 0.08f),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, CyanHighlight.copy(alpha = 0.3f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "${match.booker_name ?: "A player"} is booking the court...",
                            color = CyanHighlight,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun StatusChip(label: String, background: androidx.compose.ui.graphics.Color, textColor: androidx.compose.ui.graphics.Color) {
    Surface(
        color = background,
        shape = RoundedCornerShape(4.dp)
    ) {
        Text(
            text = label,
            color = textColor,
            fontSize = 9.sp,
            fontWeight = FontWeight.ExtraBold,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}
