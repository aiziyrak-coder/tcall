package uz.vizara.tcall.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val BrandBlue = Color(0xFF007AFF)
private val BrandPurple = Color(0xFF5856D6)
private val BgLight = Color(0xFFF2F2F7)

private val LightColors = lightColorScheme(
    primary = BrandBlue,
    secondary = BrandPurple,
    background = BgLight,
    surface = Color.White,
)

private val DarkColors = darkColorScheme(
    primary = BrandBlue,
    secondary = BrandPurple,
)

@Composable
fun TcallTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        content = content,
    )
}
