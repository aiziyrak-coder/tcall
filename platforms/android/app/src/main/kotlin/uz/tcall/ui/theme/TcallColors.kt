package uz.tcall.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/** Tcall — doim oq fon, kuchli kontrast, ko'k accent */
object TcallColors {
    val LogoCyan = Color(0xFF2563EB)
    val LogoBlue = Color(0xFF1D4ED8)
    val LogoPurple = Color(0xFF4F46E5)
    val LogoInk = Color(0xFF0F172A)

    val Salad = Color(0xFFFFFFFF)
    val SaladLight = Color(0xFFFFFFFF)
    val SaladSoft = Color(0xFFF8FAFC)
    val SaladMuted = Color(0xFFF1F5F9)

    val Accent = LogoBlue
    val AccentLight = Color(0xFF3B82F6)
    val AccentDeep = LogoBlue
    val AccentDark = Color(0xFF1E40AF)
    val AccentInk = LogoBlue
    val AccentBright = LogoCyan
    val Blue = LogoBlue
    val Purple = LogoPurple
    val Warm = Color(0xFFF8FAFC)

    val Canvas = Color(0xFFFFFFFF)
    val CanvasAlt = Color(0xFFF8FAFC)
    val Surface = Color(0xFFFFFFFF)
    val SurfaceGlass = Color(0xFFFFFFFF)
    val SurfaceHighlight = Color(0xFFF1F5F9)
    val SurfaceElevated = Color(0xFFF8FAFC)

    val BgPrimary = Color(0xFFFFFFFF)
    val BgElevated = Color(0xFFF8FAFC)
    val AuthBg = Color(0xFFFFFFFF)

    val Ink = Color(0xFF0F172A)
    val InkSoft = Color(0xFF334155)
    val Slate = Color(0xFF475569)
    val SlateLight = Color(0xFF64748B)
    val TextPrimary = Color(0xFF0F172A)
    val TextSecondary = Color(0xFF334155)
    val TextMuted = Color(0xFF64748B)
    val TextCaption = Color(0xFF94A3B8)
    val TextOnGradient = Color.White
    val TextOnAccent = Color.White

    val IconPrimary = Color(0xFF334155)
    val IconMuted = Color(0xFF94A3B8)
    val IconActive = LogoBlue

    val Slate900 = Ink
    val Slate700 = InkSoft
    val Slate500 = Slate
    val Slate400 = SlateLight

    val Separator = Color(0xFFE2E8F0)
    val BorderLight = Color(0xFFCBD5E1)
    val GlassHairline = Color(0xFFE2E8F0)
    val GlassRim = Color(0xFFCBD5E1)

    val IosBlue = LogoBlue
    val IosBlueLight = AccentLight
    val IosBlueDark = AccentDark
    val Brand600 = LogoBlue
    val BrandPurple = LogoPurple
    val BrandIndigo = AccentDark
    val CallGreen = Color(0xFF16A34A)
    val Destructive = Color(0xFFDC2626)

    val TabBarBg = Color(0xFFFFFFFF)
    val TabInactive = Slate

    val GlassBar = Color(0xFFFFFFFF)
    val GlassCard = Color(0xFFFFFFFF)
    val GlassSheet = Color(0xFFFFFFFF)

    val AccentSoft = Color(0x1A2563EB)
    val AccentMuted = Color(0x0D2563EB)
    val AccentBorderSoft = Color(0x662563EB)
    val AccentGlow = Color(0x142563EB)
    val WarmSoft = Color(0xFFF1F5F9)
    val WarmMuted = Color(0xFFE2E8F0)
    val WarmLight = Color(0xFFF8FAFC)

    val BubbleMine = Color(0xFFDBEAFE)
    val BubbleTheir = Color(0xFFFFFFFF)
    val BubbleMineBorder = Color(0xFF93C5FD)
    val BubbleTheirBorder = Color(0xFFE2E8F0)

    private fun flat(c: Color) = Brush.linearGradient(listOf(c, c))

    val MeshGradient = flat(Canvas)
    val AccentGradient = flat(LogoBlue)
    val AccentGradientVertical = flat(LogoBlue)
    val AccentGradientSoft = flat(CanvasAlt)
    val WarmAccentGradient = flat(CanvasAlt)
    val PremiumGradient = flat(CanvasAlt)
    val CanvasGradient = flat(Canvas)
    val CallBtnGradient = flat(LogoBlue)
    val BubbleMineGradient = flat(BubbleMine)
    val BubbleTheirGradient = flat(BubbleTheir)
    val CenterBtnGradient = flat(Color.White)
    val KeyGradient = flat(Color.White)
    val TitleGradient = flat(LogoBlue)

    val Flame = LogoBlue
    val FlameBright = AccentLight
    val FlameDeep = LogoBlue
    val FlameDark = AccentDark
    val Ember = Color(0xFFF1F5F9)
    val Ash = Ink

    val OrbBlue = Color(0x00000000)
    val OrbPurple = Color(0x00000000)
    val OrbTeal = Color(0x00000000)
    val OrbWarm = Color(0x00000000)

    val OnDark = TextOnAccent
    val CallGradient = flat(Canvas)

    @Deprecated("Use TextSecondary") val TextSecondaryAlpha = Color(0x99334155)
    @Deprecated("Use TextMuted") val TextTertiary = Slate
}

fun formatTcallId(id: String): String {
    val d = id.filter { it.isDigit() }
    if (d.length != 9) return id
    return "${d.substring(0, 3)} ${d.substring(3, 6)} ${d.substring(6, 9)}"
}
