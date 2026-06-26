package uz.tcall.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

object TcallColors {
    /** Brand palette */
    val Warm = Color(0xFFFFE4B5)
    val Accent = Color(0xFF40E0D0)
    val Slate = Color(0xFF708090)

    val WarmLight = Color(0xFFFFF3E0)
    val WarmSoft = Color(0x40FFE4B5)
    val WarmMuted = Color(0x1AFFE4B5)

    val AccentLight = Color(0xFF66E9DF)
    val AccentDark = Color(0xFF35C9BB)
    val AccentDeep = Color(0xFF2AB5A8)
    val AccentGlow = Color(0x4040E0D0)
    val AccentSoft = Color(0x2640E0D0)
    val AccentMuted = Color(0x1A40E0D0)
    val AccentBorderSoft = Color(0x4040E0D0)

    val BgPrimary = Color(0xFFFFFBF6)
    val BgElevated = Color(0xFFFFFFFF)
    val AuthBg = Color(0xFFFFF5E8)

    val TextPrimary = Color(0xFF3E4A56)
    val TextSecondary = Slate
    val TextMuted = Color(0xFF8A95A3)
    val TextCaption = Slate

    val Slate900 = TextPrimary
    val Slate700 = Slate
    val Slate500 = Slate
    val Slate400 = TextMuted

    val Separator = Color(0x4D708090)
    val BorderLight = Color(0x33708090)

    /** Legacy aliases */
    val IosBlue = Accent
    val IosBlueLight = AccentLight
    val IosBlueDark = AccentDark
    val BrandPurple = AccentDeep
    val BrandIndigo = AccentDeep
    val Brand600 = AccentDark

    val CallGreen = AccentDark
    val Destructive = Color(0xFFFF3B30)

    val TabBarBg = Color(0xE8FFFBF6)
    val TabInactive = Slate

    val GlassBar = Color(0xD9FFFFFF)
    val GlassCard = Color(0xB8FFFFFF)
    val GlassSheet = Color(0xEEFFFFFF)
    val GlassHairline = Color(0x3340E0D0)
    val GlassRim = Color(0x55FFE4B5)

    val AccentGradient = Brush.linearGradient(listOf(AccentLight, Accent, AccentDark))
    val AccentGradientVertical = Brush.verticalGradient(listOf(AccentLight, Accent, AccentDeep))
    val AccentGradientSoft = Brush.linearGradient(
        listOf(Warm.copy(0.35f), Accent.copy(0.12f)),
    )
    val WarmAccentGradient = Brush.linearGradient(listOf(Warm, Accent))
    val PremiumGradient = Brush.linearGradient(listOf(WarmLight, Accent.copy(0.18f), BgPrimary))

    val CallGradient = Brush.verticalGradient(
        listOf(WarmLight, BgPrimary, Color.White),
    )
    val BubbleMineGradient = Brush.linearGradient(
        listOf(AccentLight, Accent, AccentDeep),
    )
    val CenterBtnGradient = Brush.linearGradient(
        colors = listOf(AccentLight, Accent, AccentDark),
    )
    val KeyGradient = Brush.verticalGradient(
        listOf(Color(0xF8FFFFFF), WarmLight),
    )
    val OrbPrimary = Color(0x3840E0D0)
    val OrbSecondary = Color(0x38FFE4B5)
    val OrbBlue = OrbPrimary
    val OrbPurple = OrbSecondary

    @Deprecated("Use TextSecondary", ReplaceWith("TextSecondary"))
    val TextSecondaryAlpha = Color(0x99708090)

    @Deprecated("Use TextMuted", ReplaceWith("TextMuted"))
    val TextTertiary = TextMuted
}

fun formatTcallId(id: String): String {
    val d = id.filter { it.isDigit() }
    if (d.length != 9) return id
    return "${d.substring(0, 3)} ${d.substring(3, 6)} ${d.substring(6, 9)}"
}
