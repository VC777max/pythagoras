package com.example.padelplanner.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.padelplanner.theme.NeonPadelGreen

// 15 color choices for initials avatar
val AvatarColors = listOf(
    Color(0xFFEF4444), // red
    Color(0xFFF97316), // orange
    Color(0xFFF59E0B), // amber
    Color(0xFF10B981), // emerald
    Color(0xFF06B6D4), // cyan
    Color(0xFF3B82F6), // blue
    Color(0xFF6366F1), // indigo
    Color(0xFF8B5CF6), // violet
    Color(0xFFEC4899), // pink
    Color(0xFF14B8A6), // teal
    Color(0xFF84CC16), // lime
    Color(0xFF22C55E), // green
    Color(0xFF0EA5E9), // sky
    Color(0xFFA855F7), // purple
    Color(0xFFD946EF)  // fuchsia
)

@Composable
fun PlayerAvatar(
    avatarId: String,
    name: String,
    modifier: Modifier = Modifier,
    size: Dp = 40.dp
) {
    val initials = name.take(1).uppercase()
    val numId = avatarId.removePrefix("avatar_").toIntOrNull() ?: 1

    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(Color(0xFF1E293B)),
        contentAlignment = Alignment.Center
    ) {
        if (numId in 1..15) {
            val bgColor = AvatarColors.getOrElse(numId - 1) { AvatarColors[0] }
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(bgColor),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = initials,
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = (size.value * 0.45).sp
                )
            }
        } else {
            // Draw padel themed icons avatar_16 to avatar_20 on Canvas
            Canvas(modifier = Modifier.fillMaxSize()) {
                val w = size.toPx()
                val h = size.toPx()

                when (numId) {
                    16 -> { // Padel Racket
                        // Background circle
                        drawCircle(color = Color(0xFF1E1B4B))
                        
                        // Handle
                        drawLine(
                            color = NeonPadelGreen,
                            start = Offset(w * 0.35f, h * 0.65f),
                            end = Offset(w * 0.15f, h * 0.85f),
                            strokeWidth = w * 0.08f
                        )
                        // Grip details
                        drawLine(
                            color = Color.White,
                            start = Offset(w * 0.28f, h * 0.72f),
                            end = Offset(w * 0.20f, h * 0.80f),
                            strokeWidth = w * 0.08f
                        )
                        // Racket head
                        drawCircle(
                            color = Color(0xFF312E81),
                            radius = w * 0.24f,
                            center = Offset(w * 0.58f, h * 0.42f)
                        )
                        drawCircle(
                            color = NeonPadelGreen,
                            radius = w * 0.24f,
                            center = Offset(w * 0.58f, h * 0.42f),
                            style = Stroke(width = w * 0.05f)
                        )
                        // Holes (grid representation)
                        val holeRadius = w * 0.02f
                        val center = Offset(w * 0.58f, h * 0.42f)
                        drawCircle(Color.White, holeRadius, Offset(center.x - w * 0.08f, center.y - w * 0.08f))
                        drawCircle(Color.White, holeRadius, Offset(center.x, center.y - w * 0.1f))
                        drawCircle(Color.White, holeRadius, Offset(center.x + w * 0.08f, center.y - w * 0.08f))
                        drawCircle(Color.White, holeRadius, Offset(center.x - w * 0.1f, center.y))
                        drawCircle(Color.White, holeRadius, Offset(center.x, center.y))
                        drawCircle(Color.White, holeRadius, Offset(center.x + w * 0.1f, center.y))
                        drawCircle(Color.White, holeRadius, Offset(center.x - w * 0.08f, center.y + w * 0.08f))
                        drawCircle(Color.White, holeRadius, Offset(center.x, center.y + w * 0.1f))
                        drawCircle(Color.White, holeRadius, Offset(center.x + w * 0.08f, center.y + w * 0.08f))
                    }
                    17 -> { // Padel Ball
                        // Neon yellow base
                        drawCircle(color = Color(0xFFD9F99D))
                        // Curved lines
                        drawArc(
                            color = Color.White,
                            startAngle = 135f,
                            sweepAngle = 90f,
                            useCenter = false,
                            topLeft = Offset(-w * 0.2f, h * 0.1f),
                            size = Size(w * 0.8f, h * 0.8f),
                            style = Stroke(width = w * 0.05f)
                        )
                        drawArc(
                            color = Color.White,
                            startAngle = 315f,
                            sweepAngle = 90f,
                            useCenter = false,
                            topLeft = Offset(w * 0.4f, h * 0.1f),
                            size = Size(w * 0.8f, h * 0.8f),
                            style = Stroke(width = w * 0.05f)
                        )
                    }
                    18 -> { // Court
                        drawRect(color = Color(0xFF065F46))
                        // Boundary lines
                        drawRect(
                            color = Color.White,
                            topLeft = Offset(w * 0.15f, h * 0.15f),
                            size = Size(w * 0.7f, h * 0.7f),
                            style = Stroke(width = w * 0.03f)
                        )
                        // Net (middle horizontal)
                        drawLine(
                            color = Color(0xAAFFFFFF),
                            start = Offset(w * 0.15f, h * 0.5f),
                            end = Offset(w * 0.85f, h * 0.5f),
                            strokeWidth = w * 0.04f
                        )
                        // Service lines
                        drawLine(
                            color = Color.White,
                            start = Offset(w * 0.15f, h * 0.32f),
                            end = Offset(w * 0.85f, h * 0.32f),
                            strokeWidth = w * 0.02f
                        )
                        drawLine(
                            color = Color.White,
                            start = Offset(w * 0.15f, h * 0.68f),
                            end = Offset(w * 0.85f, h * 0.68f),
                            strokeWidth = w * 0.02f
                        )
                        // Center line
                        drawLine(
                            color = Color.White,
                            start = Offset(w * 0.5f, h * 0.15f),
                            end = Offset(w * 0.5f, h * 0.85f),
                            strokeWidth = w * 0.02f
                        )
                    }
                    19 -> { // Trophy
                        drawCircle(color = Color(0xFF78350F))
                        val path = Path().apply {
                            // Cup shape
                            moveTo(w * 0.35f, h * 0.3f)
                            lineTo(w * 0.65f, h * 0.3f)
                            lineTo(w * 0.60f, h * 0.55f)
                            quadraticBezierTo(w * 0.5f, h * 0.65f, w * 0.40f, h * 0.55f)
                            close()
                        }
                        drawPath(path = path, color = Color(0xFFFBBF24))
                        
                        // Stem & Base
                        drawLine(
                            color = Color(0xFFFBBF24),
                            start = Offset(w * 0.5f, h * 0.6f),
                            end = Offset(w * 0.5f, h * 0.72f),
                            strokeWidth = w * 0.06f
                        )
                        drawRect(
                            color = Color(0xFFFBBF24),
                            topLeft = Offset(w * 0.38f, h * 0.72f),
                            size = Size(w * 0.24f, h * 0.08f)
                        )
                        // Left & Right handles
                        drawArc(
                            color = Color(0xFFFBBF24),
                            startAngle = 120f,
                            sweepAngle = 200f,
                            useCenter = false,
                            topLeft = Offset(w * 0.25f, h * 0.35f),
                            size = Size(w * 0.16f, w * 0.16f),
                            style = Stroke(width = w * 0.04f)
                        )
                        drawArc(
                            color = Color(0xFFFBBF24),
                            startAngle = 220f,
                            sweepAngle = 200f,
                            useCenter = false,
                            topLeft = Offset(w * 0.59f, h * 0.35f),
                            size = Size(w * 0.16f, w * 0.16f),
                            style = Stroke(width = w * 0.04f)
                        )
                    }
                    20 -> { // Fire
                        drawCircle(color = Color(0xFF7F1D1D))
                        val path = Path().apply {
                            moveTo(w * 0.5f, h * 0.22f)
                            quadraticBezierTo(w * 0.65f, h * 0.45f, w * 0.65f, h * 0.65f)
                            quadraticBezierTo(w * 0.65f, h * 0.8f, w * 0.5f, h * 0.8f)
                            quadraticBezierTo(w * 0.35f, h * 0.8f, w * 0.35f, h * 0.65f)
                            quadraticBezierTo(w * 0.35f, h * 0.45f, w * 0.5f, h * 0.22f)
                        }
                        drawPath(path = path, color = Color(0xFFF97316))
                        // Inner flame
                        val innerPath = Path().apply {
                            moveTo(w * 0.5f, h * 0.45f)
                            quadraticBezierTo(w * 0.58f, h * 0.58f, w * 0.58f, h * 0.7f)
                            quadraticBezierTo(w * 0.58f, h * 0.78f, w * 0.5f, h * 0.78f)
                            quadraticBezierTo(w * 0.42f, h * 0.78f, w * 0.42f, h * 0.7f)
                            quadraticBezierTo(w * 0.42f, h * 0.58f, w * 0.5f, h * 0.45f)
                        }
                        drawPath(path = innerPath, color = Color(0xFFFBBF24))
                    }
                }
            }
        }
    }
}

@Composable
fun AvatarPicker(
    selectedAvatar: String,
    name: String,
    onAvatarSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val avatars = (1..20).map { "avatar_%02d".format(it) }

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "SELECT AVATAR",
            fontWeight = FontWeight.ExtraBold,
            fontSize = 12.sp,
            color = Color(0xFF8899BB),
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        LazyVerticalGrid(
            columns = GridCells.Fixed(5),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.height(180.dp)
        ) {
            items(avatars) { avId ->
                val isSelected = avId == selectedAvatar
                Box(
                    modifier = Modifier
                        .aspectRatio(1f)
                        .clip(CircleShape)
                        .border(
                            width = 2.dp,
                            color = if (isSelected) NeonPadelGreen else Color.Transparent,
                            shape = CircleShape
                        )
                        .clickable { onAvatarSelected(avId) }
                        .padding(4.dp),
                    contentAlignment = Alignment.Center
                ) {
                    PlayerAvatar(
                        avatarId = avId,
                        name = name,
                        size = 36.dp
                    )
                }
            }
        }
    }
}
