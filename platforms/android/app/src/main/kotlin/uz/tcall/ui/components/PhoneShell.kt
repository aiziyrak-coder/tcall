package uz.tcall.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Message
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PersonSearch
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.formatTcallId

enum class PhoneTab(val label: String, val icon: ImageVector, val center: Boolean = false) {
    MESSAGES("Xabarlar", Icons.AutoMirrored.Filled.Message),
    FRIENDS("Do'stlar", Icons.Default.PersonSearch),
    KEYPAD("Terish", Icons.Default.Phone, center = true),
    ROOM("Xona", Icons.Default.Link),
    INTERPRETER("Tarjimon", Icons.Default.Translate),
}

@Composable
fun PhoneShell(
    selectedTab: PhoneTab,
    onTabSelected: (PhoneTab) -> Unit,
    userName: String,
    userTcallId: String,
    onLogout: () -> Unit,
    badges: Map<PhoneTab, Int> = emptyMap(),
    hideHeader: Boolean = false,
    hideTabBar: Boolean = false,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Box(
        modifier
            .fillMaxSize()
            .background(TcallColors.BgPrimary),
    ) {
        LiquidBackgroundOrbs()

        Column(Modifier.fillMaxSize()) {
            if (!hideHeader) {
                PhoneHeader(
                    selectedTab = selectedTab,
                    userName = userName,
                    userTcallId = userTcallId,
                    onLogout = onLogout,
                )
            }

            Box(Modifier.weight(1f).fillMaxWidth()) {
                content()
            }

            if (!hideTabBar) {
                LiquidTabBar(
                    selectedTab = selectedTab,
                    onTabSelected = onTabSelected,
                    badges = badges,
                )
            }
        }
    }
}

@Composable
private fun LiquidBackgroundOrbs() {
    Box(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .size(220.dp)
                .offset(x = (-40).dp, y = 80.dp)
                .clip(CircleShape)
                .background(TcallColors.OrbBlue),
        )
        Box(
            Modifier
                .size(180.dp)
                .align(Alignment.TopEnd)
                .offset(x = 30.dp, y = 200.dp)
                .clip(CircleShape)
                .background(TcallColors.OrbPurple),
        )
    }
}

@Composable
private fun PhoneHeader(
    selectedTab: PhoneTab,
    userName: String,
    userTcallId: String,
    onLogout: () -> Unit,
) {
    var menuOpen by remember { mutableStateOf(false) }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color.White.copy(alpha = 0.72f),
        shadowElevation = 0.dp,
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TcallLogoIcon(Modifier.size(32.dp))

            Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(TcallColors.IosBlue.copy(alpha = 0.12f))
                            .padding(horizontal = 8.dp, vertical = 3.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(selectedTab.icon, contentDescription = null, modifier = Modifier.size(12.dp), tint = TcallColors.IosBlue)
                            Text(selectedTab.label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = TcallColors.IosBlue)
                        }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    TcallAvatar(name = userName, size = 22.dp)
                    Text(userName, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TcallColors.TextPrimary, maxLines = 1)
                    Text(
                        "#${formatTcallId(userTcallId)}",
                        fontSize = 12.sp,
                        color = TcallColors.Slate500,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }

            Box {
                IconButton(onClick = { menuOpen = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "Menyu", tint = TcallColors.TextPrimary)
                }
                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                    DropdownMenuItem(
                        text = { Text("Chiqish") },
                        onClick = {
                            menuOpen = false
                            onLogout()
                        },
                    )
                }
            }
        }
    }
}

