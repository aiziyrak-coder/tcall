package uz.tcall.ui.theme

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.ui.unit.IntOffset

object TcallMotion {
    val tabSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioLowBouncy,
        stiffness = Spring.StiffnessMediumLow,
    )

    val sheetSpring = spring<Float>(
        dampingRatio = 0.86f,
        stiffness = 420f,
    )

    val fadeTween = tween<Float>(durationMillis = 220)
    val slideTween = tween<IntOffset>(durationMillis = 280)
}
