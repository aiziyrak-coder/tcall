package uz.tcall.ui.settings

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CardMembership
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.GroupAdd
import androidx.compose.material.icons.filled.HeadsetMic
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import uz.tcall.BuildConfig
import uz.tcall.push.PushRegistrar
import uz.tcall.ui.components.FaceScanButton
import uz.tcall.ui.components.GradientPrimaryButton
import uz.tcall.ui.components.IosCenterModal
import uz.tcall.ui.components.IosIconButton
import uz.tcall.ui.components.ModalScrollColumn
import uz.tcall.ui.components.LanguagePickerRow
import uz.tcall.ui.components.LanguagePickerSheet
import uz.tcall.ui.components.TcallAvatar
import uz.tcall.ui.components.TcallPrimaryButton
import uz.tcall.ui.components.TcallTextField
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.formatTcallId
import java.io.File
import java.io.FileOutputStream

private fun openExternalUrl(context: android.content.Context, url: String) {
    runCatching {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    }
}

@Composable
fun SettingsModal(
    open: Boolean,
    viewModel: SettingsViewModel,
    ui: TcallUiStrings,
    onClose: () -> Unit,
    onLogout: () -> Unit,
    onOpenSubscription: () -> Unit = {},
    onOpenInvite: () -> Unit = {},
    onOpenSupport: () -> Unit = {},
) {
    if (!open) return
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    androidx.compose.runtime.LaunchedEffect(open) {
        if (open) viewModel.ensureLoaded()
    }

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
                    SettingsSection.PROFILE_DETAILS -> ui.profileDetails
                    SettingsSection.PREFERENCES -> ui.preferences
                    SettingsSection.NOTIFICATIONS -> ui.notifications
                    SettingsSection.PASSWORD -> ui.changePassword
                    SettingsSection.PIN -> "PIN qulf"
                    SettingsSection.SECURITY -> "Xavfsizlik"
                }
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    if (state.section != SettingsSection.OVERVIEW) {
                        IosIconButton(Icons.AutoMirrored.Filled.ArrowBack, { viewModel.navigate(SettingsSection.OVERVIEW) })
                    }
                    Text(title, fontWeight = FontWeight.Bold, fontSize = 20.sp, modifier = Modifier.weight(1f))
                    IosIconButton(Icons.Default.Close, onClose)
                }
                Spacer(Modifier.height(12.dp))
                ModalScrollColumn {
                    when (state.section) {
                        SettingsSection.OVERVIEW -> SettingsOverview(state, ui, viewModel::navigate, onOpenSubscription, onOpenInvite, onOpenSupport)
                        SettingsSection.PROFILE -> ProfileSection(state, viewModel, ui, context)
                        SettingsSection.PROFILE_DETAILS -> ProfileDetailsSection(state, viewModel, ui)
                        SettingsSection.PREFERENCES -> PreferencesSection(state, viewModel, ui)
                        SettingsSection.NOTIFICATIONS -> NotificationsSection(state, viewModel, ui, context)
                        SettingsSection.PASSWORD -> PasswordSection(state, viewModel, ui)
                        SettingsSection.PIN -> PinSection(state, viewModel)
                        SettingsSection.SECURITY -> SecuritySection(state, viewModel, ui, onLogout, context)
                    }
                    state.error?.let { Text(it, color = TcallColors.Destructive, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp)) }
                    if (state.saved) Text("✓ ${ui.save}", color = TcallColors.CallGreen, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
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
    onOpenSubscription: () -> Unit,
    onOpenInvite: () -> Unit,
    onOpenSupport: () -> Unit,
) {
    val user = state.user
    if (user == null) {
        Text("Profil yuklanmadi", color = TcallColors.Destructive, modifier = Modifier.padding(16.dp))
        return
    }
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        TcallAvatar(user.name.orEmpty(), size = 72.dp, avatarUrl = state.avatarUrl)
        Text(user.name.orEmpty(), fontWeight = FontWeight.Bold, fontSize = 20.sp, modifier = Modifier.padding(top = 10.dp))
        Text(user.email.orEmpty(), color = TcallColors.Slate500, fontSize = 13.sp, fontFamily = FontFamily.Monospace)
        user.tcallId?.let {
            Text("${ui.yourNumberLabel}: ${formatTcallId(it)}", color = TcallColors.IosBlue, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp))
        }
    }
    Spacer(Modifier.height(16.dp))
    SettingsRow(Icons.Default.Person, ui.myData, ui.myDataHint) { navigate(SettingsSection.PROFILE) }
    SettingsRow(Icons.Default.Person, ui.profileDetails, ui.profileDetailsHint) { navigate(SettingsSection.PROFILE_DETAILS) }
    SettingsRow(Icons.Default.Tune, ui.preferences, ui.preferencesHint) { navigate(SettingsSection.PREFERENCES) }
    SettingsRow(Icons.Default.Notifications, ui.notifications, ui.notificationsHint) { navigate(SettingsSection.NOTIFICATIONS) }
    SettingsRow(Icons.Default.Key, ui.changePassword, ui.changePasswordHint) { navigate(SettingsSection.PASSWORD) }
    SettingsRow(Icons.Default.Lock, "PIN qulf", "Ilovani himoyalash") { navigate(SettingsSection.PIN) }
    SettingsRow(Icons.Default.CardMembership, "Obuna", "Premium rejalar", onOpenSubscription)
    SettingsRow(Icons.Default.HeadsetMic, ui.support, ui.supportSubtitle, onOpenSupport)
    SettingsRow(Icons.Default.GroupAdd, "Do'stlarni taklif", "Referral havola", onOpenInvite)
    SettingsRow(Icons.Default.Shield, "Xavfsizlik", "Hisob, chiqish va o'chirish") { navigate(SettingsSection.SECURITY) }
}

