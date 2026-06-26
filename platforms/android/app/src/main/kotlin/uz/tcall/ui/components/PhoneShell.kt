package uz.tcall.ui.components

import androidx.compose.animation.core.animateFloatAsState
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
import androidx.compose.material.icons.filled.HeadsetMic
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PersonSearch
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.strings.tabLabel
import uz.tcall.ui.strings.uiStrings
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.TcallGlassBar
import uz.tcall.ui.theme.TcallMotion
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
    userLanguage: String = "uz",
    onLogout: () -> Unit,
    onOpenSettings: () -> Unit = {},
    onOpenVanity: () -> Unit = {},
    onOpenSupport: () -> Unit = {},
    badges: Map<PhoneTab, Int> = emptyMap(),
    hideHeader: Boolean = false,
    hideTabBar: Boolean = false,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val ui = remember(userLanguage) { uiStrings(userLanguage) }

    Box(modifier.fillMaxSize().background(TcallColors.MeshGradient)) {
        MeshOrbs()

        Column(Modifier.fillMaxSize()) {
            if (!hideHeader) {
                PhoneHeader(
                    selectedTab, ui, userTcallId,
                    onLogout, onOpenSettings, onOpenVanity, onOpenSupport,
                )
            }
            Box(Modifier.weight(1f).fillMaxWidth()) { content() }
            if (!hideTabBar) {
                FloatingTabBar(selectedTab, onTabSelected, badges, ui)
            }
        }
    }
}

@Composable
private fun MeshOrbs() {
    Box(Modifier.fillMaxSize()) {
        Box(Modifier.size(280.dp).offset((-70).dp, 40.dp).clip(CircleShape).background(TcallColors.OrbBlue))
        Box(Modifier.size(220.dp).align(Alignment.TopEnd).offset(30.dp, 160.dp).clip(CircleShape).background(TcallColors.OrbPurple))
        Box(Modifier.size(160.dp).align(Alignment.BottomStart).offset(60.dp, (-100).dp).clip(CircleShape).background(TcallColors.OrbWarm))
    }
}

@Composable
private fun PhoneHeader(
    selectedTab: PhoneTab,
    ui: TcallUiStrings,
    userTcallId: String,
    onLogout: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenVanity: () -> Unit,
    onOpenSupport: () -> Unit,
) {
    var menuOpen by remember { mutableStateOf(false) }
    val tabTitle = tabLabel(selectedTab, ui)
    val showLogo = selectedTab == PhoneTab.KEYPAD || selectedTab == PhoneTab.ROOM
    val showPageTitle = !showLogo && selectedTab != PhoneTab.MESSAGES

    TcallGlassBar {
        Row(
            Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 8.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            when {
                showLogo -> {
                    TcallLogoHeaderIcon()
                    PhoneTabPill(selectedTab, tabTitle)
                    if (selectedTab == PhoneTab.KEYPAD) {
                        UserNumberChip(ui.yourNumber, formatTcallId(userTcallId))
                    }
                }
                selectedTab == PhoneTab.MESSAGES -> PhoneTabPill(selectedTab, tabTitle)
                showPageTitle -> IosPageTitle(tabTitle)
            }
            Spacer(Modifier.weight(1f))
            IosIconButton(Icons.Default.HeadsetMic, onOpenSupport, tint = TcallColors.Ink)
            Box {
                IosIconButton(Icons.Default.MoreVert, { menuOpen = true }, tint = TcallColors.Ink)
                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                    DropdownMenuItem(
                        text = { Text(ui.numbers, color = TcallColors.Ink, fontWeight = FontWeight.SemiBold) },
                        leadingIcon = { Icon(Icons.Default.Star, null, tint = TcallColors.AccentInk) },
                        onClick = { menuOpen = false; onOpenVanity() },
                    )
                    DropdownMenuItem(
                        text = { Text(ui.settings, color = TcallColors.Ink, fontWeight = FontWeight.SemiBold) },
                        leadingIcon = { Icon(Icons.Default.Settings, null, tint = TcallColors.Slate) },
                        onClick = { menuOpen = false; onOpenSettings() },
                    )
                    DropdownMenuItem(
                        text = { Text(ui.logout, color = TcallColors.Destructive, fontWeight = FontWeight.Bold) },
                        onClick = { menuOpen = false; onLogout() },
                    )
                }
            }
        }
    }
}

