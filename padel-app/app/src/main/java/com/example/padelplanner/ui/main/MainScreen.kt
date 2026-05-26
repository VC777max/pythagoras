package com.example.padelplanner.ui.main

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.sp
import androidx.navigation3.runtime.NavKey
import com.example.padelplanner.ui.PadelViewModel
import com.example.padelplanner.ui.screens.LoginScreen
import com.example.padelplanner.ui.screens.HomeScreen
import com.example.padelplanner.ui.screens.AvailabilityScreen
import com.example.padelplanner.ui.screens.CourtsScreen
import com.example.padelplanner.ui.screens.ScoreScreen
import com.example.padelplanner.ui.screens.LeaderboardScreen
import com.example.padelplanner.ui.screens.SettingsScreen
import com.example.padelplanner.theme.NeonPadelGreen
import com.example.padelplanner.theme.TextMuted
import com.example.padelplanner.theme.DeepSpaceBlack
import com.example.padelplanner.theme.GlassSurfaceStrong
import com.example.padelplanner.theme.GlassBorder

import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Star

private data class NavTab(val label: String, val icon: ImageVector)

private val NAV_TABS = listOf(
    NavTab("Home",      Icons.Default.Home),
    NavTab("Schedule",  Icons.Default.DateRange),
    NavTab("Courts",    Icons.Default.Place),
    NavTab("Scores",    Icons.Default.Check),
    NavTab("Rankings",  Icons.Default.Star)
)

@Composable
fun MainScreen(
    viewModel: PadelViewModel,
    onItemClick: (NavKey) -> Unit,
    modifier: Modifier = Modifier
) {
    val activePlayer by viewModel.activePlayer.collectAsState()

    if (activePlayer == null) {
        LoginScreen(
            viewModel = viewModel,
            onLoginSuccess = { viewModel.refreshAllData() },
            modifier = modifier
        )
    } else {
        var selectedTab by rememberSaveable { mutableIntStateOf(0) }
        var showSettings by rememberSaveable { mutableStateOf(false) }

        if (showSettings) {
            SettingsScreen(
                viewModel = viewModel,
                onDismiss = { showSettings = false },
                modifier = modifier
            )
        } else {
            Scaffold(
                bottomBar = {
                    NavigationBar(
                        containerColor = DeepSpaceBlack,
                        contentColor = NeonPadelGreen,
                        tonalElevation = 0.dp
                    ) {
                        NAV_TABS.forEachIndexed { idx, tab ->
                            NavigationBarItem(
                                selected = selectedTab == idx,
                                onClick  = { selectedTab = idx },
                                icon = {
                                    Icon(
                                        tab.icon,
                                        contentDescription = tab.label,
                                        tint = if (selectedTab == idx) NeonPadelGreen else TextMuted
                                    )
                                },
                                label = {
                                    Text(
                                        tab.label,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (selectedTab == idx) NeonPadelGreen else TextMuted
                                    )
                                },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor   = NeonPadelGreen,
                                    unselectedIconColor = TextMuted,
                                    indicatorColor      = NeonPadelGreen.copy(alpha = 0.12f)
                                )
                            )
                        }
                    }
                },
                containerColor = DeepSpaceBlack,
                modifier = modifier
            ) { paddingValues ->
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                ) {
                    when (selectedTab) {
                        0 -> HomeScreen(viewModel = viewModel, onSettingsClick = { showSettings = true })
                        1 -> AvailabilityScreen(viewModel = viewModel)
                        2 -> CourtsScreen(viewModel = viewModel)
                        3 -> ScoreScreen(viewModel = viewModel)
                        4 -> LeaderboardScreen(viewModel = viewModel)
                    }
                }
            }
        }
    }
}
