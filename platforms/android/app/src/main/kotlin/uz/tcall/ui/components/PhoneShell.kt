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
import androidx.compose.material.icons.filled.HeadsetMic
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.PersonSearch
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Phone
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.filled.Translate
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.strings.tabLabel
import uz.tcall.ui.strings.uiStrings
import uz.tcall.ui.theme.GlassLevel
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.TcallGlassBar
import uz.tcall.ui.theme.TcallGlassSurface
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
                    ui = ui,
                    userTcallId = userTcallId,
                    onLogout = onLogout,
                    onOpenSettings = onOpenSettings,
                    onOpenVanity = onOpenVanity,
                    onOpenSupport = onOpenSupport,
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
                    ui = ui,
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
                .size(260.dp)
                .offset(x = (-60).dp, y = 60.dp)
                .clip(CircleShape)
                .background(TcallColors.OrbBlue),
        )
        Box(
            Modifier
                .size(200.dp)
                .align(Alignment.TopEnd)
                .offset(x = 40.dp, y = 180.dp)
                .clip(CircleShape)
                .background(TcallColors.OrbPurple),
        )
        Box(
            Modifier
                .size(140.dp)
                .align(Alignment.BottomStart)
                .offset(x = 80.dp, y = (-120).dp)
                .clip(CircleShape)
                .background(TcallColors.OrbBlue.copy(alpha = 0.18f)),
        )
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
            Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 12.dp, vertical = 10.dp),
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
            IosIconButton(Icons.Default.HeadsetMic, onOpenSupport, tint = TcallColors.IosBlue)
            Box {
                IosIconButton(Icons.Default.MoreVert, { menuOpen = true }, tint = TcallColors.TextPrimary)
                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                    DropdownMenuItem(
                        text = { Text(ui.numbers, color = TcallColors.TextPrimary, fontWeight = FontWeight.Medium) },
                        leadingIcon = { Icon(Icons.Default.Star, null, tint = TcallColors.IosBlue) },
                        onClick = { menuOpen = false; onOpenVanity() },
                    )
                    DropdownMenuItem(
                        text = { Text(ui.settings, color = TcallColors.TextPrimary, fontWeight = FontWeight.Medium) },
                        leadingIcon = { Icon(Icons.Default.Settings, null, tint = TcallColors.TextSecondary) },
                        onClick = { menuOpen = false; onOpenSettings() },
                    )
                    DropdownMenuItem(
                        text = { Text(ui.logout, color = TcallColors.Destructive, fontWeight = FontWeight.SemiBold) },
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
            .shadow(4.dp, CircleShape, spotColor = TcallColors.IosBlue.copy(0.25f))
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
    ui: TcallUiStrings,
) {
    TcallGlassSurface(
        modifier = Modifier.fillMaxWidth(),
        level = GlassLevel.Bar,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
        elevation = 12.dp,
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 4.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.Bottom,
        ) {
            PhoneTab.entries.forEach { tab ->
                if (tab.center) {
                    CenterTabItem(
                        tab = tab,
                        label = tabLabel(tab, ui),
                        selected = selectedTab == tab,
                        badge = badges[tab] ?: 0,
                        onClick = { onTabSelected(tab) },
                    )
                } else {
                    TabItem(
                        tab = tab,
                        label = tabLabel(tab, ui),
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
    label: String,
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
                    .size(width = 22.dp, height = 3.dp)
                    .clip(RoundedCornerShape(99.dp))
                    .background(TcallColors.IosBlue),
            )
        } else {
            Spacer(Modifier.height(3.dp))
        }
        Spacer(Modifier.height(4.dp))
        Box(contentAlignment = Alignment.Center) {
            Icon(tab.icon, contentDescription = label, tint = color, modifier = Modifier.size(23.dp))
            if (badge > 0) {
                TabBadge(badge, Modifier.align(Alignment.TopEnd).offset(x = 6.dp, y = (-4).dp))
            }
        }
        Spacer(Modifier.height(3.dp))
        Text(
            label,
            fontSize = 11.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
            color = color,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun CenterTabItem(
    tab: PhoneTab,
    label: String,
    selected: Boolean,
    badge: Int,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onClick)
            .offset(y = (-10).dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Box(
                Modifier
                    .size(56.dp)
                    .shadow(12.dp, CircleShape, spotColor = TcallColors.IosBlue.copy(alpha = 0.45f))
                    .clip(CircleShape)
                    .background(TcallColors.CenterBtnGradient)
                    .border(1.5.dp, Color.White.copy(alpha = 0.35f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(tab.icon, contentDescription = label, tint = Color.White, modifier = Modifier.size(28.dp))
            }
            if (badge > 0) {
                TabBadge(badge, Modifier.align(Alignment.TopEnd).offset(x = 2.dp, y = (-2).dp))
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            label,
            fontSize = 11.sp,
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
            .shadow(2.dp, CircleShape)
            .background(TcallColors.Destructive, CircleShape)
            .padding(horizontal = 5.dp, vertical = 1.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            if (count > 9) "9+" else count.toString(),
            color = Color.White,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}