@Composable
fun TcallAvatar(name: String, size: androidx.compose.ui.unit.Dp = 40.dp) {
    val initial = name.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "?"
    Box(
        Modifier
            .size(size)
            .shadow(4.dp, CircleShape, spotColor = TcallColors.Accent.copy(0.25f))
            .clip(CircleShape)
            .background(TcallColors.AccentGradient),
        contentAlignment = Alignment.Center,
    ) {
        Text(initial, color = Color.White, fontWeight = FontWeight.Bold, fontSize = (size.value * 0.38f).sp)
    }
}

@Composable
private fun FloatingTabBar(
    selectedTab: PhoneTab,
    onTabSelected: (PhoneTab) -> Unit,
    badges: Map<PhoneTab, Int>,
    ui: TcallUiStrings,
) {
    val shape = RoundedCornerShape(32.dp)
    Box(
        Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .shadow(12.dp, shape, spotColor = Color(0x1A4F8FF7))
                .clip(shape)
                .background(TcallColors.TabBarBg)
                .border(1.dp, TcallColors.GlassHairline, shape)
                .drawBehind {
                    drawRect(brush = Brush.verticalGradient(listOf(Color.White.copy(0.7f), Color.Transparent)))
                }
                .padding(horizontal = 8.dp, vertical = 10.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                PhoneTab.entries.forEach { tab ->
                    if (tab.center) {
                        CenterTab(tab, tabLabel(tab, ui), selectedTab == tab, badges[tab] ?: 0) { onTabSelected(tab) }
                    } else {
                        SideTab(tab, tabLabel(tab, ui), selectedTab == tab, badges[tab] ?: 0) { onTabSelected(tab) }
                    }
                }
            }
        }
    }
}

@Composable
private fun SideTab(tab: PhoneTab, label: String, selected: Boolean, badge: Int, onClick: () -> Unit) {
    val tint = if (selected) TcallColors.AccentInk else TcallColors.Slate
    val scale by animateFloatAsState(if (selected) 1.05f else 1f, TcallMotion.spring, label = "sideTab")
    Column(
        Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onClick).padding(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(tab.icon, contentDescription = label, tint = tint, modifier = Modifier.size(22.dp).scale(scale))
            if (badge > 0) TabBadge(badge, Modifier.align(Alignment.TopEnd).offset(6.dp, (-4).dp))
        }
        Spacer(Modifier.height(2.dp))
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = tint, textAlign = TextAlign.Center)
    }
}

@Composable
private fun CenterTab(tab: PhoneTab, label: String, selected: Boolean, badge: Int, onClick: () -> Unit) {
    val tint = if (selected) TcallColors.AccentInk else TcallColors.Slate
    Column(
        Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Box(
                Modifier
                    .size(46.dp)
                    .shadow(8.dp, CircleShape, spotColor = TcallColors.Accent.copy(0.18f))
                    .clip(CircleShape)
                    .background(TcallColors.GlassSheet)
                    .border(1.5.dp, TcallColors.AccentBorderSoft, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(tab.icon, contentDescription = label, tint = tint, modifier = Modifier.size(24.dp))
            }
            if (badge > 0) TabBadge(badge, Modifier.align(Alignment.TopEnd))
        }
        Spacer(Modifier.height(3.dp))
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = tint)
    }
}

@Composable
private fun TabBadge(count: Int, modifier: Modifier = Modifier) {
    Box(
        modifier.shadow(2.dp, CircleShape).background(TcallColors.Destructive, CircleShape)
            .padding(horizontal = 5.dp, vertical = 1.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(if (count > 9) "9+" else "$count", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
    }
}
