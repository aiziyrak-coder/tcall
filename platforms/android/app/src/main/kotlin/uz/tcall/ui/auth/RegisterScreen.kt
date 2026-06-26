package uz.tcall.ui.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.components.GradientPrimaryButton
import uz.tcall.ui.components.TcallAuthCard
import uz.tcall.ui.components.TcallLogo
import uz.tcall.ui.components.TcallLogoLayout
import uz.tcall.ui.components.TcallLogoVariant
import uz.tcall.ui.components.TcallTextField
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.util.TCALL_LANGUAGES

@Composable
fun RegisterScreen(
    submitting: Boolean,
    error: String?,
    onRegister: (email: String, password: String, name: String, language: String) -> Unit,
    onClearError: () -> Unit,
    onLogin: () -> Unit,
) {
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var language by rememberSaveable { mutableStateOf("uz") }
    var visible by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }

    AuthScaffold(
        visible = visible,
        title = "Ro'yxatdan o'tish",
        subtitle = "Tilingizni tanlang — tarjima shu tilga bo'ladi",
    ) {
        TcallAuthCard {
            error?.let {
                AuthError(it)
            }
            TcallTextField(name, { name = it; onClearError() }, "Ismingiz", placeholder = "Ali Valiyev")
            Spacer(Modifier.height(10.dp))
            TcallTextField(email, { email = it.trim(); onClearError() }, "Email", placeholder = "ali@example.com")
            Spacer(Modifier.height(10.dp))
            TcallTextField(password, { password = it; onClearError() }, "Parol")
            Spacer(Modifier.height(12.dp))
            Text("Til", fontWeight = FontWeight.SemiBold, color = TcallColors.TextPrimary, fontSize = 14.sp)
            TCALL_LANGUAGES.take(6).forEach { lang ->
                Row(
                    Modifier.fillMaxWidth().clickable { language = lang.code }.padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        if (language == lang.code) "●" else "○",
                        color = if (language == lang.code) TcallColors.IosBlue else TcallColors.TextMuted,
                        modifier = Modifier.padding(end = 8.dp),
                    )
                    Text(lang.label, color = TcallColors.TextPrimary, fontWeight = FontWeight.Medium)
                }
            }
            Spacer(Modifier.height(16.dp))
            GradientPrimaryButton(
                text = if (submitting) "..." else "Ro'yxatdan o'tish",
                onClick = { onRegister(email, password, name, language) },
                loading = submitting,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                "Hisobingiz bormi? Kirish",
                modifier = Modifier.fillMaxWidth().clickable(onClick = onLogin),
                textAlign = TextAlign.Center,
                color = TcallColors.IosBlue,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
fun ForgotPasswordScreen(
    submitting: Boolean,
    error: String?,
    info: String?,
    initialEmail: String = "",
    onSubmit: (String) -> Unit,
    onClearError: () -> Unit,
    onLogin: () -> Unit,
) {
    var email by rememberSaveable(initialEmail) { mutableStateOf(initialEmail) }
    var visible by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }

    AuthScaffold(
        visible = visible,
        title = "Parolni tiklash",
        subtitle = "Email manzilingizga tiklash havolasi yuboriladi",
    ) {
        TcallAuthCard {
            error?.let { AuthError(it) }
            info?.let {
                Text(it, color = TcallColors.CallGreen, fontSize = 13.sp, modifier = Modifier.padding(bottom = 12.dp))
            }
            TcallTextField(email, { email = it.trim(); onClearError() }, "Email", placeholder = "ali@example.com")
            Spacer(Modifier.height(16.dp))
            GradientPrimaryButton(
                text = if (submitting) "..." else "Yuborish",
                onClick = { onSubmit(email) },
                loading = submitting,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                "Kirish sahifasiga qaytish",
                modifier = Modifier.fillMaxWidth().clickable(onClick = onLogin),
                textAlign = TextAlign.Center,
                color = TcallColors.IosBlue,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun AuthScaffold(
    visible: Boolean,
    title: String,
    subtitle: String,
    content: @Composable () -> Unit,
) {
    Column(
        Modifier
            .fillMaxSize()
            .background(TcallColors.AuthBg)
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        AnimatedVisibility(visible, enter = fadeIn() + slideInVertically { it / 4 }) {
            TcallLogo(
                variant = TcallLogoVariant.Full,
                layout = TcallLogoLayout.Horizontal,
                width = 200.dp,
                elevatedPlate = true,
                title = title,
                subtitle = subtitle,
            )
        }
        Spacer(Modifier.height(24.dp))
        AnimatedVisibility(visible, enter = fadeIn()) { content() }
    }
}

@Composable
private fun AuthError(message: String) {
    Text(
        message,
        color = TcallColors.Destructive,
        fontSize = 13.sp,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp)
            .background(TcallColors.Destructive.copy(alpha = 0.08f), RoundedCornerShape(10.dp))
            .padding(12.dp),
    )
}
