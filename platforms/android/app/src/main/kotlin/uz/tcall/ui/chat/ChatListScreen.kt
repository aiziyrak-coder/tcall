package uz.tcall.ui.chat

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.network.ConversationDto
import uz.tcall.ui.components.ChatActionButton
import uz.tcall.ui.components.ChatConvCard
import uz.tcall.ui.components.GradientPrimaryButton
import uz.tcall.ui.components.IosBottomSheet
import uz.tcall.ui.components.IosIconButton
import uz.tcall.ui.components.IosSearchField
import uz.tcall.ui.components.TcallEmptyState
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.util.formatShortTime

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatListScreen(
    viewModel: ChatListViewModel,
    ui: TcallUiStrings,
    onOpenChat: (ConversationDto) -> Unit,
    onStartChat: (String) -> Unit,
    onCreateGroup: (String, List<String>) -> Unit,
) {
    val state by viewModel.state.collectAsState()
    var query by remember { mutableStateOf("") }
    var showNewChat by remember { mutableStateOf(false) }
    var showNewGroup by remember { mutableStateOf(false) }
    var newTcallId by remember { mutableStateOf("") }
    var groupName by remember { mutableStateOf("") }
    var groupMembers by remember { mutableStateOf("") }
    var actionError by remember { mutableStateOf<String?>(null) }

    val filtered = remember(state.conversations, query) {
        val q = query.trim().lowercase()
        if (q.isBlank()) state.conversations
        else state.conversations.filter {
            it.title.lowercase().contains(q) || (it.lastPreview ?: "").lowercase().contains(q)
        }
    }

    PullToRefreshBox(
        isRefreshing = state.loading,
        onRefresh = viewModel::refresh,
        modifier = Modifier.fillMaxSize(),
    ) {
        when {
            state.loading && state.conversations.isEmpty() -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = TcallColors.IosBlue)
                }
            }
            state.error != null && state.conversations.isEmpty() -> {
                Column(
                    Modifier.fillMaxSize().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(state.error ?: "", color = TcallColors.Destructive)
                    IconButton(onClick = viewModel::refresh) {
                        Icon(Icons.Default.Refresh, null, tint = TcallColors.IosBlue)
                    }
                }
            }
            else -> {
                LazyColumn(
                    Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    item {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            ChatActionButton("+ ${ui.newChat}", Icons.Default.Add, onClick = { showNewChat = true; actionError = null })
                            ChatActionButton(ui.newGroup, Icons.Default.Group, onClick = { showNewGroup = true; actionError = null })
                        }
                    }
                    item {
                        IosSearchField(value = query, onValueChange = { query = it }, placeholder = ui.searchMessages)
                    }
                    if (filtered.isEmpty()) {
                        item { TcallEmptyState(title = ui.messages, subtitle = ui.searchMessages) }
                    } else {
                        items(filtered, key = { it.id }) { conv ->
                            ChatConvCard(
                                name = conv.title,
                                preview = conv.lastPreview ?: "",
                                time = formatShortTime(conv.updatedAt),
                                unread = conv.unreadCount,
                                onClick = { onOpenChat(conv) },
                            )
                        }
                    }
                    item { Spacer(Modifier.height(8.dp)) }
                }
            }
        }
    }

    if (showNewChat) {
        IosBottomSheet(onDismiss = { showNewChat = false }) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(ui.newChat, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                IosIconButton(Icons.Default.Close, { showNewChat = false })
            }
            Spacer(Modifier.height(12.dp))
            Box(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).border(1.dp, Color(0x12000000), RoundedCornerShape(12.dp))
                    .padding(horizontal = 14.dp, vertical = 12.dp),
            ) {
                BasicTextField(
                    value = newTcallId,
                    onValueChange = { newTcallId = it.filter { c -> c.isDigit() }.take(9) },
                    textStyle = TextStyle(fontSize = 16.sp, fontFamily = FontFamily.Monospace),
                    decorationBox = { inner ->
                        if (newTcallId.isEmpty()) Text(ui.searchById, color = TcallColors.Slate500)
                        inner()
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            actionError?.let { Text(it, color = TcallColors.Destructive, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp)) }
            Spacer(Modifier.height(12.dp))
            GradientPrimaryButton(
                text = ui.startChat,
                onClick = {
                    if (newTcallId.length == 9) {
                        onStartChat(newTcallId)
                        showNewChat = false
                        newTcallId = ""
                    }
                },
                enabled = newTcallId.length == 9,
            )
        }
    }

    if (showNewGroup) {
        IosBottomSheet(onDismiss = { showNewGroup = false }) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(ui.newGroup, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                IosIconButton(Icons.Default.Close, { showNewGroup = false })
            }
            Spacer(Modifier.height(12.dp))
            SheetField(groupName, { groupName = it }, ui.groupName)
            Spacer(Modifier.height(10.dp))
            Box(
                Modifier.fillMaxWidth().height(90.dp).clip(RoundedCornerShape(12.dp)).border(1.dp, Color(0x12000000), RoundedCornerShape(12.dp))
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                BasicTextField(
                    value = groupMembers,
                    onValueChange = { groupMembers = it },
                    textStyle = TextStyle(fontSize = 14.sp, fontFamily = FontFamily.Monospace),
                    decorationBox = { inner ->
                        if (groupMembers.isEmpty()) Text(ui.groupMembersHint, color = TcallColors.Slate500, fontSize = 13.sp, lineHeight = 18.sp)
                        inner()
                    },
                    modifier = Modifier.fillMaxSize(),
                )
            }
            actionError?.let { Text(it, color = TcallColors.Destructive, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp)) }
            Spacer(Modifier.height(12.dp))
            GradientPrimaryButton(
                text = ui.createGroup,
                onClick = {
                    val ids = groupMembers.split(Regex("[,\\s]+")).map { it.filter(Char::isDigit) }.filter { it.length == 9 }.distinct()
                    if (groupName.isNotBlank() && ids.isNotEmpty()) {
                        onCreateGroup(groupName.trim(), ids)
                        showNewGroup = false
                        groupName = ""
                        groupMembers = ""
                    }
                },
                enabled = groupName.isNotBlank() && groupMembers.any { it.isDigit() },
            )
        }
    }
}

@Composable
private fun SheetField(value: String, onChange: (String) -> Unit, placeholder: String) {
    Box(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).border(1.dp, Color(0x12000000), RoundedCornerShape(12.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        BasicTextField(
            value = value,
            onValueChange = onChange,
            textStyle = TextStyle(fontSize = 16.sp),
            decorationBox = { inner ->
                if (value.isEmpty()) Text(placeholder, color = TcallColors.Slate500)
                inner()
            },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