@Composable
fun TcallLogoIcon(modifier: Modifier = Modifier) {
    Box(
        modifier
            .clip(RoundedCornerShape(10.dp))
            .background(Brush.linearGradient(listOf(TcallColors.IosBlue, TcallColors.BrandPurple)))
            .then(modifier),
        contentAlignment = Alignment.Center,
    ) {
        Text("T", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
    }
}

@Composable
fun TcallAvatar(name: String, size: androidx.compose.ui.unit.Dp = 40.dp) {
    val initial = name.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "?"
    Box(
        Modifier
            .size(size)
            .clip(CircleShape)
            .background(Brush.linearGradient(listOf(TcallColors.BrandPurple, TcallColors.IosBlue))),
        contentAlignment = Alignment.Center,
    ) {
        Text(initial, color = Color.White, fontWeight = FontWeight.Bold, fontSize = (size.value * 0.38f).sp)
    }
}

@Composable
private fun LiquidTabBar(
    selectedTab: PhoneTab,
    onTabSelected: (PhoneTab) -> Unit,
    badges: Map<PhoneTab, Int>,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = TcallColors.TabBarBg,
        shadowElevation = 8.dp,
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 4.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.Bottom,
        ) {
            PhoneTab.entries.forEach { tab ->
                if (tab.center) {
                    CenterTabItem(
                        tab = tab,
                        selected = selectedTab == tab,
                        badge = badges[tab] ?: 0,
                        onClick = { onTabSelected(tab) },
                    )
                } else {
                    TabItem(
                        tab = tab,
                        selected = selectedTab == tab,
                        badge = badges[tab] ?: 0,
                        onClick = { onTabSelected(tab) },
                    )
                }
            }
        }
    }
}

@Composable
private fun TabItem(
    tab: PhoneTab,
    selected: Boolean,
    badge: Int,
    onClick: () -> Unit,
) {
    val color = if (selected) TcallColors.IosBlue else TcallColors.TabInactive
    Column(
        modifier = Modifier
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onClick)
            .padding(horizontal = 4.dp, vertical = 2.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (selected) {
            Box(
                Modifier
                    .size(width = 20.dp, height = 2.5.dp)
                    .clip(RoundedCornerShape(99.dp))
                    .background(TcallColors.IosBlue),
            )
        } else {
            Spacer(Modifier.height(2.5.dp))
        }
        Spacer(Modifier.height(4.dp))
        Box(contentAlignment = Alignment.Center) {
            Icon(tab.icon, contentDescription = tab.label, tint = color, modifier = Modifier.size(22.dp))
            if (badge > 0) {
                TabBadge(badge, Modifier.align(Alignment.TopEnd).offset(x = 6.dp, y = (-4).dp))
            }
        }
        Spacer(Modifier.height(2.dp))
        Text(tab.label, fontSize = 9.5.sp, fontWeight = FontWeight.SemiBold, color = color, textAlign = TextAlign.Center)
    }
}

@Composable
private fun CenterTabItem(
    tab: PhoneTab,
    selected: Boolean,
    badge: Int,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onClick)
            .offset(y = (-8).dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Box(
                Modifier
                    .size(52.dp)
                    .shadow(10.dp, CircleShape, spotColor = TcallColors.IosBlue.copy(alpha = 0.4f))
                    .clip(CircleShape)
                    .background(TcallColors.CenterBtnGradient)
                    .border(1.dp, Color.White.copy(alpha = 0.24f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(tab.icon, contentDescription = tab.label, tint = Color.White, modifier = Modifier.size(26.dp))
            }
            if (badge > 0) {
                TabBadge(badge, Modifier.align(Alignment.TopEnd).offset(x = 2.dp, y = (-2).dp))
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            tab.label,
            fontSize = 9.5.sp,
            fontWeight = FontWeight.Bold,
            color = if (selected) TcallColors.IosBlue else TcallColors.TabInactive,
        )
    }
}

@Composable
private fun TabBadge(count: Int, modifier: Modifier = Modifier) {
    Box(
        modifier
            .then(modifier)
            .background(TcallColors.Destructive, CircleShape)
            .padding(horizontal = 4.dp, vertical = 1.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            if (count > 9) "9+" else count.toString(),
            color = Color.White,
            fontSize = 8.5.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}
