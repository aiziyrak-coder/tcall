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
import androidx.compose.ui.draw.shadow
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
        GlassLevel.Button -> Color.White.copy(alpha = 0.88f)
        GlassLevel.Input -> Color.White.copy(alpha = 0.82f)
    }

    val hairline = TcallColors.GlassHairline
    val specularBrush = Brush.verticalGradient(
        colors = listOf(
            Color.White.copy(alpha = 0.52f),
            Color.White.copy(alpha = 0.12f),
            Color.Transparent,
        ),
    )
}

@Composable
fun TcallGlassSurface(
    modifier: Modifier = Modifier,
    level: GlassLevel = GlassLevel.Card,
    shape: Shape = RoundedCornerShape(20.dp),
    elevation: Dp = 6.dp,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier
            .shadow(
                elevation,
                shape,
                ambientColor = Color(0x141C1C1E),
                spotColor = Color(0x18007AFF),
            )
            .clip(shape)
            .background(TcallGlass.fill(level))
            .border(0.5.dp, TcallGlass.hairline, shape),
    ) {
        Box(
            Modifier
                .matchParentSize()
                .background(TcallGlass.specularBrush),
        )
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
        content = content,
    )
}
