package uz.tcall.ui.room

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.Login
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.components.GradientPrimaryButton
import uz.tcall.ui.components.IosListCard
import uz.tcall.ui.components.TcallAvatar
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.formatTcallId

@Composable
fun RoomScreen(
    viewModel: RoomViewModel,
    ui: TcallUiStrings,
    onJoinCall: (String) -> Unit,
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val guestJoined = state.participants.size >= 2
    val spacedCode = state.roomId.uppercase().toCharArray().joinToString(" ")

    LazyColumn(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            IosListCard {
                Box(
                    Modifier.clip(RoundedCornerShape(99.dp)).background(Color(0x1A6366F1))
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                ) {
                    Text("✨ ${ui.aiTranslation}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TcallColors.Brand600)
                }
                Spacer(Modifier.height(10.dp))
                Text(ui.roomTitle, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TcallColors.Slate900)
                Text(ui.roomSubtitle, fontSize = 14.sp, color = TcallColors.Slate500, lineHeight = 20.sp)
            }
        }

        state.error?.let {
            item {
                Text(it, color = TcallColors.Destructive, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 4.dp))
            }
        }

        if (state.roomId.isBlank()) {
            item {
                IosListCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).background(Color(0x1A007AFF)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Add, null, tint = TcallColors.IosBlue)
                        }
                        Column(Modifier.padding(start = 12.dp)) {
                            Text(ui.createRoom, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                            Text(ui.roomSubtitle, fontSize = 13.sp, color = TcallColors.Slate500)
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                    GradientPrimaryButton(
                        text = if (state.creating) "..." else ui.startCall,
                        onClick = viewModel::createRoom,
                        loading = state.creating,
                    )
                }
            }
        } else {
            item {
                IosListCard {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.People, null, tint = TcallColors.Brand600, modifier = Modifier.size(18.dp))
                        Text(ui.roomReady, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TcallColors.Slate500)
                    }
                    Text(
                        spacedCode,
                        fontSize = 28.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        color = TcallColors.IosBlue,
                        letterSpacing = 4.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                    )

                    Box(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color(0x0F6366F1)).padding(12.dp),
                    ) {
                        Column {
                            Text(ui.inRoom, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TcallColors.Slate500, letterSpacing = 1.sp)
                            Spacer(Modifier.height(8.dp))
                            state.participants.forEach { p ->
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
                                    TcallAvatar(p.name, size = 36.dp)
                                    Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                                        Text(p.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                        p.tcallId?.let { Text(formatTcallId(it), fontSize = 12.sp, color = TcallColors.Slate500, fontFamily = FontFamily.Monospace) }
                                    }
                                    if (p.isHost == true) {
                                        Box(
                                            Modifier.clip(RoundedCornerShape(99.dp)).background(Color(0x1A6366F1))
                                                .padding(horizontal = 8.dp, vertical = 3.dp),
                                        ) {
                                            Text(ui.roomOwner, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TcallColors.Brand600)
                                        }
                                    }
                                }
                            }
                            Text(
                                if (guestJoined) "✓" else ui.waitingGuest,
                                fontSize = 12.sp,
                                color = if (guestJoined) TcallColors.CallGreen else TcallColors.Slate500,
                                modifier = Modifier.padding(top = 6.dp),
                            )
                        }
                    }

                    Spacer(Modifier.height(12.dp))
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color(0xFFF8FAFC))
                            .border(1.dp, Color(0x12000000), RoundedCornerShape(12.dp)).padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Default.Link, null, tint = TcallColors.Slate500, modifier = Modifier.size(16.dp))
                        Text(state.roomLink, fontSize = 12.sp, color = TcallColors.Slate500, modifier = Modifier.padding(start = 8.dp).weight(1f))
                    }

                    Spacer(Modifier.height(10.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box(
                            Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(Color.White)
                                .border(1.dp, Color(0x26007AFF), RoundedCornerShape(12.dp))
                                .clickable { copyText(context, state.roomLink); viewModel.markCopied() }
                                .padding(vertical = 12.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(if (state.copied) Icons.Default.Check else Icons.Default.ContentCopy, null, tint = if (state.copied) TcallColors.CallGreen else TcallColors.IosBlue, modifier = Modifier.size(16.dp))
                                Text(if (state.copied) ui.copied else ui.copyLink, fontWeight = FontWeight.SemiBold, color = TcallColors.IosBlue, fontSize = 14.sp)
                            }
                        }
                        Box(
                            Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(Color(0x1A007AFF))
                                .clickable { shareLink(context, state.roomLink, ui.shareLink) }
                                .padding(vertical = 12.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Share, null, tint = TcallColors.IosBlue, modifier = Modifier.size(16.dp))
                                Text(ui.shareLink, fontWeight = FontWeight.SemiBold, color = TcallColors.IosBlue, fontSize = 14.sp)
                            }
                        }
                    }

                    Spacer(Modifier.height(10.dp))
                    GradientPrimaryButton(
                        text = ui.enterRoom,
                        onClick = { onJoinCall(state.roomId) },
                    )

                    Spacer(Modifier.height(8.dp))
                    Text(
                        ui.createNewRoom,
                        color = TcallColors.IosBlue,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.fillMaxWidth().clickable { viewModel.createNewRoom() },
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }

        item {
            IosListCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).background(Color(0x1A6366F1)), contentAlignment = Alignment.Center) {
                        Icon(Icons.AutoMirrored.Filled.Login, null, tint = TcallColors.Brand600)
                    }
                    Column(Modifier.padding(start = 12.dp)) {
                        Text(ui.join, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                        Text(ui.joinSubtitle, fontSize = 13.sp, color = TcallColors.Slate500)
                    }
                }
                Spacer(Modifier.height(12.dp))
                Box(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color.White)
                        .border(1.dp, Color(0x12000000), RoundedCornerShape(12.dp))
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                ) {
                    BasicTextField(
                        value = state.joinCode,
                        onValueChange = viewModel::onJoinCodeChange,
                        textStyle = TextStyle(fontSize = 18.sp, fontWeight = FontWeight.Bold, letterSpacing = 3.sp, fontFamily = FontFamily.Monospace),
                        decorationBox = { inner ->
                            if (state.joinCode.isEmpty()) Text(ui.roomCode, color = TcallColors.Slate500, fontSize = 13.sp)
                            inner()
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                Spacer(Modifier.height(12.dp))
                GradientPrimaryButton(
                    text = if (state.joining) "..." else ui.join,
                    onClick = { viewModel.joinRoom(onJoinCall) },
                    loading = state.joining,
                    enabled = state.joinCode.length >= 8,
                )
            }
        }
    }
}

private fun copyText(context: Context, text: String) {
    val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    cm.setPrimaryClip(ClipData.newPlainText("tcall-room", text))
}

private fun shareLink(context: Context, url: String, title: String) {
    context.startActivity(
        Intent.createChooser(
            Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, url)
                putExtra(Intent.EXTRA_SUBJECT, title)
            },
            title,
        ),
    )
}