@Composable
private fun SettingsRow(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 4.dp).clip(RoundedCornerShape(14.dp)).background(TcallColors.SurfaceElevated)
            .border(1.dp, TcallColors.BorderLight, RoundedCornerShape(14.dp)).clickable(onClick = onClick).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = TcallColors.Brand600, modifier = Modifier.size(22.dp))
        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = TcallColors.TextPrimary)
            Text(subtitle, fontSize = 12.sp, color = TcallColors.TextSecondary, lineHeight = 16.sp)
        }
        Icon(Icons.Default.ChevronRight, null, tint = TcallColors.TextMuted, modifier = Modifier.size(20.dp))
    }
}

@Composable
private fun ProfileSection(state: SettingsUiState, vm: SettingsViewModel, ui: TcallUiStrings, context: android.content.Context) {
    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri ?: return@rememberLauncherForActivityResult
        runCatching {
            val file = File(context.cacheDir, "avatar_${System.currentTimeMillis()}.jpg")
            context.contentResolver.openInputStream(uri)?.use { input ->
                FileOutputStream(file).use { output -> input.copyTo(output) }
            }
            vm.uploadAvatar(file, "image/jpeg", "avatar.jpg")
        }
    }
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        TcallAvatar(state.name, size = 80.dp, avatarUrl = state.avatarUrl)
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TcallPrimaryButton(if (state.uploadingAvatar) "..." else "Rasm yuklash", onClick = { imagePicker.launch("image/*") })
            if (state.avatarUrl != null) {
                TcallPrimaryButton("O'chirish", onClick = vm::removeAvatar)
            }
        }
    }
    Spacer(Modifier.height(14.dp))
    TcallTextField(state.name, vm::updateName, ui.myData)
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.bio, vm::updateBio, "Holat xabari", maxLines = 3)
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.about, vm::updateAbout, "O'zim haqimda", maxLines = 4)
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.interests, vm::updateInterests, "Qiziqishlar", maxLines = 3)
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.skills, vm::updateSkills, "Ko'nikmalar", maxLines = 3)
    Spacer(Modifier.height(14.dp))
    GradientPrimaryButton(ui.save, onClick = vm::saveMyInfo, loading = state.saving)
}

@Composable
private fun ProfileDetailsSection(state: SettingsUiState, vm: SettingsViewModel, ui: TcallUiStrings) {
    TcallTextField(state.age, vm::updateAge, "Yosh")
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.city, vm::updateCity, "Shahar")
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.country, vm::updateCountry, "Mamlakat")
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.address, vm::updateAddress, "Manzil", maxLines = 2)
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.workplace, vm::updateWorkplace, "Ish joyi")
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.education, vm::updateEducation, "Ta'lim")
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.graduatedFrom, vm::updateGraduatedFrom, "Bitirgan joyi")
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.profession, vm::updateProfession, "Kasb")
    Spacer(Modifier.height(14.dp))
    GradientPrimaryButton(ui.save, onClick = vm::saveProfileDetails, loading = state.saving)
}

