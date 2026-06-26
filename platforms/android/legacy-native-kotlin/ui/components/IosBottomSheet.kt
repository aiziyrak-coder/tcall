package uz.tcall.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.TcallMotion

private val ModalMaxHeightFraction = 0.88f

@Composable
fun ModalScrollColumn(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    val maxH = LocalConfiguration.current.screenHeightDp.dp * ModalMaxHeightFraction
    Column(
        modifier
            .fillMaxWidth()
            .heightIn(max = maxH)
            .verticalScroll(rememberScrollState()),
        content = content,
    )
}

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
                .background(Color.Black.copy(alpha = 0.4f))
                .clickable(onClick = onDismiss),
            contentAlignment = Alignment.BottomCenter,
        ) {
            AnimatedVisibility(
                visible = true,
                enter = fadeIn(TcallMotion.fadeTween) + slideInVertically(TcallMotion.slideTween) { it / 2 },
                exit = fadeOut(TcallMotion.fadeTween) + slideOutVertically(TcallMotion.slideTween) { it },
            ) {
                Column(
                    modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 12.dp)
                        .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp, bottomStart = 20.dp, bottomEnd = 20.dp))
                        .background(TcallColors.Canvas)
                        .border(1.dp, TcallColors.BorderLight, RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp, bottomStart = 20.dp, bottomEnd = 20.dp))
                        .clickable(enabled = false) {},
                ) {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .heightIn(max = LocalConfiguration.current.screenHeightDp.dp * 0.82f)
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
    val maxH = LocalConfiguration.current.screenHeightDp.dp * ModalMaxHeightFraction
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.45f))
                .clickable(onClick = onDismiss),
            contentAlignment = Alignment.Center,
        ) {
            AnimatedVisibility(
                visible = true,
                enter = fadeIn(tween(200)) + slideInVertically(tween(280)) { it / 4 },
                exit = fadeOut(tween(180)),
            ) {
                Column(
                    modifier
                        .fillMaxWidth(0.92f)
                        .heightIn(max = maxH)
                        .background(TcallColors.Canvas, RoundedCornerShape(24.dp))
                        .border(1.dp, TcallColors.BorderLight, RoundedCornerShape(24.dp))
                        .clickable(enabled = false) {}
                        .padding(22.dp),
                    content = content,
                )
            }
        }
    }
}
