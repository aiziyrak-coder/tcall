package uz.tcall.ui.applock

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import uz.tcall.data.PinRepository
import uz.tcall.data.PinUnlockStore
import uz.tcall.ui.components.TcallPrimaryButton
import uz.tcall.ui.splash.CosmicBrandTitle
import uz.tcall.ui.theme.GlassLevel
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.TcallGlassSurface

private fun isAuthError(message: String?): Boolean {
    val m = message.orEmpty()
    return m.contains("Avtorizatsiya", ignoreCase = true) ||
        m.contains("Ruxsat yo'q", ignoreCase = true)
}

@Composable
fun AppLockGate(
    pinRepository: PinRepository,
    onReLogin: () -> Unit = {},
    content: @Composable () -> Unit,
) {
    var checking by remember { mutableStateOf(true) }
    var pinEnabled by remember { mutableStateOf(false) }
    var unlocked by remember { mutableStateOf(PinUnlockStore.unlockedThisSession) }
    var gateError by remember { mutableStateOf<String?>(null) }

    fun finishCheck(enabled: Boolean, allowUnlocked: Boolean) {
        pinEnabled = enabled
        if (PinUnlockStore.unlockedThisSession || allowUnlocked) {
            unlocked = true
        }
        checking = false
    }

    LaunchedEffect(Unit) {
        if (PinUnlockStore.unlockedThisSession) {
            checking = false
            unlocked = true
            return@LaunchedEffect
        }
        try {
            withTimeout(8_000) {
                var lastError: String? = null
                repeat(3) { attempt ->
                    pinRepository.status()
                        .onSuccess { status ->
                            finishCheck(status.enabled == true, status.enabled != true)
                            return@withTimeout
                        }
                        .onFailure { e ->
                            lastError = e.message ?: "PIN holati yuklanmadi"
                            if (attempt < 2 && !isAuthError(lastError)) {
                                kotlinx.coroutines.delay(400L * (attempt + 1))
                            }
                        }
                }
                gateError = lastError
                finishCheck(enabled = false, allowUnlocked = !isAuthError(lastError))
            }
        } catch (_: Exception) {
            finishCheck(enabled = false, allowUnlocked = true)
        }
    }

    when {
        checking -> Box(
            Modifier.fillMaxSize().background(TcallColors.BgPrimary),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator(color = TcallColors.IosBlue)
        }
        gateError != null && isAuthError(gateError) -> {
            Box(
                Modifier.fillMaxSize().background(TcallColors.BgPrimary),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    Modifier.fillMaxWidth().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    CosmicBrandTitle(compact = true, animate = false)
                    Spacer(Modifier.height(20.dp))
                    Text(
                        gateError ?: "Sessiya tugagan",
                        color = TcallColors.Destructive,
                        textAlign = TextAlign.Center,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Spacer(Modifier.height(20.dp))
                    TcallPrimaryButton("Qayta kirish", onClick = onReLogin)
                }
            }
        }
        pinEnabled && !unlocked -> PinUnlockScreen(
            pinRepository = pinRepository,
            onUnlocked = {
                PinUnlockStore.markUnlocked()
                unlocked = true
            },
            onReLogin = onReLogin,
        )
        else -> content()
    }
}

@Composable
fun PinUnlockScreen(
    pinRepository: PinRepository,
    onUnlocked: () -> Unit,
    onReLogin: () -> Unit = {},
    title: String = "PIN kiriting",
) {
    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun submit() {
        if (pin.length < 4 || loading) return
        scope.launch {
            loading = true
            error = null
            pinRepository.verify(pin)
                .onSuccess { onUnlocked() }
                .onFailure { e ->
                    val msg = e.message.orEmpty()
                    error = if (isAuthError(msg)) {
                        "Sessiya tugagan. Qayta kiring."
                    } else {
                        msg.ifBlank { "PIN noto'g'ri" }
                    }
                    pin = ""
                }
            loading = false
        }
    }

    Box(Modifier.fillMaxSize().background(TcallColors.BgPrimary)) {
        Column(
            Modifier.fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            CosmicBrandTitle(compact = true, animate = false)
            Spacer(Modifier.height(24.dp))
            Text(title, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TcallColors.TextPrimary)
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                repeat(4) { i ->
                    Box(
                        Modifier
                            .size(14.dp)
                            .clip(CircleShape)
                            .background(if (i < pin.length) TcallColors.IosBlue else TcallColors.Separator),
                    )
                }
            }
            error?.let {
                Text(it, color = TcallColors.Destructive, fontSize = 13.sp, modifier = Modifier.padding(top = 12.dp))
            }
            if (loading) CircularProgressIndicator(Modifier.padding(top = 16.dp), color = TcallColors.IosBlue)
            Spacer(Modifier.height(28.dp))
            PinKeypad(
                onDigit = { d ->
                    if (pin.length < 4 && !loading) {
                        pin += d
                        if (pin.length == 4) submit()
                    }
                },
                onDelete = { if (pin.isNotEmpty() && !loading) pin = pin.dropLast(1) },
            )
            if (error != null && (isAuthError(error) || error.orEmpty().contains("Sessiya tugagan"))) {
                Spacer(Modifier.height(16.dp))
                TextButton(onClick = onReLogin) {
                    Text("Qayta kirish", color = TcallColors.IosBlue, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
fun PinKeypad(onDigit: (String) -> Unit, onDelete: () -> Unit) {
    val rows = listOf(
        listOf("1", "2", "3"),
        listOf("4", "5", "6"),
        listOf("7", "8", "9"),
        listOf("", "0", "del"),
    )
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        rows.forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                row.forEach { key ->
                    when (key) {
                        "" -> Spacer(Modifier.size(64.dp))
                        "del" -> PinKey("⌫", onDelete)
                        else -> PinKey(key) { onDigit(key) }
                    }
                }
            }
        }
    }
}

@Composable
private fun PinKey(label: String, onClick: () -> Unit) {
    TcallGlassSurface(
        modifier = Modifier
            .size(64.dp)
            .clip(CircleShape)
            .clickable(onClick = onClick),
        level = GlassLevel.Button,
        shape = CircleShape,
        elevation = 2.dp,
    ) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            if (label == "⌫") {
                Icon(Icons.Default.Backspace, null, tint = TcallColors.TextPrimary)
            } else {
                Text(label, fontSize = 24.sp, fontWeight = FontWeight.Medium, color = TcallColors.TextPrimary)
            }
        }
    }
}