@Composable
private fun PreferencesSection(state: SettingsUiState, vm: SettingsViewModel, ui: TcallUiStrings) {
    var langPickerOpen by remember { mutableStateOf(false) }
    LanguagePickerRow(label = "Til", selected = state.language, onClick = { langPickerOpen = true })
    if (langPickerOpen) {
        LanguagePickerSheet("Til", state.language, vm::updateLanguage) { langPickerOpen = false }
    }
    Spacer(Modifier.height(14.dp))
    Text("Tarjima rejimi", fontWeight = FontWeight.SemiBold, color = TcallColors.TextPrimary)
    ChoiceRow("Matn", state.translationMode == "text") { vm.updateTranslationMode("text") }
    ChoiceRow("Ovoz", state.translationMode == "voice") { vm.updateTranslationMode("voice") }
    Spacer(Modifier.height(14.dp))
    Text("Holat", fontWeight = FontWeight.SemiBold, color = TcallColors.TextPrimary)
    ChoiceRow("Mavjud", state.status == "available") { vm.updateStatus("available") }
    ChoiceRow("Band", state.status == "busy") { vm.updateStatus("busy") }
    ChoiceRow("Bezovta qilinmasin", state.status == "dnd") { vm.updateStatus("dnd") }
    ChoiceRow("Uzoqda", state.status == "away") { vm.updateStatus("away") }
    Spacer(Modifier.height(14.dp))
    TcallTextField(state.telegram, vm::updateTelegram, "Telegram @username")
    Spacer(Modifier.height(14.dp))
    GradientPrimaryButton(ui.save, onClick = vm::savePreferences, loading = state.saving)
}

@Composable
private fun ChoiceRow(label: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(if (selected) "●" else "○", color = TcallColors.IosBlue, modifier = Modifier.padding(end = 10.dp))
        Text(label, color = TcallColors.TextPrimary)
    }
}

@Composable
private fun PasswordSection(state: SettingsUiState, vm: SettingsViewModel, ui: TcallUiStrings) {
    TcallTextField(state.currentPassword, vm::updateCurrentPassword, "Joriy parol", visualTransformation = PasswordVisualTransformation())
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.newPassword, vm::updateNewPassword, "Yangi parol", visualTransformation = PasswordVisualTransformation())
    Spacer(Modifier.height(10.dp))
    TcallTextField(state.confirmPassword, vm::updateConfirmPassword, "Yangi parolni tasdiqlang", visualTransformation = PasswordVisualTransformation())
    Spacer(Modifier.height(14.dp))
    GradientPrimaryButton(ui.changePassword, onClick = vm::savePassword, loading = state.saving)
}

@Composable
private fun NotificationsSection(state: SettingsUiState, vm: SettingsViewModel, ui: TcallUiStrings, context: android.content.Context) {
    val scope = rememberCoroutineScope()
    val notifPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) {
            scope.launch(Dispatchers.IO) {
                PushRegistrar.registerIfPossible(uz.tcall.core.TcallServices.get(context).apiClient.api, context)
            }
        }
    }
    SettingsCard {
        Text(ui.notifications, fontWeight = FontWeight.SemiBold, color = TcallColors.TextPrimary)
        Text(ui.notificationsHint, fontSize = 12.sp, color = TcallColors.TextSecondary, modifier = Modifier.padding(top = 4.dp))
        Spacer(Modifier.height(10.dp))
        GradientPrimaryButton("Bildirishnomalarni yoqish", onClick = {
            if (Build.VERSION.SDK_INT >= 33) {
                notifPermission.launch(android.Manifest.permission.POST_NOTIFICATIONS)
            }
        })
    }
    Spacer(Modifier.height(12.dp))
    SettingsCard {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Telegram bildirishnomalari", fontWeight = FontWeight.SemiBold, color = TcallColors.TextPrimary)
            if (state.telegramStatus?.linked == true) {
                Text("Ulangan", color = TcallColors.CallGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
        Text("Qo'ng'iroq va xabarlar haqida Telegramga bildirishnoma.", fontSize = 12.sp, color = TcallColors.TextSecondary, modifier = Modifier.padding(top = 4.dp))
        Spacer(Modifier.height(10.dp))
        when {
            state.telegramStatus?.configured == false -> Text("Telegram bot tez orada faollashadi.", fontSize = 12.sp, color = TcallColors.Destructive)
            state.telegramStatus?.linked == true -> GradientPrimaryButton("Telegramni uzish", onClick = vm::disconnectTelegram, loading = state.telegramBusy)
            else -> GradientPrimaryButton("Telegramni ulash", onClick = {
                vm.connectTelegram { url -> openExternalUrl(context, url) }
            }, loading = state.telegramBusy)
        }
    }
}

@Composable
private fun PinSection(state: SettingsUiState, vm: SettingsViewModel) {
    if (state.pinLoading) {
        CircularProgressIndicator(Modifier.padding(16.dp))
        return
    }
    SettingsCard {
        Text("Ilova qulfi", fontWeight = FontWeight.SemiBold)
        Text("Telegram'dagidek — 4 xonali PIN bilan himoyalang.", fontSize = 12.sp, color = TcallColors.TextSecondary, modifier = Modifier.padding(top = 4.dp))
        if (state.pinEnabled) {
            Text("Yoqilgan", color = TcallColors.CallGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 6.dp))
        }
    }
    Spacer(Modifier.height(12.dp))
    if (!state.pinEnabled) {
        TcallTextField(state.pinInput, vm::updatePinInput, "Yangi PIN (4 raqam)")
        Spacer(Modifier.height(10.dp))
        TcallTextField(state.pinConfirm, vm::updatePinConfirm, "PIN takrori")
        Spacer(Modifier.height(14.dp))
        FaceScanButton(
            scanned = !state.pinFaceImage.isNullOrBlank(),
            onImageCaptured = vm::updatePinFaceImage,
        )
        Spacer(Modifier.height(14.dp))
        GradientPrimaryButton("PIN o'rnatish", onClick = vm::savePin, loading = state.saving)
    } else {
        TcallTextField(state.pinCurrent, vm::updatePinCurrent, "Joriy PIN")
        Spacer(Modifier.height(10.dp))
        TcallTextField(state.pinInput, vm::updatePinInput, "Yangi PIN")
        Spacer(Modifier.height(10.dp))
        TcallTextField(state.pinConfirm, vm::updatePinConfirm, "Yangi PIN takrori")
        Spacer(Modifier.height(14.dp))
        GradientPrimaryButton("PINni o'zgartirish", onClick = vm::changePin, loading = state.saving)
        Spacer(Modifier.height(12.dp))
        GradientPrimaryButton("PINni o'chirish", onClick = vm::disablePin, loading = state.saving)
    }
}

