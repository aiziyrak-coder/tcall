package uz.tcall.ui.splash

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import kotlin.math.sin
import kotlin.random.Random

private data class Star(
    val x: Float,
    val y: Float,
    val radius: Float,
    val alpha: Float,
    val speed: Float,
    val warm: Boolean,
    val phase: Float,
)

@Composable
fun CosmicStarfield(modifier: Modifier = Modifier) {
    val stars = remember {
        List(90) {
            Star(
                x = Random.nextFloat(),
                y = Random.nextFloat(),
                radius = Random.nextFloat() * 2.2f + 0.4f,
                alpha = Random.nextFloat() * 0.55f + 0.25f,
                speed = Random.nextFloat() * 0.35f + 0.08f,
                warm = Random.nextFloat() > 0.72f,
                phase = Random.nextFloat() * 6.28f,
            )
        }
    }

    val transition = rememberInfiniteTransition(label = "stars")
    val drift by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(18000, easing = LinearEasing), RepeatMode.Restart),
        label = "drift",
    )
    val twinkle by transition.animateFloat(
        initialValue = 0f,
        targetValue = 6.28f,
        animationSpec = infiniteRepeatable(tween(4200, easing = LinearEasing), RepeatMode.Restart),
        label = "twinkle",
    )

    Canvas(modifier.fillMaxSize()) {
        drawRect(
            Brush.verticalGradient(
                listOf(
                    Color(0xFF0A0612),
                    Color(0xFF150A22),
                    Color(0xFF1A0F2E),
                    Color(0xFF0D0818),
                ),
            ),
        )

        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    Color(0x28FF6B35),
                    Color(0x12E85D04),
                    Color.Transparent,
                ),
                center = Offset(size.width * 0.5f, size.height * 0.42f),
                radius = size.minDimension * 0.55f,
            ),
            radius = size.minDimension * 0.55f,
            center = Offset(size.width * 0.5f, size.height * 0.42f),
        )

        stars.forEach { star ->
            val yShift = ((star.y + drift * star.speed) % 1.2f) - 0.1f
            val xWobble = sin(twinkle + star.phase) * 0.008f
            val flicker = 0.65f + 0.35f * sin(twinkle * 1.4f + star.phase).toFloat()
            val color = if (star.warm) Color(0xFFFFB347) else Color(0xFFE8E0FF)
            drawCircle(
                color = color.copy(alpha = star.alpha * flicker),
                radius = star.radius,
                center = Offset(
                    (star.x + xWobble) * size.width,
                    yShift * size.height,
                ),
            )
        }
    }
}
