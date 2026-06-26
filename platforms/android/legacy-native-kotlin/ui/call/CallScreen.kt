package uz.tcall.ui.call

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import uz.tcall.ui.components.TcallAvatar
import uz.tcall.ui.theme.GlassLevel
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.TcallGlassSurface
import uz.tcall.ui.theme.formatTcallId
import uz.tcall.webrtc.WebRtcCallManager

@Composable
fun CallScreen(
    roomId: String,
    peerName: String,
    callManager: WebRtcCallManager,
    onEnd: () -> Unit,
) {
    val state by callManager.callState.collectAsState()
    val muted by callManager.muted.collectAsState()
    var elapsed by remember { mutableLongStateOf(0L) }

    LaunchedEffect(state) {
        while (state == WebRtcCallManager.CallState.CONNECTED) {
            elapsed = callManager.callDurationMs()
            delay(1000)
        }
    }

    val timerText = remember(elapsed) {
        val sec = (elapsed / 1000).toInt()
        "%02d:%02d".format(sec / 60, sec % 60)
    }

    Box(Modifier.fillMaxSize().background(TcallColors.CallGradient)) {
        Column(
            Modifier.fillMaxSize().padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            TcallGlassSurface(
                modifier = Modifier.size(120.dp),
                level = GlassLevel.Sheet,
                shape = CircleShape,
                elevation = 8.dp,
            ) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    TcallAvatar(name = peerName, size = 96.dp)
                }
            }
            Spacer(Modifier.height(24.dp))
            Text(peerName, fontSize = 26.sp, fontWeight = FontWeight.Bold, color = TcallColors.TextPrimary)
            Text(
                formatTcallId(roomId.filter { it.isDigit() }.ifBlank { roomId }),
                fontSize = 14.sp,
                color = TcallColors.TextSecondary,
                modifier = Modifier.padding(top = 6.dp),
            )
            Spacer(Modifier.height(12.dp))
            val statusColor = when (state) {
                WebRtcCallManager.CallState.CONNECTED -> TcallColors.CallGreen
                WebRtcCallManager.CallState.FAILED -> TcallColors.Destructive
                else -> TcallColors.TextSecondary
            }
            Text(
                when (state) {
                    WebRtcCallManager.CallState.CONNECTING -> "Ulanmoqda..."
                    WebRtcCallManager.CallState.CONNECTED -> timerText
                    WebRtcCallManager.CallState.FAILED -> "Ulanish xatosi"
                    WebRtcCallManager.CallState.ENDED -> "Tugadi"
                    else -> "Kutilmoqda"
                },
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = statusColor,
            )
            if (state == WebRtcCallManager.CallState.CONNECTING) {
                CircularProgressIndicator(Modifier.padding(top = 16.dp), color = TcallColors.IosBlue)
            }
        }

        Row(
            Modifier.align(Alignment.BottomCenter).padding(bottom = 48.dp),
            horizontalArrangement = Arrangement.spacedBy(28.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(60.dp)
                    .shadow(6.dp, CircleShape)
                    .clip(CircleShape)
                    .background(if (muted) TcallColors.Destructive.copy(0.15f) else TcallColors.GlassSheet),
                contentAlignment = Alignment.Center,
            ) {
                IconButton(onClick = { callManager.toggleMute() }, modifier = Modifier.size(60.dp)) {
                    Icon(
                        if (muted) Icons.Default.MicOff else Icons.Default.Mic,
                        null,
                        tint = if (muted) TcallColors.Destructive else TcallColors.TextPrimary,
                        modifier = Modifier.size(26.dp),
                    )
                }
            }
            Box(
                Modifier
                    .size(72.dp)
                    .shadow(8.dp, CircleShape)
                    .clip(CircleShape)
                    .background(TcallColors.Destructive),
                contentAlignment = Alignment.Center,
            ) {
                IconButton(onClick = onEnd, modifier = Modifier.size(72.dp)) {
                    Icon(Icons.Default.CallEnd, contentDescription = "Tugatish", tint = Color.White, modifier = Modifier.size(32.dp))
                }
            }
        }
    }
}

@Composable
fun OutgoingCallOverlay(peerName: String, onCancel: () -> Unit) {
    Box(Modifier.fillMaxSize().background(TcallColors.CallGradient), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            TcallAvatar(peerName, size = 96.dp)
            Spacer(Modifier.height(16.dp))
            Text(peerName, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TcallColors.TextPrimary)
            Text("Qo'ng'iroq...", color = TcallColors.TextSecondary, modifier = Modifier.padding(top = 8.dp))
            Spacer(Modifier.height(24.dp))
            CircularProgressIndicator(color = TcallColors.IosBlue)
            Spacer(Modifier.height(32.dp))
            Box(
                Modifier.size(64.dp).clip(CircleShape).background(TcallColors.Destructive),
                contentAlignment = Alignment.Center,
            ) {
                IconButton(onClick = onCancel, modifier = Modifier.size(64.dp)) {
                    Icon(Icons.Default.CallEnd, null, tint = Color.White, modifier = Modifier.size(28.dp))
                }
            }
        }
    }
}
