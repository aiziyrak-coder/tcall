package uz.tcall.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import uz.tcall.ui.components.TcallLogoIcon
import uz.tcall.ui.theme.TcallColors

@Composable
fun LoginScreen(
    submitting: Boolean,
    error: String?,
    onLogin: (email: String, password: String) -> Unit,
    onClearError: () -> Unit,
) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(TcallColors.AuthBg)
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        TcallLogoIcon(Modifier.size(56.dp))
        Text(
            text = "Tcall",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = TcallColors.TextPrimary,
            modifier = Modifier.padding(top = 12.dp),
        )
        Text(
            text = "Translate · Call · Connect",
            fontSize = 14.sp,
            color = TcallColors.Slate500,
            modifier = Modifier.padding(top = 4.dp, bottom = 28.dp),
        )

        TcallAuthCard {
            Text(
                "Kirish",
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
                color = TcallColors.TextPrimary,
            )
            Text(
                "Hisobingizga kiring",
                fontSize = 14.sp,
                color = TcallColors.Slate500,
                modifier = Modifier.padding(top = 4.dp, bottom = 20.dp),
            )

            val fieldColors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = TcallColors.IosBlue,
                unfocusedBorderColor = TcallColors.Separator,
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
            )

            OutlinedTextField(
                value = email,
                onValueChange = {
                    email = it
                    if (error != null) onClearError()
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Email") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = fieldColors,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next,
                ),
            )

            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = password,
                onValueChange = {
                    password = it
                    if (error != null) onClearError()
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Parol") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = fieldColors,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done,
                ),
                keyboardActions = KeyboardActions(
                    onDone = { if (!submitting) onLogin(email, password) },
                ),
            )

            if (!error.isNullOrBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(
                    text = error,
                    color = TcallColors.Destructive,
                    fontSize = 13.sp,
                )
            }

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = { onLogin(email, password) },
                enabled = !submitting,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = TcallColors.Brand600,
                    contentColor = Color.White,
                ),
            ) {
                if (submitting) {
                    CircularProgressIndicator(strokeWidth = 2.dp, color = Color.White, modifier = Modifier.size(22.dp))
                } else {
                    Text("Kirish", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                }
            }
        }

        Text(
            "Privacy · Terms",
            fontSize = 12.sp,
            color = TcallColors.Slate400,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 20.dp),
        )
    }
}
