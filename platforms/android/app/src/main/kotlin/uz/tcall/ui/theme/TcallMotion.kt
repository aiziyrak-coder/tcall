package uz.tcall.ui.theme

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.unit.IntOffset

object TcallMotion {
    val tabSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessMedium,
    )

    val pressSpring = spring<Float>(
        dampingRatio = 0.72f,
        stiffness = 520f,
    )

    val sheetSpring = spring<Float>(
        dampingRatio = 0.86f,
        stiffness = 420f,
    )

    val fadeTween = tween<Float>(durationMillis = 220)
    val slideTween = tween<IntOffset>(durationMillis = 280)
}

@Composable
fun Modifier.tabSelectionScale(selected: Boolean): Modifier {
    val scale by animateFloatAsState(
        targetValue = if (selected) 1.08f else 1f,
        animationSpec = TcallMotion.tabSpring,
        label = "tabScale",
    )
    return this.scale(scale)
}

@Composable
fun Modifier.pressScale(pressed: Boolean): Modifier {
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.94f else 1f,
        animationSpec = TcallMotion.pressSpring,
        label = "pressScale",
    )
    return this.scale(scale)
}
