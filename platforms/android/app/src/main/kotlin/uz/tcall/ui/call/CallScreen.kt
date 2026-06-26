package uz.tcall.ui.call

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.components.TcallAvatar
import uz.tcall.ui.theme.TcallColors
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

    Box(
        Modifier
            .fillMaxSize()
            .background(TcallColors.CallGradient),
    ) {
        Column(
            Modifier.fillMaxSize().padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(
                Modifier
                    .size(120.dp)
                    .shadow(12.dp, CircleShape, spotColor = TcallColors.CallGreen.copy(alpha = 0.3f))
                    .clip(CircleShape)
                    .background(Color.White),
                contentAlignment = Alignment.Center,
            ) {
                TcallAvatar(name = peerName, size = 100.dp)
            }

            Spacer(Modifier.height(24.dp))

            Text(peerName, fontSize = 26.sp, fontWeight = FontWeight.SemiBold, color = TcallColors.Slate900)
            Text(
                formatTcallId(roomId.filter { it.isDigit() }.ifBlank { roomId }),
                fontSize = 14.sp,
                color = TcallColors.Slate500,
                modifier = Modifier.padding(top = 6.dp),
            )

            Spacer(Modifier.height(16.dp))

            val statusColor = when (state) {
                WebRtcCallManager.CallState.CONNECTED -> TcallColors.CallGreen
                else -> TcallColors.Slate500
            }
            Text(
                when (state) {
                    WebRtcCallManager.CallState.CONNECTING -> "Ulanmoqda..."
                    WebRtcCallManager.CallState.CONNECTED -> "Suhbatda"
                    WebRtcCallManager.CallState.FAILED -> "Ulanish xatosi"
                    WebRtcCallManager.CallState.ENDED -> "Tugadi"
                    else -> "Kutilmoqda"
                },
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
                color = statusColor,
            )

            if (state == WebRtcCallManager.CallState.CONNECTING) {
                CircularProgressIndicator(
                    Modifier.padding(top = 16.dp),
                    color = TcallColors.IosBlue,
                )
            }
        }

        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 56.dp)
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
