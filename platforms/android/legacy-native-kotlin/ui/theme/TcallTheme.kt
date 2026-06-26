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
    primary = TcallColors.AccentInk,
    onPrimary = Color.White,
    secondary = TcallColors.Warm,
    onSecondary = TcallColors.Ink,
    background = TcallColors.Canvas,
    onBackground = TcallColors.Ink,
    surface = TcallColors.Surface,
    onSurface = TcallColors.Ink,
    surfaceVariant = TcallColors.CanvasAlt,
    onSurfaceVariant = TcallColors.InkSoft,
    outline = TcallColors.BorderLight,
    error = TcallColors.Destructive,
)

private val TcallTypography = Typography(
    headlineLarge = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.Bold, color = TcallColors.Ink),
    headlineSmall = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TcallColors.Ink),
    titleMedium = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = TcallColors.Ink),
    bodyLarge = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Medium, color = TcallColors.Ink),
    bodyMedium = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Medium, color = TcallColors.Ink),
    bodySmall = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TcallColors.InkSoft),
    labelMedium = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TcallColors.Slate),
    labelSmall = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TcallColors.Slate),
)

@Composable
fun TcallTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val activity = view.context.findActivity() ?: return@SideEffect
            val window = activity.window
            window.statusBarColor = TcallColors.Canvas.toArgb()
            window.navigationBarColor = TcallColors.Canvas.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = true
                isAppearanceLightNavigationBars = true
            }
        }
    }
    MaterialTheme(colorScheme = LightColors, typography = TcallTypography, content = content)
}

private tailrec fun android.content.Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is android.content.ContextWrapper -> baseContext.findActivity()
    else -> null
}
