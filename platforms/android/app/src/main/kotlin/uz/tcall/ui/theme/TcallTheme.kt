package uz.tcall.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary = TcallColors.IosBlue,
    onPrimary = Color.White,
    secondary = TcallColors.BrandPurple,
    onSecondary = Color.White,
    background = TcallColors.BgPrimary,
    onBackground = TcallColors.TextPrimary,
    surface = TcallColors.BgElevated,
    onSurface = TcallColors.TextPrimary,
    surfaceVariant = TcallColors.BgPrimary,
    onSurfaceVariant = TcallColors.TextSecondary,
    error = TcallColors.Destructive,
    outline = TcallColors.Separator,
)

private val TcallTypography = Typography(
    headlineLarge = TextStyle(
        fontSize = 28.sp,
        fontWeight = FontWeight.Bold,
        color = TcallColors.TextPrimary,
        letterSpacing = (-0.4).sp,
    ),
    headlineSmall = TextStyle(
        fontSize = 22.sp,
        fontWeight = FontWeight.Bold,
        color = TcallColors.TextPrimary,
        letterSpacing = (-0.3).sp,
    ),
    titleMedium = TextStyle(
        fontSize = 17.sp,
        fontWeight = FontWeight.SemiBold,
        color = TcallColors.TextPrimary,
    ),
    bodyLarge = TextStyle(
        fontSize = 16.sp,
        fontWeight = FontWeight.Normal,
        color = TcallColors.TextPrimary,
    ),
    bodyMedium = TextStyle(
        fontSize = 15.sp,
        fontWeight = FontWeight.Normal,
        color = TcallColors.TextPrimary,
    ),
    bodySmall = TextStyle(
        fontSize = 13.sp,
        fontWeight = FontWeight.Medium,
        color = TcallColors.TextSecondary,
    ),
    labelMedium = TextStyle(
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold,
        color = TcallColors.TextSecondary,
    ),
    labelSmall = TextStyle(
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        color = TcallColors.TextMuted,
    ),
)

@Composable
fun TcallTheme(content: @Composable () -> Unit) {
    val colorScheme = LightColors
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = TcallColors.BgPrimary.toArgb()
            window.navigationBarColor = TcallColors.TabBarBg.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = true
                isAppearanceLightNavigationBars = true
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = TcallTypography,
        content = content,
    )
}
