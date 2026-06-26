package uz.tcall.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

enum class GlassLevel {
    Bar,
    Card,
    Sheet,
    Button,
    Input,
}

object TcallGlass {
    fun fill(level: GlassLevel): Color = when (level) {
        GlassLevel.Bar -> TcallColors.GlassBar
        GlassLevel.Card -> TcallColors.GlassCard
        GlassLevel.Sheet -> TcallColors.GlassSheet
        GlassLevel.Button -> Color.White.copy(alpha = 0.90f)
        GlassLevel.Input -> Color.White.copy(alpha = 0.84f)
    }

    val hairline = TcallColors.GlassHairline
    val specularBrush = Brush.verticalGradient(
        colors = listOf(
            Color.White.copy(alpha = 0.58f),
            TcallColors.Warm.copy(alpha = 0.12f),
            TcallColors.Accent.copy(alpha = 0.05f),
            Color.Transparent,
        ),
    )
    val rimBrush = Brush.linearGradient(
        listOf(
            TcallColors.Accent.copy(0.32f),
            TcallColors.Warm.copy(0.45f),
            TcallColors.Accent.copy(0.18f),
        ),
    )
}

@Composable
fun TcallGlassSurface(
    modifier: Modifier = Modifier,
    level: GlassLevel = GlassLevel.Card,
    shape: Shape = RoundedCornerShape(20.dp),
    elevation: Dp = 6.dp,
    accentGlow: Boolean = true,
    clipContent: Boolean = true,
    content: @Composable BoxScope.() -> Unit,
) {
    val fill = TcallGlass.fill(level)
    val base = modifier
        .shadow(
            elevation,
            shape,
            ambientColor = Color(0x1214201E),
            spotColor = if (accentGlow) TcallColors.Accent.copy(0.28f) else Color(0x10000000),
        )
        .then(if (clipContent) Modifier.clip(shape) else Modifier)
        .background(fill)
        .border(0.5.dp, TcallGlass.hairline, shape)
        .drawBehind {
            if (accentGlow) {
                drawCircle(
                    brush = Brush.radialGradient(
                        colors = listOf(TcallColors.AccentGlow, Color.Transparent),
                        center = Offset(size.width * 0.85f, size.height * 0.1f),
                        radius = size.maxDimension * 0.55f,
                    ),
                    radius = size.maxDimension * 0.55f,
                    center = Offset(size.width * 0.85f, size.height * 0.05f),
                )
            }
        }

    Box(base) {
        Box(Modifier.matchParentSize().background(TcallGlass.specularBrush))
        content()
    }
}

@Composable
fun TcallGlassBar(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    TcallGlassSurface(
        modifier = modifier.fillMaxWidth(),
        level = GlassLevel.Bar,
        shape = RoundedCornerShape(0.dp),
        elevation = 2.dp,
        accentGlow = false,
        content = content,
    )
}
