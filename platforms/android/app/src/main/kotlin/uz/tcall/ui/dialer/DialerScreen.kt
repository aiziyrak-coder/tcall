package uz.tcall.ui.dialer

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Backspace
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Message
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.formatTcallId

private data class DialKey(val digit: String, val letters: String = "")

private val keyRows = listOf(
    listOf(DialKey("1"), DialKey("2", "ABC"), DialKey("3", "DEF")),
    listOf(DialKey("4", "GHI"), DialKey("5", "JKL"), DialKey("6", "MNO")),
    listOf(DialKey("7", "PQRS"), DialKey("8", "TUV"), DialKey("9", "WXYZ")),
    listOf(DialKey(""), DialKey("0", "+"), DialKey("del")),
)

@Composable
fun DialerScreen(
    viewModel: DialerViewModel,
    onCall: (String) -> Unit,
    onMessage: (String) -> Unit,
) {
    val state by viewModel.state.collectAsState()

    Column(
        Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(
            Modifier.fillMaxWidth().padding(vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = if (state.digits.isBlank()) "— — —" else formatTcallId(state.digits),
                fontSize = 34.sp,
                fontWeight = FontWeight.Light,
                letterSpacing = 3.sp,
                fontFamily = FontFamily.Monospace,
                color = TcallColors.Slate900,
            )
            state.error?.let {
                Text(it, color = TcallColors.Destructive, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
            }
        }

        keyRows.forEach { row ->
            Row(
                Modifier.fillMaxWidth().padding(vertical = 3.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                row.forEach { key ->
                    when (key.digit) {
                        "" -> Spacer(Modifier.weight(1f).aspectRatio(1f))
                        "del" -> Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                            Box(
                                Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .clickable(
                                        interactionSource = remember { MutableInteractionSource() },
                                        indication = null,
                                        onClick = viewModel::backspace,
                                    ),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    Icons.AutoMirrored.Filled.Backspace,
                                    contentDescription = "O'chirish",
                                    tint = TcallColors.Slate500,
                                )
                            }
                        }
                        else -> IosDialKey(
                            digit = key.digit,
                            letters = key.letters,
                            onClick = { viewModel.append(key.digit) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(64.dp)
                    .shadow(8.dp, CircleShape, spotColor = TcallColors.CallGreen.copy(alpha = 0.4f))
                    .clip(CircleShape)
                    .background(TcallColors.CallGreen)
                    .clickable(
                        enabled = !state.loading && state.digits.length == 9,
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = { viewModel.dial(onCall) },
                    ),
                contentAlignment = Alignment.Center,
            ) {
                if (state.loading) {
                    CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp, color = Color.White)
                } else {
                    Icon(Icons.Default.Call, contentDescription = "Qo'ng'iroq", tint = Color.White, modifier = Modifier.size(28.dp))
                }
            }

            Box(
                Modifier
                    .size(52.dp)
                    .clip(CircleShape)
                    .background(Color.White)
                    .border(1.dp, TcallColors.BorderLight, CircleShape)
                    .clickable(
                        enabled = !state.loading && state.digits.length == 9,
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = { viewModel.openChat(onMessage) },
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.Message, contentDescription = "Xabar", tint = TcallColors.IosBlue, modifier = Modifier.size(24.dp))
            }
        }
    }
}

@Composable
private fun IosDialKey(
    digit: String,
    letters: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier
            .aspectRatio(1f)
            .padding(4.dp)
            .shadow(2.dp, CircleShape)
            .clip(CircleShape)
            .background(TcallColors.KeyGradient)
            .border(1.dp, Color.Black.copy(alpha = 0.045f), CircleShape)
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(digit, fontSize = 28.sp, fontWeight = FontWeight.Light, color = TcallColors.Slate900)
            if (letters.isNotBlank()) {
                Text(letters, fontSize = 9.sp, fontWeight = FontWeight.Medium, color = TcallColors.Slate500, letterSpacing = 1.sp)
            }
        }
    }
}
