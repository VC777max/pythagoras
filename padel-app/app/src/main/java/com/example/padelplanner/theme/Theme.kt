package com.example.padelplanner.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val LiquidGlassDarkScheme = darkColorScheme(
    primary          = NeonPadelGreen,
    onPrimary        = OnPadelGreen,
    secondary        = CyanHighlight,
    onSecondary      = OnPadelGreen,
    tertiary         = DangerRed,
    onTertiary       = TextWhite,
    background       = DeepSpaceBlack,
    onBackground     = TextWhite,
    surface          = GlassSurface,
    onSurface        = TextWhite,
    surfaceVariant   = GlassSurfaceStrong,
    onSurfaceVariant = TextMuted,
    outline          = GlassBorder,
    outlineVariant   = GlassBorderStrong,
    error            = DangerRed,
    onError          = TextWhite
)

@Composable
fun PadelPlannerTheme(
    content: @Composable () -> Unit
) {
    // Always dark — liquid glass mode
    MaterialTheme(
        colorScheme = LiquidGlassDarkScheme,
        typography  = Typography,
        content     = content
    )
}
