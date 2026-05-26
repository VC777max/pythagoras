package com.example.padelplanner.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.padelplanner.data.RankedPlayer
import com.example.padelplanner.data.Badge
import com.example.padelplanner.data.SeasonLeaderboardEntry
import com.example.padelplanner.ui.PadelViewModel
import com.example.padelplanner.theme.NeonPadelGreen
import com.example.padelplanner.theme.CyanHighlight
import com.example.padelplanner.theme.GlassSurface
import com.example.padelplanner.theme.GlassSurfaceStrong
import com.example.padelplanner.theme.GlassBorder

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaderboardScreen(
    viewModel: PadelViewModel,
    modifier: Modifier = Modifier
) {
    val rankings by viewModel.rankings.collectAsState()
    val myBadges by viewModel.myBadges.collectAsState()
    val currentSeasonResponse by viewModel.currentSeason.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val activePlayer by viewModel.activePlayer.collectAsState()

    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Global Ratings", "Season 1")

    Scaffold(
        topBar = {
            Column(modifier = Modifier.background(MaterialTheme.colorScheme.background)) {
                TopAppBar(
                    title = { Text("LEADERBOARD", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp) },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
                )
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color.Transparent,
                    contentColor = NeonPadelGreen,
                    indicator = { tabPositions ->
                        TabRowDefaults.SecondaryIndicator(
                            modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                            color = NeonPadelGreen
                        )
                    }
                ) {
                    tabs.forEachIndexed { index, title ->
                        Tab(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            text = {
                                Text(
                                    text = title,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 14.sp,
                                    color = if (selectedTab == index) NeonPadelGreen else Color(0xFF8899BB)
                                )
                            }
                        )
                    }
                }
            }
        },
        modifier = modifier
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
        ) {
            if (selectedTab == 0) {
                // Global ELO tab
                val topThree = rankings.take(3)
                val remaining = if (rankings.size > 3) rankings.subList(3, rankings.size) else emptyList()

                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Badge Section for Active Player
                    if (myBadges.isNotEmpty()) {
                        item {
                            MyBadgesSection(badges = myBadges)
                        }
                    }

                    // Podium Section
                    if (topThree.isNotEmpty()) {
                        item {
                            PodiumSection(topThree = topThree)
                        }
                    }

                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "All Peakz Ratings",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 15.sp,
                            color = Color.White,
                            modifier = Modifier.padding(bottom = 4.dp)
                        )
                    }

                    if (rankings.isEmpty()) {
                        item {
                            EmptyLeaderboardCard(msg = "No players found in this season.")
                        }
                    } else {
                        itemsIndexed(remaining) { index, player ->
                            PlayerRankingRow(rank = index + 4, player = player)
                        }
                    }
                }
            } else {
                // Season Tab
                val season = currentSeasonResponse?.season
                val leaderboard = currentSeasonResponse?.leaderboard ?: emptyList()
                val biggestClimber = currentSeasonResponse?.biggest_climber

                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Season Header info
                    if (season != null) {
                        item {
                            SeasonInfoCard(
                                name = season.name,
                                start = season.start_date,
                                end = season.end_date
                            )
                        }
                    }

                    // Biggest Climber Banner
                    if (biggestClimber != null) {
                        item {
                            BiggestClimberCard(entry = biggestClimber)
                        }
                    }

                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Season Leaderboard",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 15.sp,
                            color = Color.White,
                            modifier = Modifier.padding(bottom = 4.dp)
                        )
                    }

                    if (leaderboard.isEmpty()) {
                        item {
                            EmptyLeaderboardCard(msg = "No season data recorded yet.")
                        }
                    } else {
                        itemsIndexed(leaderboard) { index, entry ->
                            SeasonRankingRow(rank = index + 1, entry = entry)
                        }
                    }
                }
            }

            if (isLoading) {
                LinearProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter),
                    color = NeonPadelGreen
                )
            }
        }
    }
}

@Composable
fun MyBadgesSection(badges: List<Badge>) {
    val badgeTitles = mapOf(
        "first_blood" to "🎯 First Blood",
        "machine" to "🤖 Machine",
        "legend" to "👑 Legend",
        "padel_addict" to "🔥 Addict",
        "all_time_high" to "⛰️ Peak Rating",
        "clutch" to "⚡ Clutch",
        "hat_trick" to "🎩 Hat Trick",
        "climber" to "📈 Climber"
    )

    Card(
        colors = CardDefaults.cardColors(containerColor = GlassSurface),
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, GlassBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = "MY EARNED BADGES",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 11.sp,
                color = CyanHighlight,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(badges) { badge ->
                    val label = badgeTitles[badge.badge_id] ?: badge.badge_id
                    Box(
                        modifier = Modifier
                            .background(GlassSurfaceStrong, RoundedCornerShape(16.dp))
                            .border(1.dp, NeonPadelGreen.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = label,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun BiggestClimberCard(entry: SeasonLeaderboardEntry) {
    Card(
        colors = CardDefaults.cardColors(containerColor = GlassSurface),
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, NeonPadelGreen),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                PlayerAvatar(avatarId = entry.avatar, name = entry.name, size = 32.dp)
                Column {
                    Text(
                        text = "🏆 GROOTSTE KLIMMER",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 10.sp,
                        color = NeonPadelGreen
                    )
                    Text(
                        text = entry.name,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 15.sp,
                        color = Color.White
                    )
                }
            }
            Box(
                modifier = Modifier
                    .background(NeonPadelGreen.copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = "+${entry.climber_delta} ELO",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 13.sp,
                    color = NeonPadelGreen
                )
            }
        }
    }
}

@Composable
fun SeasonInfoCard(name: String, start: String, end: String) {
    Card(
        colors = CardDefaults.cardColors(containerColor = GlassSurface),
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, GlassBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = name.uppercase(),
                fontWeight = FontWeight.ExtraBold,
                fontSize = 16.sp,
                color = Color.White
            )
            Text(
                text = "Timeline: $start to $end",
                fontWeight = FontWeight.Medium,
                fontSize = 12.sp,
                color = Color(0xFF8899BB)
            )
        }
    }
}

