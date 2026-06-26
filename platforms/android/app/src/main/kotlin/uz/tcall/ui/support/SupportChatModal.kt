package uz.tcall.ui.support

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.HeadsetMic
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import uz.tcall.data.UserRepository
import uz.tcall.network.SupportMessageDto
import uz.tcall.ui.components.IosIconButton
import uz.tcall.ui.components.IosSearchField
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.util.formatShortTime

@Composable
fun SupportChatModal(
    open: Boolean,
    userRepository: UserRepository,
    ui: TcallUiStrings,
    onClose: () -> Unit,
) {
    if (!open) return

    var loading by remember { mutableStateOf(true) }
    var messages by remember { mutableStateOf<List<SupportMessageDto>>(emptyList()) }
    var text by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun fetchMessages() {
        userRepository.supportMessages().onSuccess { messages = it }
        loading = false
    }

    LaunchedEffect(Unit) {
        loading = true
        fetchMessages()
        while (true) {
            delay(4000)
            fetchMessages()
        }
    }

    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxSize().background(Color.Black.copy(0.35f)), contentAlignment = Alignment.Center) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth(0.92f)
                    .shadow(12.dp, RoundedCornerShape(20.dp))
                    .clip(RoundedCornerShape(20.dp)),
                color = Color.White,
                shape = RoundedCornerShape(20.dp),
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier.size(44.dp).clip(CircleShape).background(Color(0x1A6366F1)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Default.HeadsetMic, null, tint = TcallColors.Brand600)
                        }
                        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                            Text(ui.support, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                            Text(ui.supportSubtitle, fontSize = 12.sp, color = TcallColors.Slate500)
                        }
                        IosIconButton(Icons.Default.Close, onClose)
                    }

                    if (loading) {
                        Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    } else {
                        LazyColumn(
                            Modifier
                                .fillMaxWidth()
                                .heightIn(max = 320.dp)
                                .padding(vertical = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(messages, key = { it.id }) { msg ->
                                val mine = msg.sender == "user"
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start) {
                                    Column(horizontalAlignment = if (mine) Alignment.End else Alignment.Start) {
                                        Box(
                                            Modifier
                                                .clip(RoundedCornerShape(16.dp))
                                                .background(if (mine) TcallColors.Brand600 else Color(0xFFF1F5F9))
                                                .padding(horizontal = 14.dp, vertical = 10.dp),
                                        ) {
                                            Text(msg.text, color = if (mine) Color.White else TcallColors.TextPrimary, fontSize = 14.sp)
                                        }
                                        formatShortTime(msg.createdAt)?.let {
                                            Text(it, fontSize = 10.sp, color = TcallColors.Slate500, modifier = Modifier.padding(top = 2.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Text(ui.supportHint, fontSize = 11.sp, color = TcallColors.Slate500, lineHeight = 15.sp)
                    Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        IosSearchField(
                            value = text,
                            onValueChange = { text = it },
                            placeholder = ui.supportPlaceholder,
                            modifier = Modifier.weight(1f),
                        )
                        IconButton(
                            onClick = {
                                scope.launch {
                                    sending = true
                                    userRepository.sendSupport(text.trim())
                                        .onSuccess { text = ""; fetchMessages() }
                                    sending = false
                                }
                            },
                            enabled = text.isNotBlank() && !sending,
                            modifier = Modifier
                                .padding(start = 8.dp)
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(TcallColors.Brand600),
                        ) {
                            if (sending) CircularProgressIndicator(Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                            else Icon(Icons.Default.Send, null, tint = Color.White)
                        }
                    }
                }
            }
        }
    }
}
