package uz.tcall.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.components.GradientPrimaryButton
import uz.tcall.ui.components.IosCenterModal
import uz.tcall.ui.components.IosIconButton
import uz.tcall.ui.components.TcallAvatar
import uz.tcall.ui.components.TcallPrimaryButton
import uz.tcall.ui.components.TcallTextField
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.formatTcallId

@Composable
fun SettingsModal(
    open: Boolean,
    viewModel: SettingsViewModel,
    ui: TcallUiStrings,
    onClose: () -> Unit,
    onLogout: () -> Unit,
) {
    if (!open) return
    val state by viewModel.state.collectAsState()

    IosCenterModal(onDismiss = onClose) {
        when {
            state.loading -> {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            else -> {
                val title = when (state.section) {
                    SettingsSection.OVERVIEW -> ui.settings
                    SettingsSection.PROFILE -> ui.myData
                    SettingsSection.PREFERENCES -> ui.preferences
                    SettingsSection.PASSWORD -> ui.changePassword
                }
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    if (state.section != SettingsSection.OVERVIEW) {
                        IosIconButton(Icons.AutoMirrored.Filled.ArrowBack, { viewModel.navigate(SettingsSection.OVERVIEW) })
                    }
                    Text(title, fontWeight = FontWeight.Bold, fontSize = 20.sp, modifier = Modifier.weight(1f))
                    IosIconButton(Icons.Default.Close, onClose)
                }
                Spacer(Modifier.height(12.dp))
                Column(Modifier.verticalScroll(rememberScrollState())) {
                    when (state.section) {
                        SettingsSection.OVERVIEW -> SettingsOverview(state, ui, viewModel::navigate, onLogout)
                        SettingsSection.PROFILE -> ProfileSection(state, viewModel, ui)
                        SettingsSection.PREFERENCES -> PreferencesSection(state, viewModel, ui)
                        SettingsSection.PASSWORD -> PasswordSection(state, viewModel, ui)
                    }
                    state.error?.let { Text(it, color = TcallColors.Destructive, fontSize = 13.sp) }
                    if (state.saved) Text("✓", color = TcallColors.CallGreen, fontSize = 13.sp)
                }
                Spacer(Modifier.height(12.dp))
                Box(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).border(1.dp, Color(0x26000000), RoundedCornerShape(14.dp))
                        .clickable(onClick = onClose).padding(vertical = 14.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(ui.close, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun SettingsOverview(
    state: SettingsUiState,
    ui: TcallUiStrings,
    navigate: (SettingsSection) -> Unit,
    onLogout: () -> Unit,
) {
    val user = state.user ?: return
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        TcallAvatar(user.name, size = 72.dp)
        Text(user.name, fontWeight = FontWeight.Bold, fontSize = 20.sp, modifier = Modifier.padding(top = 10.dp))
        Text(user.email, color = TcallColors.Slate500, fontSize = 13.sp, fontFamily = FontFamily.Monospace)
        user.tcallId?.let {
            Text("${ui.yourNumberLabel}: ${formatTcallId(it)}", color = TcallColors.IosBlue, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp))
        }
    }
    Spacer(Modifier.height(16.dp))
    SettingsRow(Icons.Default.Person, ui.myData, ui.myDataHint) { navigate(SettingsSection.PROFILE) }
    SettingsRow(Icons.Default.Person, ui.profileDetails, ui.profileDetailsHint) { navigate(SettingsSection.PROFILE) }
    SettingsRow(Icons.Default.Tune, ui.preferences, ui.preferencesHint) { navigate(SettingsSection.PREFERENCES) }
    SettingsRow(Icons.Default.Notifications, ui.notifications, ui.notificationsHint) {}
    SettingsRow(Icons.Default.Key, ui.changePassword, ui.changePasswordHint) { navigate(SettingsSection.PASSWORD) }
    Spacer(Modifier.height(12.dp))
    TcallPrimaryButton(ui.logout, onClick = onLogout)
}

@Composable
private fun SettingsRow(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 4.dp).clip(RoundedCornerShape(14.dp)).background(Color(0xFFF8FAFC))
            .border(1.dp, Color(0x0F000000), RoundedCornerShape(14.dp)).clickable(onClick = onClick).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(40.dp).clip(CircleShape).background(Color(0x1A6366F1)), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = TcallColors.Brand600, modifier = Modifier.size(20.dp))
        }
        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            Text(subtitle, fontSize = 12.sp, color = TcallColors.Slate500, lineHeight = 16.sp)
        }
        Icon(Icons.Default.ChevronRight, null, tint = TcallColors.Slate400)
    }
}

@Composable
private fun ProfileSection(state: SettingsUiState, vm: SettingsViewModel, ui: TcallUiStrings) {
    TcallTextField(state.name, vm::updateName, ui.myData)
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.bio, vm::updateBio, "Bio", maxLines = 3)
    Spacer(Modifier.height(14.dp))
    GradientPrimaryButton(ui.save, onClick = vm::saveProfile, loading = state.saving)
}

@Composable
private fun PreferencesSection(state: SettingsUiState, vm: SettingsViewModel, ui: TcallUiStrings) {
    listOf("uz" to "O'zbek", "ru" to "Русский", "en" to "English").forEach { (code, label) ->
        Row(Modifier.fillMaxWidth().clickable { vm.updateLanguage(code) }.padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(20.dp).clip(CircleShape).background(if (state.language == code) TcallColors.Brand600 else Color(0xFFE2E8F0)))
            Text(label, modifier = Modifier.padding(start = 10.dp))
        }
    }
    Spacer(Modifier.height(14.dp))
    GradientPrimaryButton(ui.save, onClick = vm::savePreferences, loading = state.saving)
}

@Composable
private fun PasswordSection(state: SettingsUiState, vm: SettingsViewModel, ui: TcallUiStrings) {
    TcallTextField(state.currentPassword, vm::updateCurrentPassword, ui.changePassword, visualTransformation = PasswordVisualTransformation())
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.newPassword, vm::updateNewPassword, "New", visualTransformation = PasswordVisualTransformation())
    Spacer(Modifier.height(14.dp))
    GradientPrimaryButton(ui.save, onClick = vm::savePassword, loading = state.saving)
}
