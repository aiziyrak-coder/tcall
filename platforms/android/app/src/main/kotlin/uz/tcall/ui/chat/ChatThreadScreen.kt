package uz.tcall.ui.chat

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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.network.ChatMessageDto
import uz.tcall.ui.components.GreenCallButton
import uz.tcall.ui.components.IosIconButton
import uz.tcall.ui.components.TcallAvatar
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.util.formatShortTime

@Composable
fun ChatThreadScreen(
    title: String,
    peerTcallId: String?,
    ui: TcallUiStrings,
    viewModel: ChatThreadViewModel,
    onBack: () -> Unit,
    onCall: ((String) -> Unit)? = null,
) {
    val state by viewModel.state.collectAsState()
    var draft by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) listState.animateScrollToItem(state.messages.lastIndex)
    }

    Column(Modifier.fillMaxSize().background(Color(0xFFF1F5F9))) {
        Surface(color = Color.White, shadowElevation = 1.dp) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = TcallColors.IosBlue)
                }
                TcallAvatar(title, size = 40.dp)
                Column(Modifier.weight(1f).padding(horizontal = 8.dp)) {
                    Text(title, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TcallColors.Slate900)
                    Text("${ui.chatTranslated} · auto", fontSize = 11.sp, color = TcallColors.IosBlue)
                }
                if (peerTcallId != null && onCall != null) {
                    GreenCallButton(onClick = { onCall(peerTcallId) })
                    Spacer(Modifier.size(6.dp))
                }
                IosIconButton(Icons.Default.MoreVert, {})
            }
        }

        Box(Modifier.weight(1f).fillMaxWidth()) {
            when {
                state.loading -> CircularProgressIndicator(Modifier.align(Alignment.Center), color = TcallColors.IosBlue)
                else -> LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(state.messages, key = { it.id }) { msg ->
                        TranslationBubble(msg, viewModel.isMine(msg), ui)
                    }
                }
            }
        }

        Row(
            Modifier.fillMaxWidth().background(Color.White).navigationBarsPadding().imePadding()
                .padding(horizontal = 10.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            IosIconButton(Icons.Default.AttachFile, {}, tint = TcallColors.Slate500, modifier = Modifier.size(36.dp))
            Box(
                Modifier.weight(1f).clip(RoundedCornerShape(20.dp)).background(Color(0xFFF1F5F9))
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                BasicTextField(
                    value = draft,
                    onValueChange = { draft = it },
                    textStyle = TextStyle(fontSize = 15.sp, color = TcallColors.Slate900),
                    decorationBox = { inner ->
                        if (draft.isEmpty()) Text(ui.message, color = TcallColors.Slate500)
                        inner()
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            IosIconButton(Icons.Default.Mic, {}, tint = TcallColors.Slate500, modifier = Modifier.size(36.dp))
            IconButton(
                onClick = { viewModel.send(draft); draft = "" },
                enabled = draft.isNotBlank() && !state.sending,
                modifier = Modifier.size(40.dp).clip(CircleShape).background(TcallColors.Brand600),
            ) {
                Icon(Icons.AutoMirrored.Filled.Send, null, tint = Color.White, modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
private fun TranslationBubble(msg: ChatMessageDto, mine: Boolean, ui: TcallUiStrings) {
    var showOriginal by remember(msg.id) { mutableStateOf(false) }
    val hasTr = msg.hasTranslation == true && !msg.originalText.isNullOrBlank()
    val body = when {
        msg.deleted == true -> msg.displayText ?: ""
        showOriginal -> msg.originalText ?: msg.displayText ?: ""
        else -> msg.displayText ?: msg.originalText ?: ""
    }
    val align = if (mine) Alignment.End else Alignment.Start
    val shape = RoundedCornerShape(
        topStart = 18.dp, topEnd = 18.dp,
        bottomStart = if (mine) 18.dp else 4.dp,
        bottomEnd = if (mine) 4.dp else 18.dp,
    )

    Column(Modifier.fillMaxWidth(), horizontalAlignment = align) {
        if (!mine) {
            Text(msg.sender.name, fontSize = 12.sp, color = TcallColors.Slate500, modifier = Modifier.padding(start = 4.dp, bottom = 2.dp))
        }
        Box(
            Modifier
                .clip(shape)
                .then(
                    if (mine) Modifier.background(TcallColors.BubbleMineGradient)
                    else Modifier.background(Color.White).border(1.dp, Color(0x12000000), shape).shadow(1.dp, shape),
                )
                .padding(horizontal = 14.dp, vertical = 10.dp),
        ) {
            Column {
                if (hasTr && msg.sourceLang != null && !showOriginal) {
                    Text(
                        "${msg.sourceLang.uppercase()} ${ui.chatTranslated}",
                        fontSize = 10.sp,
                        color = if (mine) Color.White.copy(0.75f) else TcallColors.Slate500,
                        modifier = Modifier.padding(bottom = 4.dp),
                    )
                }
                Text(body, color = if (mine) Color.White else TcallColors.Slate900, fontSize = 15.sp, lineHeight = 20.sp)
                if (hasTr) {
                    Text(
                        if (showOriginal) ui.chatTranslated else ui.viewOriginal,
                        fontSize = 12.sp,
                        color = if (mine) Color.White else TcallColors.IosBlue,
                        textDecoration = TextDecoration.Underline,
                        modifier = Modifier.padding(top = 6.dp).clickable { showOriginal = !showOriginal },
                    )
                }
            }
        }
        formatShortTime(msg.createdAt)?.let {
            Text(it, fontSize = 10.sp, color = TcallColors.Slate500, modifier = Modifier.padding(top = 2.dp, start = 4.dp, end = 4.dp))
        }
    }
}