@Composable
private fun SecuritySection(
    state: SettingsUiState,
    vm: SettingsViewModel,
    ui: TcallUiStrings,
    onLogout: () -> Unit,
    context: android.content.Context,
) {
    val user = state.user
    SettingsCard {
        Text("Hisob ma'lumotlari", fontWeight = FontWeight.SemiBold)
        InfoRow(ui.myData, user?.name.orEmpty())
        InfoRow("Email", user?.email.orEmpty())
        InfoRow(ui.yourNumberLabel, user?.tcallId?.let { formatTcallId(it) }.orEmpty())
    }
    Spacer(Modifier.height(12.dp))
    SettingsCard {
        Text("Huquqiy", fontWeight = FontWeight.SemiBold)
        Text("Maxfiylik siyosati", modifier = Modifier.fillMaxWidth().clickable {
            openExternalUrl(context, "${BuildConfig.WEB_BASE_URL}/privacy")
        }.padding(vertical = 8.dp), color = TcallColors.IosBlue)
        Text("Foydalanish shartlari", modifier = Modifier.fillMaxWidth().clickable {
            openExternalUrl(context, "${BuildConfig.WEB_BASE_URL}/terms")
        }.padding(vertical = 8.dp), color = TcallColors.IosBlue)
    }
    Spacer(Modifier.height(12.dp))
    SettingsCard {
        Text(ui.logout, fontWeight = FontWeight.SemiBold, color = TcallColors.Destructive)
        Text("Tasdiqlash uchun CHIQISH yozing", fontSize = 12.sp, color = TcallColors.TextSecondary)
        Spacer(Modifier.height(8.dp))
        TcallTextField(state.logoutConfirm, vm::updateLogoutConfirm, "CHIQISH")
        Spacer(Modifier.height(10.dp))
        GradientPrimaryButton(ui.logout, onClick = {
            if (state.logoutConfirm.trim().equals("CHIQISH", ignoreCase = true)) onLogout()
        })
    }
    Spacer(Modifier.height(12.dp))
    SettingsCard {
        Text("Hisobni o'chirish", fontWeight = FontWeight.SemiBold, color = TcallColors.Destructive)
        if (!state.deleteOpen) {
            Spacer(Modifier.height(8.dp))
            GradientPrimaryButton("Hisobni butunlay o'chirish", onClick = { vm.setDeleteOpen(true) })
        } else {
            Text("Bu amal qaytarib bo'lmaydi. Parolingizni kiriting.", fontSize = 12.sp, color = TcallColors.TextSecondary, modifier = Modifier.padding(top = 6.dp))
            Spacer(Modifier.height(8.dp))
            TcallTextField(state.deletePassword, vm::updateDeletePassword, "Parol", visualTransformation = PasswordVisualTransformation())
            Spacer(Modifier.height(10.dp))
            GradientPrimaryButton("Ha, o'chirish", onClick = { vm.deleteAccount(onLogout) }, loading = state.saving)
        }
    }
}

@Composable
private fun SettingsCard(content: @Composable () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(TcallColors.SurfaceElevated)
            .border(1.dp, Color(0x0F000000), RoundedCornerShape(14.dp)).padding(14.dp),
    ) { content() }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 13.sp, color = TcallColors.TextSecondary)
        Text(value, fontSize = 13.sp, color = TcallColors.TextPrimary, fontWeight = FontWeight.Medium)
    }
}
