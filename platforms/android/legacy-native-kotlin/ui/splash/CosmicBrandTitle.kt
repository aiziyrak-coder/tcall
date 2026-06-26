package uz.tcall.ui.splash

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun CosmicBrandTitle(
    modifier: Modifier = Modifier,
    compact: Boolean = false,
    animate: Boolean = true,
) {
    val transition = rememberInfiniteTransition(label = "brandFloat")
    val floatY by transition.animateFloat(
        initialValue = 0f,
        targetValue = if (animate) -5f else 0f,
        animationSpec = infiniteRepeatable(tween(2200), RepeatMode.Reverse),
        label = "floatY",
    )
    val glow by transition.animateFloat(
        initialValue = 0.94f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1800), RepeatMode.Reverse),
        label = "glow",
    )

    Column(
        modifier = modifier.graphicsLayer {
            translationY = floatY
            scaleX = glow
            scaleY = glow
        },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "TCall",
            fontSize = if (compact) 38.sp else 54.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 3.sp,
            style = TextStyle(
                brush = Brush.linearGradient(
                    listOf(
                        Color(0xFFFFE8D6),
                        Color(0xFFFFB347),
                        Color(0xFFFF6B35),
                    ),
                ),
            ),
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(if (compact) 6.dp else 10.dp))
        Text(
            text = "Translate Calling System",
            fontSize = if (compact) 11.sp else 13.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xB3C4B5FF),
            letterSpacing = 0.4.sp,
            textAlign = TextAlign.Center,
            lineHeight = 16.sp,
        )
    }
}
