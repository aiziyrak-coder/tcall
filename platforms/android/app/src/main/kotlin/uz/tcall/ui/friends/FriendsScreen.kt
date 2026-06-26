package uz.tcall.ui.friends

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.network.BlockDto
import uz.tcall.network.ContactDto
import uz.tcall.network.IncomingFriendRequestDto
import uz.tcall.network.LookupUserDto
import uz.tcall.ui.components.GradientPrimaryButton
import uz.tcall.ui.components.GreenCallButton
import uz.tcall.ui.components.IosIconButton
import uz.tcall.ui.components.TcallAvatar
import uz.tcall.ui.components.TcallGlassCard
import uz.tcall.ui.components.TcallPrimaryButton
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.formatTcallId

@Composable
fun FriendsScreen(
    viewModel: FriendsViewModel,
    ui: TcallUiStrings,
    onCall: (String) -> Unit,
    onMessage: (String) -> Unit,
) {
    val state by viewModel.state.collectAsState()

    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Search, null, tint = TcallColors.Slate500, modifier = Modifier.size(16.dp))
                Text(ui.search, fontSize = 13.sp, color = TcallColors.Slate500, modifier = Modifier.padding(start = 6.dp))
            }
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(
                    Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color.White)
                        .border(1.dp, Color(0x12000000), RoundedCornerShape(14.dp))
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                ) {
                    BasicTextField(
                        value = state.searchDigits,
                        onValueChange = viewModel::onSearchChange,
                        textStyle = TextStyle(fontSize = 16.sp, color = TcallColors.Slate900),
                        decorationBox = { inner ->
                            if (state.searchDigits.isEmpty()) {
                                Text(ui.searchById, color = TcallColors.Slate500, fontSize = 16.sp)
                            }
                            inner()
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                Box(
                    Modifier
                        .clip(RoundedCornerShape(14.dp))
                        .background(Brush.linearGradient(listOf(Color(0xFF6366F1), Color(0xFF4F46E5))))
                        .clickable { /* search triggers on 9 digits */ }
                        .padding(horizontal = 18.dp, vertical = 12.dp),
                ) {
                    Text(ui.search, color = Color.White, fontWeight = FontWeight.SemiBold)
                }
            }
            if (state.searching) {
                Box(Modifier.fillMaxWidth().padding(12.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
                }
            }
            state.searchError?.let {
                Text(it, color = TcallColors.Destructive, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
            }
            state.searchResult?.let { user ->
                SearchResultCard(user, ui, state.actionLoading, viewModel::sendFriendRequest, onCall, onMessage)
            }
        }

        if (state.incoming.isNotEmpty()) {
            items(state.incoming, key = { it.id }) { req ->
                IncomingRequestRow(req, state.actionLoading, viewModel::respond)
            }
        }

        item {
            Text(
                "${ui.friendsSection} (${state.friends.size})",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = TcallColors.TextPrimary,
                modifier = Modifier.padding(top = 8.dp, bottom = 4.dp),
            )
            if (state.loading) {
                Box(Modifier.fillMaxWidth().height(80.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        }

        items(state.friends, key = { it.id }) { friend ->
            FriendRow(friend, ui, onCall = { onCall(friend.tcallId) }, onMessage = { onMessage(friend.tcallId) }) {
                viewModel.removeFriend(friend.id)
            }
        }

        item {
            BlacklistSection(
                blocks = state.blocks,
                blockInput = state.blockInput,
                expanded = state.showBlacklist,
                ui = ui,
                onToggle = viewModel::toggleBlacklist,
                onBlockInput = viewModel::onBlockInputChange,
                onBlock = viewModel::blockUser,
                onUnblock = viewModel::unblock,
            )
        }

        state.actionError?.let { err ->
            item { Text(err, color = TcallColors.Destructive, fontSize = 13.sp) }
        }
    }
}

@Composable
private fun FriendRow(
    friend: ContactDto,
    ui: TcallUiStrings,
    onCall: () -> Unit,
    onMessage: () -> Unit,
    onRemove: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TcallAvatar(friend.name, size = 44.dp)
        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
            Text(friend.name, fontWeight = FontWeight.SemiBold, color = TcallColors.TextPrimary)
            Text(formatTcallId(friend.tcallId), fontSize = 12.sp, color = TcallColors.Slate500)
        }
        IosIconButton(Icons.Default.Person, {}, tint = TcallColors.Slate500, modifier = Modifier.size(36.dp))
        IosIconButton(Icons.Default.Message, onMessage, tint = TcallColors.IosBlue, modifier = Modifier.size(36.dp))
        GreenCallButton(onClick = onCall)
        Spacer(Modifier.size(6.dp))
        IosIconButton(Icons.Default.Delete, onRemove, tint = TcallColors.Slate500, modifier = Modifier.size(36.dp))
    }
    HorizontalDivider(color = TcallColors.Separator, thickness = 0.5.dp)
}

@Composable
private fun BlacklistSection(
    blocks: List<BlockDto>,
    blockInput: String,
    expanded: Boolean,
    ui: TcallUiStrings,
    onToggle: () -> Unit,
    onBlockInput: (String) -> Unit,
    onBlock: () -> Unit,
    onUnblock: (String) -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0xFFFFF1F2))
            .border(1.dp, Color(0x26F43F5E), RoundedCornerShape(14.dp))
            .padding(14.dp),
    ) {
        Row(
            Modifier.fillMaxWidth().clickable(onClick = onToggle),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Default.Shield, null, tint = Color(0xFFE11D48), modifier = Modifier.size(18.dp))
            Text(ui.blacklist, Modifier.weight(1f).padding(horizontal = 8.dp), fontWeight = FontWeight.SemiBold, color = Color(0xFFBE123C))
            if (blocks.isNotEmpty()) {
                Text("${blocks.size}", fontSize = 11.sp, color = Color(0xFFBE123C), modifier = Modifier.padding(end = 6.dp))
            }
            Icon(if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null, tint = Color(0xFFBE123C))
        }
        if (expanded) {
            Spacer(Modifier.height(10.dp))
            Text(ui.blacklistDesc, fontSize = 13.sp, color = TcallColors.Slate500, lineHeight = 18.sp)
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.White)
                        .border(1.dp, Color(0x12000000), RoundedCornerShape(12.dp))
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                ) {
                    BasicTextField(
                        value = blockInput,
                        onValueChange = onBlockInput,
                        textStyle = TextStyle(fontSize = 15.sp, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace),
                        decorationBox = { inner ->
                            if (blockInput.isEmpty()) Text(ui.searchById, color = TcallColors.Slate500, fontSize = 15.sp)
                            inner()
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                Box(
                    Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.White)
                        .border(1.dp, Color(0x26000000), RoundedCornerShape(12.dp))
                        .clickable(enabled = blockInput.length == 9, onClick = onBlock)
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                ) {
                    Text(ui.block, fontWeight = FontWeight.SemiBold, color = if (blockInput.length == 9) TcallColors.Slate900 else TcallColors.Slate400)
                }
            }
            Spacer(Modifier.height(10.dp))
            if (blocks.isEmpty()) {
                Text(ui.blacklistEmpty, color = TcallColors.Slate500, fontSize = 13.sp)
            } else {
                blocks.forEach { block ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        TcallAvatar(block.name ?: "?", size = 36.dp)
                        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                            Text(block.name ?: ui.unknown, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                            Text(formatTcallId(block.blockedTcallId), fontSize = 12.sp, color = TcallColors.Slate500, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace)
                        }
                        Text(
                            ui.unblock,
                            color = TcallColors.Destructive,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.clickable { onUnblock(block.blockedTcallId) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchResultCard(
    user: LookupUserDto,
    ui: TcallUiStrings,
    loading: Boolean,
    onAddFriend: (String, String) -> Unit,
    onCall: (String) -> Unit,
    onMessage: (String) -> Unit,
) {
    TcallGlassCard(Modifier.padding(vertical = 8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            TcallAvatar(user.name, size = 48.dp)
            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                Text(user.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(formatTcallId(user.tcallId), fontSize = 13.sp, color = TcallColors.Slate500)
            }
        }
        Spacer(Modifier.height(12.dp))
        if (user.isFriend == true) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GreenCallButton(onClick = { onCall(user.tcallId) })
                IosIconButton(Icons.Default.Message, { onMessage(user.tcallId) }, tint = TcallColors.IosBlue)
            }
        } else if (user.friendRequestSent != true) {
            GradientPrimaryButton(
                text = if (loading) "..." else "+",
                onClick = { onAddFriend(user.tcallId, user.name) },
                loading = loading,
            )
        }
    }
}

@Composable
private fun IncomingRequestRow(
    req: IncomingFriendRequestDto,
    loading: Boolean,
    onRespond: (String, Boolean) -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Color.White).padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TcallAvatar(req.sender.name, size = 44.dp)
        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
            Text(req.sender.name, fontWeight = FontWeight.SemiBold)
            Text(formatTcallId(req.sender.tcallId), fontSize = 12.sp, color = TcallColors.Slate500)
        }
        IconButton(onClick = { onRespond(req.sender.tcallId, true) }, enabled = !loading) {
            Icon(Icons.Default.Check, null, tint = TcallColors.CallGreen)
        }
        IconButton(onClick = { onRespond(req.sender.tcallId, false) }, enabled = !loading) {
            Icon(Icons.Default.Close, null, tint = TcallColors.Destructive)
        }
    }
}
