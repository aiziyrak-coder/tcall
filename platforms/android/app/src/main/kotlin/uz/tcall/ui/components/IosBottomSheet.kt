package uz.tcall.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import uz.tcall.ui.theme.GlassLevel
import uz.tcall.ui.theme.TcallGlassSurface
import uz.tcall.ui.theme.TcallMotion

@Composable
fun IosBottomSheet(
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.32f))
                .clickable(onClick = onDismiss),
            contentAlignment = Alignment.BottomCenter,
        ) {
            AnimatedVisibility(
                visible = true,
                enter = fadeIn(TcallMotion.fadeTween) + slideInVertically(TcallMotion.slideTween) { it / 2 },
                exit = fadeOut(TcallMotion.fadeTween) + slideOutVertically(TcallMotion.slideTween) { it },
            ) {
                TcallGlassSurface(
                    modifier = modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 12.dp)
                        .clickable(enabled = false) {},
                    level = GlassLevel.Sheet,
                    shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp, bottomStart = 20.dp, bottomEnd = 20.dp),
                    elevation = 16.dp,
                ) {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 22.dp),
                        content = content,
                    )
                }
            }
        }
    }
}

@Composable
fun IosCenterModal(
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.32f))
                .clickable(onClick = onDismiss),
            contentAlignment = Alignment.Center,
        ) {
            AnimatedVisibility(
                visible = true,
                enter = fadeIn(tween(200)) + slideInVertically(tween(280)) { it / 4 },
                exit = fadeOut(tween(180)),
            ) {
                TcallGlassSurface(
                    modifier = modifier
                        .fillMaxWidth(0.92f)
                        .clickable(enabled = false) {},
                    level = GlassLevel.Sheet,
                    shape = RoundedCornerShape(24.dp),
                    elevation = 16.dp,
                ) {
                    Column(Modifier.fillMaxWidth().padding(22.dp), content = content)
                }
            }
        }
    }
}
