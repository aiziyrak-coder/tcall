package uz.tcall.ui.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
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
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.components.TcallAuthCard
import uz.tcall.ui.components.TcallLogo
import uz.tcall.ui.components.TcallLogoLayout
import uz.tcall.ui.components.TcallLogoVariant
import uz.tcall.ui.components.TcallPrimaryButton
import uz.tcall.ui.components.TcallTextField
import uz.tcall.ui.theme.TcallColors

@Composable
fun LoginScreen(
    submitting: Boolean,
    error: String?,
    initialEmail: String = "",
    onLogin: (email: String, password: String, remember: Boolean) -> Unit,
    onClearError: () -> Unit,
) {
    var email by rememberSaveable(initialEmail) { mutableStateOf(initialEmail) }
    var password by rememberSaveable { mutableStateOf("") }
    var rememberMe by rememberSaveable { mutableStateOf(true) }
    var visible by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(Unit) { visible = true }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(TcallColors.AuthBg)
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        AnimatedVisibility(
            visible = visible,
            enter = fadeIn() + slideInVertically { it / 4 },
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                TcallLogo(
                    variant = TcallLogoVariant.Full,
                    layout = TcallLogoLayout.Horizontal,
                    width = 200.dp,
                    elevatedPlate = true,
                    title = "Kirish",
                    subtitle = "Hisobingizga kiring",
                )
            }
        }

        Spacer(Modifier.height(24.dp))

        AnimatedVisibility(visible = visible, enter = fadeIn()) {
            TcallAuthCard {
                if (!error.isNullOrBlank()) {
                    Text(
                        text = error,
                        color = TcallColors.Destructive,
                        fontSize = 13.sp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp)
                            .background(TcallColors.Destructive.copy(alpha = 0.08f), RoundedCornerShape(10.dp))
                            .padding(12.dp),
                    )
                }

                TcallTextField(
                    value = email,
                    onValueChange = {
                        email = it.trim()
                        if (error != null) onClearError()
                    },
                    label = "Email",
                    placeholder = "ali@example.com",
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next,
                    ),
                )

                Spacer(Modifier.height(12.dp))

                TcallTextField(
                    value = password,
                    onValueChange = {
                        password = it
                        if (error != null) onClearError()
                    },
                    label = "Parol",
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done,
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = {
                            if (!submitting) onLogin(email, password, rememberMe)
                        },
                    ),
                )

                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Checkbox(
                        checked = rememberMe,
                        onCheckedChange = { rememberMe = it },
                        colors = CheckboxDefaults.colors(
                            checkedColor = TcallColors.Brand600,
                            uncheckedColor = TcallColors.Slate400,
                        ),
                    )
                    Text("Eslab qolish", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color(0xFF334155))
                }

                Spacer(Modifier.height(20.dp))

                TcallPrimaryButton(
                    text = if (submitting) "Kirish..." else "Kirish",
                    onClick = { onLogin(email, password, rememberMe) },
                    loading = submitting,
                )
            }
        }

        Text(
            "Translate · Call · Connect",
            fontSize = 12.sp,
            color = TcallColors.Slate400,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 20.dp),
        )
    }
}
