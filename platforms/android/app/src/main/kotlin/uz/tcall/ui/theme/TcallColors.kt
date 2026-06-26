package uz.tcall.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

object TcallColors {
    val BgPrimary = Color(0xFFF2F2F7)
    val BgElevated = Color(0xFFFFFFFF)
    val AuthBg = Color(0xFFE8ECF6)
    val TextPrimary = Color(0xFF1C1C1E)
    val TextSecondary = Color(0x993C3C43)
    val TextTertiary = Color(0x6B3C3C43)
    val Separator = Color(0x2E3C3C43)
    val BorderLight = Color(0x0F000000)

    val IosBlue = Color(0xFF007AFF)
    val IosBlueLight = Color(0xFF1A90FF)
    val IosBlueDark = Color(0xFF0062CC)
    val BrandPurple = Color(0xFF5856D6)
    val BrandIndigo = Color(0xFF4F46E5)
    val Brand600 = Color(0xFF4F46E5)
    val CallGreen = Color(0xFF34C759)
    val Destructive = Color(0xFFFF3B30)

    val TabBarBg = Color(0xE0F5F7FC)
    val TabInactive = Color(0x6B3C3C43)
    val Slate400 = Color(0xFF94A3B8)
    val Slate500 = Color(0xFF64748B)
    val Slate900 = Color(0xFF0F172A)

    val CallGradient = Brush.verticalGradient(
        listOf(Color(0xFFE8EEF5), Color(0xFFF2F2F7), Color(0xFFFFFFFF)),
    )
    val BubbleMineGradient = Brush.linearGradient(
        listOf(Color(0xFF007AFF), Color(0xFF5856D6)),
    )
    val CenterBtnGradient = Brush.linearGradient(
        colors = listOf(Color(0xFF1A90FF), Color(0xFF007AFF), Color(0xFF0062CC)),
    )
    val KeyGradient = Brush.verticalGradient(
        listOf(Color(0xFFFFFFFF), Color(0xFFF7F8FB)),
    )
    val OrbBlue = Color(0x38007AFF)
    val OrbPurple = Color(0x2B5856D6)
}

fun formatTcallId(id: String): String {
    val d = id.filter { it.isDigit() }
    if (d.length != 9) return id
    return "${d.substring(0, 3)} ${d.substring(3, 6)} ${d.substring(6, 9)}"
}
