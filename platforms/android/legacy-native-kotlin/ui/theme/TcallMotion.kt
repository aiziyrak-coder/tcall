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
    val spring = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessMediumLow,
    )
    val tabSpring = spring
    val pressSpring = spring<Float>(dampingRatio = 0.68f, stiffness = 480f)
    val fadeTween = tween<Float>(durationMillis = 320)
    val slideTween = tween<IntOffset>(durationMillis = 380)
}

@Composable
fun Modifier.tcallPressScale(pressed: Boolean): Modifier {
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.94f else 1f,
        animationSpec = TcallMotion.pressSpring,
        label = "pressScale",
    )
    return scale(scale)
}

@Composable
fun Modifier.tcallTabScale(selected: Boolean): Modifier {
    val scale by animateFloatAsState(
        targetValue = if (selected) 1.06f else 1f,
        animationSpec = TcallMotion.spring,
        label = "tabScale",
    )
    return scale(scale)
}

// Legacy aliases
val tabSpring get() = TcallMotion.spring
val pressSpring get() = TcallMotion.pressSpring
val fadeTween get() = TcallMotion.fadeTween
val slideTween get() = TcallMotion.slideTween

@Composable
fun Modifier.tabSelectionScale(selected: Boolean) = tcallTabScale(selected)

@Composable
fun Modifier.pressScale(pressed: Boolean) = tcallPressScale(pressed)