@Composable
fun PodiumSection(topThree: List<RankedPlayer>) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.Bottom
    ) {
        if (topThree.size > 1) {
            Box(modifier = Modifier.weight(1f)) {
                PodiumCard(player = topThree[1], rank = 2, height = 110.dp)
            }
        } else {
            Spacer(modifier = Modifier.weight(1f))
        }

        if (topThree.isNotEmpty()) {
            Box(modifier = Modifier.weight(1.2f)) {
                PodiumCard(player = topThree[0], rank = 1, height = 135.dp)
            }
        }

        if (topThree.size > 2) {
            Box(modifier = Modifier.weight(1f)) {
                PodiumCard(player = topThree[2], rank = 3, height = 95.dp)
            }
        } else {
            Spacer(modifier = Modifier.weight(1f))
        }
    }
}

@Composable
fun PodiumCard(player: RankedPlayer, rank: Int, height: androidx.compose.ui.unit.Dp) {
    val cardColor = when (rank) {
        1 -> NeonPadelGreen.copy(alpha = 0.12f)
        2 -> CyanHighlight.copy(alpha = 0.1f)
        else -> GlassSurfaceStrong
    }

    val badgeColor = when (rank) {
        1 -> NeonPadelGreen
        2 -> CyanHighlight
        else -> Color(0xFF8899BB)
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = cardColor),
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, badgeColor.copy(alpha = 0.3f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .fillMaxWidth()
                .height(height)
                .padding(8.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Surface(
                color = badgeColor,
                shape = CircleShape,
                modifier = Modifier.size(22.dp)
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Text(
                        text = rank.toString(),
                        color = Color.Black,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                PlayerAvatar(avatarId = player.avatar, name = player.name, size = 32.dp)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = player.name,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center,
                    color = Color.White
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = String.format(java.util.Locale.US, "%.1f Rating", player.peakz_rating),
                    color = NeonPadelGreen,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }
        }
    }
}

@Composable
fun PlayerRankingRow(rank: Int, player: RankedPlayer) {
    Card(
        colors = CardDefaults.cardColors(containerColor = GlassSurface),
        shape = RoundedCornerShape(6.dp),
        border = BorderStroke(1.dp, GlassBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "$rank.",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 14.sp,
                color = Color(0xFF8899BB),
                modifier = Modifier.width(28.dp)
            )

            PlayerAvatar(avatarId = player.avatar, name = player.name, size = 32.dp)
            Spacer(modifier = Modifier.width(8.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = player.name,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 14.sp,
                    color = Color.White
                )
                Text(
                    text = "Lvl ${player.level} • ${player.position}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF8899BB)
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = String.format(java.util.Locale.US, "%.1f Rating", player.peakz_rating),
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 14.sp,
                    color = NeonPadelGreen
                )
                Text(
                    text = "Peak ${String.format(java.util.Locale.US, "%.1f", player.peakz_rating_peak)}",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF8899BB)
                )
            }
        }
    }
}

@Composable
fun SeasonRankingRow(rank: Int, entry: SeasonLeaderboardEntry) {
    Card(
        colors = CardDefaults.cardColors(containerColor = GlassSurface),
        shape = RoundedCornerShape(6.dp),
        border = BorderStroke(1.dp, GlassBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "$rank.",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 14.sp,
                color = Color(0xFF8899BB),
                modifier = Modifier.width(28.dp)
            )

            PlayerAvatar(avatarId = entry.avatar, name = entry.name, size = 32.dp)
            Spacer(modifier = Modifier.width(8.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = entry.name,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 14.sp,
                    color = Color.White
                )
                Text(
                    text = "Start: ${String.format(java.util.Locale.US, "%.1f", entry.peakz_rating_start)} • Wins: ${entry.wins}/${entry.games_played}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF8899BB)
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = String.format(java.util.Locale.US, "%.1f Rating", entry.peakz_rating_current),
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 14.sp,
                    color = NeonPadelGreen
                )
                Text(
                    text = if (entry.peakz_rating_climber_delta >= 0) "+${String.format(java.util.Locale.US, "%.1f", entry.peakz_rating_climber_delta)}" else String.format(java.util.Locale.US, "%.1f", entry.peakz_rating_climber_delta),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (entry.peakz_rating_climber_delta >= 0) NeonPadelGreen else Color.Red
                )
            }
        }
    }
}

@Composable
fun EmptyLeaderboardCard(msg: String) {
    Card(
        colors = CardDefaults.cardColors(containerColor = GlassSurface),
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, GlassBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = msg,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF8899BB)
            )
        }
    }
}
