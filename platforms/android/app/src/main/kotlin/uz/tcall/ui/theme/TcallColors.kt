package uz.tcall.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/** Tcall — salat yashil fon + logo ko'k/cyan, gradient yo'q, liquid glass */
object TcallColors {
    // Logo ranglari
    val LogoCyan = Color(0xFF3BB4E8)
    val LogoBlue = Color(0xFF4A7FE8)
    val LogoPurple = Color(0xFF6B63E8)
    val LogoInk = Color(0xFF1E2A3A)

    // Salat / mint
    val Salad = Color(0xFFB8E8D4)
    val SaladLight = Color(0xFFE8F7F0)
    val SaladSoft = Color(0xFFD4F4E2)
    val SaladMuted = Color(0xFFC5EBD8)

    val Accent = LogoCyan
    val AccentLight = Color(0xFF6EC8F0)
    val AccentDeep = LogoBlue
    val AccentDark = Color(0xFF3A6AD4)
    val AccentInk = LogoBlue
    val AccentBright = LogoCyan
    val Blue = LogoCyan
    val Purple = LogoPurple
    val Warm = Salad

    val Canvas = Color(0xFFF0FAF5)
    val CanvasAlt = Color(0xFFE8F7F0)
    val Surface = Color(0xF5FFFFFF)
    val SurfaceGlass = Color(0xD9F5FBF8)
    val SurfaceHighlight = Color(0xFFE8F7F0)
    val SurfaceElevated = Color(0xFFF4FBF7)

    val BgPrimary = Canvas
    val BgElevated = SurfaceElevated
    val AuthBg = SaladLight

    val Ink = LogoInk
    val InkSoft = Color(0xFF3D4F63)
    val Slate = Color(0xFF5C6B7A)
    val SlateLight = Color(0xFF8A97A6)
    val TextPrimary = Ink
    val TextSecondary = InkSoft
    val TextMuted = Slate
    val TextCaption = SlateLight
    val TextOnGradient = Color.White
    val TextOnAccent = Color.White

    val IconPrimary = InkSoft
    val IconMuted = Slate
    val IconActive = LogoBlue

    val Slate900 = Ink
    val Slate700 = InkSoft
    val Slate500 = Slate
    val Slate400 = SlateLight

    val Separator = Color(0x333BB4E8)
    val BorderLight = Color(0x55B8E8D4)
    val GlassHairline = Color(0xCCFFFFFF)
    val GlassRim = Color(0x66B8E8D4)

    val IosBlue = LogoBlue
    val IosBlueLight = LogoCyan
    val IosBlueDark = AccentDark
    val Brand600 = LogoBlue
    val BrandPurple = LogoPurple
    val BrandIndigo = AccentDark
    val CallGreen = Color(0xFF34C759)
    val Destructive = Color(0xFFE53935)

    val TabBarBg = Color(0xE8F5FBF8)
    val TabInactive = Slate

    val GlassBar = Color(0xD9F0FAF6)
    val GlassCard = Color(0xD9FFFFFF)
    val GlassSheet = Color(0xF0FFFFFF)

    val AccentSoft = Color(0x283BB4E8)
    val AccentMuted = Color(0x18B8E8D4)
    val AccentBorderSoft = Color(0x553BB4E8)
    val AccentGlow = Color(0x283BB4E8)
    val WarmSoft = Color(0x33B8E8D4)
    val WarmMuted = Color(0x1AB8E8D4)
    val WarmLight = SaladLight

    // Chat — shaffof liquid glass, to'q matn
    val BubbleMine = Color(0xD9C8EDF8)
    val BubbleTheir = Color(0xE6FFFFFF)
    val BubbleMineBorder = Color(0x663BB4E8)
    val BubbleTheirBorder = Color(0x55B8E8D4)

    // Eski nomlar — barchasi tekis rang (gradient emas)
    private fun flat(c: Color) = Brush.linearGradient(listOf(c, c))

    val MeshGradient = flat(Canvas)
    val AccentGradient = flat(LogoBlue)
    val AccentGradientVertical = flat(LogoBlue)
    val AccentGradientSoft = flat(SaladSoft)
    val WarmAccentGradient = flat(SaladSoft)
    val PremiumGradient = flat(SaladLight)
    val CanvasGradient = flat(Canvas)
    val CallBtnGradient = flat(LogoBlue)
    val BubbleMineGradient = flat(BubbleMine)
    val BubbleTheirGradient = flat(BubbleTheir)
    val CenterBtnGradient = flat(Color.White)
    val KeyGradient = flat(Color.White)
    val TitleGradient = flat(LogoBlue)

    val Flame = LogoCyan
    val FlameBright = LogoCyan
    val FlameDeep = LogoBlue
    val FlameDark = AccentDark
    val Ember = Salad
    val Ash = Ink

    val OrbBlue = Color(0x00000000)
    val OrbPurple = Color(0x00000000)
    val OrbTeal = Color(0x00000000)
    val OrbWarm = Color(0x00000000)

    val OnDark = TextOnAccent
    val CallGradient = flat(Canvas)

    @Deprecated("Use TextSecondary") val TextSecondaryAlpha = Color(0x993D4F63)
    @Deprecated("Use TextMuted") val TextTertiary = Slate
}

fun formatTcallId(id: String): String {
    val d = id.filter { it.isDigit() }
    if (d.length != 9) return id
    return "${d.substring(0, 3)} ${d.substring(3, 6)} ${d.substring(6, 9)}"
}
