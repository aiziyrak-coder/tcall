package uz.tcall.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/** Tcall flame brand — olov gradientlar, yorqin fon, to'q matn */
object TcallColors {
    val Flame = Color(0xFFFF6B35)
    val FlameBright = Color(0xFFFF8C42)
    val FlameDeep = Color(0xFFE85D04)
    val FlameDark = Color(0xFF9A3412)
    val Ember = Color(0xFFFFB347)
    val Ash = Color(0xFF2D1B14)
    val Ink = Color(0xFF1F140F)
    val InkSoft = Color(0xFF4A3428)
    val Slate = Color(0xFF6B5B52)
    val SlateLight = Color(0xFF8A7A70)

    val Accent = Flame
    val AccentLight = FlameBright
    val AccentDeep = FlameDeep
    val AccentDark = FlameDark
    val AccentInk = FlameDark
    val AccentBright = FlameBright
    val Blue = FlameBright
    val Purple = FlameDeep
    val Warm = Ember

    val Canvas = Color(0xFFFFF9F5)
    val CanvasAlt = Color(0xFFFFF0E8)
    val Surface = Color(0xFFFFFFFF)
    val SurfaceGlass = Color(0xF2FFFFFF)
    val SurfaceHighlight = Color(0xFFFFF0E8)
    val SurfaceElevated = Color(0xFFFFF8F4)

    val BgPrimary = Canvas
    val BgElevated = Surface
    val AuthBg = Color(0xFFFFF5EE)

    val TextPrimary = Ink
    val TextSecondary = InkSoft
    val TextMuted = Slate
    val TextCaption = SlateLight
    val TextOnGradient = Color(0xFFFFF8F2)
    val TextOnAccent = TextOnGradient

    val IconPrimary = InkSoft
    val IconMuted = Slate
    val IconActive = FlameDeep

    val Slate900 = Ink
    val Slate700 = InkSoft
    val Slate500 = Slate
    val Slate400 = SlateLight

    val Separator = Color(0x33FF6B35)
    val BorderLight = Color(0x55FF8C42)
    val GlassHairline = Color(0xAAFFFFFF)
    val GlassRim = Color(0x66FF8C42)

    val IosBlue = FlameDeep
    val IosBlueLight = Flame
    val IosBlueDark = FlameDark
    val Brand600 = FlameDeep
    val BrandPurple = FlameDeep
    val BrandIndigo = FlameDark
    val CallGreen = FlameDeep
    val Destructive = Color(0xFFE53935)

    val TabBarBg = Color(0xF5FFFFFF)
    val TabInactive = Slate

    val GlassBar = Color(0xDFFFFFFF)
    val GlassCard = Color(0xD9FFFFFF)
    val GlassSheet = Color(0xF8FFFFFF)

    val AccentSoft = Color(0x28FF6B35)
    val AccentMuted = Color(0x18FF6B35)
    val AccentBorderSoft = Color(0x55FF8C42)
    val AccentGlow = Color(0x40FF6B35)
    val WarmSoft = Color(0x33FFB347)
    val WarmMuted = Color(0x1AFFB347)
    val WarmLight = Color(0xFFFFF5EB)

    val MeshGradient = Brush.verticalGradient(listOf(Canvas, Color(0xFFFFF0E6), CanvasAlt))
    val AccentGradient = Brush.linearGradient(listOf(FlameBright, Flame, FlameDeep))
    val AccentGradientVertical = Brush.verticalGradient(listOf(FlameBright, FlameDeep))
    val AccentGradientSoft = Brush.linearGradient(listOf(AccentMuted, WarmMuted))
    val WarmAccentGradient = AccentGradient
    val PremiumGradient = Brush.linearGradient(listOf(WarmLight, Canvas))
    val CanvasGradient = MeshGradient
    val CallBtnGradient = Brush.linearGradient(listOf(FlameBright, Flame, FlameDeep))
    val BubbleMineGradient = Brush.linearGradient(listOf(FlameDark, FlameDeep, Color(0xFF7C2D12)))
    val BubbleTheirGradient = Brush.linearGradient(listOf(Color(0xFF5C3D2E), Color(0xFF4A3428), Color(0xFF3D2B20)))
    val CenterBtnGradient = Brush.linearGradient(listOf(Surface, SurfaceGlass))
    val KeyGradient = Brush.verticalGradient(listOf(Color.White, Color(0xFFFFF8F4)))
    val TitleGradient = Brush.linearGradient(listOf(FlameDeep, Flame))

    val OrbBlue = Color(0x30FF6B35)
    val OrbPurple = Color(0x28E85D04)
    val OrbTeal = Color(0x28FFB347)
    val OrbWarm = Color(0x35FFB347)

    val OnDark = TextOnGradient
    val CallGradient = MeshGradient

    @Deprecated("Use TextSecondary") val TextSecondaryAlpha = Color(0x994A3428)
    @Deprecated("Use TextMuted") val TextTertiary = Slate
}

fun formatTcallId(id: String): String {
    val d = id.filter { it.isDigit() }
    if (d.length != 9) return id
    return "${d.substring(0, 3)} ${d.substring(3, 6)} ${d.substring(6, 9)}"
}
