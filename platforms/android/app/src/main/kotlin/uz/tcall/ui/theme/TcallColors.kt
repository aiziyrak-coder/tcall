package uz.tcall.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

object TcallColors {
    val BgPrimary = Color(0xFFF2F2F7)
    val BgElevated = Color(0xFFFFFFFF)
    val AuthBg = Color(0xFFE8ECF6)

    /** Opaque dark labels — always readable on light glass surfaces. */
    val TextPrimary = Color(0xFF1C1C1E)
    val TextSecondary = Color(0xFF3A3A3C)
    val TextMuted = Color(0xFF48484A)
    val TextCaption = Color(0xFF636366)

    val Slate900 = TextPrimary
    val Slate700 = TextSecondary
    val Slate500 = TextSecondary
    val Slate400 = TextMuted

    val Separator = Color(0xFFC6C6C8)
    val BorderLight = Color(0x1F1C1C1E)

    val IosBlue = Color(0xFF007AFF)
    val IosBlueLight = Color(0xFF1A90FF)
    val IosBlueDark = Color(0xFF0062CC)
    val BrandPurple = Color(0xFF5856D6)
    val BrandIndigo = Color(0xFF4F46E5)
    val Brand600 = Color(0xFF4F46E5)
    val CallGreen = Color(0xFF34C759)
    val Destructive = Color(0xFFFF3B30)

    val TabBarBg = Color(0xD9F5F7FC)
    val TabInactive = TextMuted

    val GlassBar = Color(0xC7FFFFFF)
    val GlassCard = Color(0xADFFFFFF)
    val GlassSheet = Color(0xF0FFFFFF)
    val GlassHairline = Color(0x261C1C1E)

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
        listOf(Color(0xF5FFFFFF), Color(0xFFF7F8FB)),
    )
    val OrbBlue = Color(0x28007AFF)
    val OrbPurple = Color(0x205856D6)

    @Deprecated("Use TextSecondary", ReplaceWith("TextSecondary"))
    val TextSecondaryAlpha = Color(0x993C3C43)

    @Deprecated("Use TextMuted", ReplaceWith("TextMuted"))
    val TextTertiary = TextMuted
}

fun formatTcallId(id: String): String {
    val d = id.filter { it.isDigit() }
    if (d.length != 9) return id
    return "${d.substring(0, 3)} ${d.substring(3, 6)} ${d.substring(6, 9)}"
}
