package uz.tcall.ui.settings

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.components.TcallAvatar
import uz.tcall.ui.components.TcallPrimaryButton
import uz.tcall.ui.components.TcallTextField
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.formatTcallId

@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    onBack: () -> Unit,
    onLogout: () -> Unit,
) {
    val state by viewModel.state.collectAsState()

    Column(
        Modifier
            .fillMaxSize()
            .background(TcallColors.BgPrimary)
            .statusBarsPadding(),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = {
                if (state.section == SettingsSection.OVERVIEW) onBack() else viewModel.navigate(SettingsSection.OVERVIEW)
            }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Orqaga")
            }
            Text(
                when (state.section) {
                    SettingsSection.OVERVIEW -> "Sozlamalar"
                    SettingsSection.PROFILE -> "Mening ma'lumotlarim"
                    SettingsSection.PROFILE_DETAILS -> "Profil tafsilotlari"
                    SettingsSection.PREFERENCES -> "Afzalliklar"
                    SettingsSection.NOTIFICATIONS -> "Bildirishnomalar"
                    SettingsSection.PASSWORD -> "Parolni o'zgartirish"
                    SettingsSection.PIN -> "PIN qulf"
                    SettingsSection.SECURITY -> "Xavfsizlik"
                },
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                modifier = Modifier.weight(1f),
            )
        }

        if (state.loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return
        }

        Column(
            Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        ) {
            when (state.section) {
                SettingsSection.OVERVIEW -> OverviewSection(state, viewModel::navigate, onLogout)
                SettingsSection.PROFILE -> ProfileSection(state, viewModel)
                SettingsSection.PROFILE_DETAILS -> ProfileSection(state, viewModel)
                SettingsSection.PREFERENCES -> PreferencesSection(state, viewModel)
                SettingsSection.NOTIFICATIONS -> Text("Bildirishnomalar tizim sozlamalaridan yoqiladi.", color = TcallColors.TextSecondary)
                SettingsSection.PASSWORD -> PasswordSection(state, viewModel)
                SettingsSection.PIN -> Text("PIN ni modal sozlamalardan o'rnating.", color = TcallColors.TextSecondary)
                SettingsSection.SECURITY -> Text("Hisobni o'chirish modal orqali.", color = TcallColors.TextSecondary)
            }
            state.error?.let {
                Text(it, color = TcallColors.Destructive, fontSize = 13.sp, modifier = Modifier.padding(vertical = 8.dp))
            }
            if (state.saved) {
                Text("Saqlandi ✓", color = TcallColors.CallGreen, fontSize = 13.sp)
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun OverviewSection(
    state: SettingsUiState,
    navigate: (SettingsSection) -> Unit,
    onLogout: () -> Unit,
) {
    val user = state.user ?: return
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        TcallAvatar(user.name.orEmpty(), size = 72.dp)
        Text(user.name.orEmpty(), fontWeight = FontWeight.Bold, fontSize = 20.sp, modifier = Modifier.padding(top = 12.dp))
        Text(user.email.orEmpty(), color = TcallColors.Slate500, fontSize = 14.sp)
        user.tcallId?.let {
            Text("#${formatTcallId(it)}", fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace, color = TcallColors.Brand600, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
        }
    }
    Spacer(Modifier.height(24.dp))
    SettingsNavRow("Mening ma'lumotlarim") { navigate(SettingsSection.PROFILE) }
    SettingsNavRow("Afzalliklar") { navigate(SettingsSection.PREFERENCES) }
    SettingsNavRow("Parolni o'zgartirish") { navigate(SettingsSection.PASSWORD) }
    Spacer(Modifier.height(16.dp))
    TcallPrimaryButton("Chiqish", onClick = onLogout)
}

@Composable
private fun SettingsNavRow(title: String, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 4.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(TcallColors.SurfaceElevated)
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, Modifier.weight(1f), fontWeight = FontWeight.Medium)
        Icon(Icons.Default.ChevronRight, null, tint = TcallColors.Slate400)
    }
}

@Composable
private fun ProfileSection(state: SettingsUiState, vm: SettingsViewModel) {
    TcallTextField(state.name, vm::updateName, "Ism")
    Spacer(Modifier.height(12.dp))
    TcallTextField(state.bio, vm::updateBio, "Bio", maxLines = 3)
    Spacer(Modifier.height(16.dp))
    TcallPrimaryButton("Saqlash", onClick = vm::saveProfile, loading = state.saving)
}

@Composable
private fun PreferencesSection(state: SettingsUiState, vm: SettingsViewModel) {
    Text("Til", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
    listOf("uz" to "O'zbek", "ru" to "Rus", "en" to "Ingliz").forEach { (code, label) ->
        Row(Modifier.fillMaxWidth().clickable { vm.updateLanguage(code) }, verticalAlignment = Alignment.CenterVertically) {
            RadioButton(selected = state.language == code, onClick = { vm.updateLanguage(code) })
            Text(label)
        }
    }
    Spacer(Modifier.height(12.dp))
    Text("Tarjima rejimi", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
    listOf("text" to "Matn", "voice" to "Ovoz").forEach { (code, label) ->
        Row(Modifier.fillMaxWidth().clickable { vm.updateTranslationMode(code) }, verticalAlignment = Alignment.CenterVertically) {
            RadioButton(selected = state.translationMode == code, onClick = { vm.updateTranslationMode(code) })
            Text(label)
        }
    }
    Spacer(Modifier.height(12.dp))
    Text("Holat", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
    listOf("available" to "Mavjud", "busy" to "Band", "dnd" to "Bezovta qilmang", "away" to "Uzoqda").forEach { (code, label) ->
        Row(Modifier.fillMaxWidth().clickable { vm.updateStatus(code) }, verticalAlignment = Alignment.CenterVertically) {
            RadioButton(selected = state.status == code, onClick = { vm.updateStatus(code) })
            Text(label)
        }
    }
    Spacer(Modifier.height(16.dp))
    TcallPrimaryButton("Saqlash", onClick = vm::savePreferences, loading = state.saving)
}

@Composable
private fun PasswordSection(state: SettingsUiState, vm: SettingsViewModel) {
    TcallTextField(state.currentPassword, vm::updateCurrentPassword, "Joriy parol", visualTransformation = PasswordVisualTransformation())
    Spacer(Modifier.height(12.dp))
    TcallTextField(state.newPassword, vm::updateNewPassword, "Yangi parol", visualTransformation = PasswordVisualTransformation())
    Spacer(Modifier.height(16.dp))
    TcallPrimaryButton("Parolni yangilash", onClick = vm::savePassword, loading = state.saving)
}
