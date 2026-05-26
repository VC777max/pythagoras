package com.example.padelplanner.theme

import androidx.compose.ui.graphics.Color

// Accent
val NeonPadelGreen = Color(0xFFC0FF00)
val OnPadelGreen   = Color(0xFF050A0F)

// Background — deep space gradient base
val DeepSpaceBlack = Color(0xFF050A0F)
val DeepSpaceNavy  = Color(0xFF0A1628)

// Glass surfaces
val GlassSurface       = Color(0x1AFFFFFF) // white 10% — base card
val GlassSurfaceStrong = Color(0x26FFFFFF) // white 15% — elevated card
val GlassBorder        = Color(0x33FFFFFF) // white 20% — card border
val GlassBorderStrong  = Color(0x55FFFFFF) // white 33% — focused border

// Status colors
val CyanHighlight   = Color(0xFF22D3EE) // info / secondary
val SuccessGreen    = Color(0xFF4ADE80) // booked confirmation
val WarningAmber    = Color(0xFFFBBF24) // warning
val DangerRed       = Color(0xFFEF4444) // decline/cancel

// Text
val TextWhite      = Color(0xFFF0F4FF)
val TextMuted      = Color(0xFF8899BB)
val TextFaint      = Color(0xFF445577)

// Legacy aliases (for gradual migration)
val DarkBackground = DeepSpaceBlack
val DarkSurface    = GlassSurface
val SurfaceCard    = GlassSurfaceStrong
val BorderGray     = GlassBorder
val BrightCancelRed = DangerRed
val TextLightGray  = TextMuted
