package uz.tcall.ui.onboarding

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
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
import kotlinx.coroutines.launch
import uz.tcall.ui.components.TcallLogo
import uz.tcall.ui.components.TcallLogoVariant
import uz.tcall.ui.components.TcallPrimaryButton
import uz.tcall.ui.theme.TcallColors

private data class OnboardingSlide(
    val icon: ImageVector,
    val title: String,
    val desc: String,
    val gradient: List<Color>,
)

private data class PermItem(val icon: ImageVector, val label: String, val reason: String)

private val slides = listOf(
    OnboardingSlide(
        Icons.Default.AutoAwesome,
        "Tcall ga xush kelibsiz",
        "Dunyo bilan o'z tilingizda gaplashing. 9 xonali Tcall raqamingiz bilan audio qo'ng'iroq qiling.",
        listOf(Color(0x336366F1), Color(0x1A5856D6), Color.Transparent),
    ),
    OnboardingSlide(
        Icons.Default.Language,
        "Real-time tarjima",
        "70+ til. Sherik boshqa tilda gapirsa ham, aqlli tarjima qiladi va siz o'z tilingizda eshitasiz.",
        listOf(Color(0x3334C759), Color(0x1A007AFF), Color.Transparent),
    ),
    OnboardingSlide(
        Icons.Default.Phone,
        "Qo'ng'iroq va xabar",
        "Yuqori sifatli audio qo'ng'iroq va chat — hammasi avtomatik tarjima bilan.",
        listOf(Color(0x333B82F6), Color(0x1A5856D6), Color.Transparent),
    ),
    OnboardingSlide(
        Icons.Default.Shield,
        "Xavfsiz va shaxsiy",
        "PIN qulf, yuz orqali tiklash va himoyalangan muloqot.",
        listOf(Color(0x338B5CF6), Color(0x1A6366F1), Color.Transparent),
    ),
)

private val permItems = listOf(
    PermItem(Icons.Default.Mic, "Mikrofon", "Qo'ng'iroq paytida ovozingizni uzatish uchun."),
    PermItem(Icons.Default.Notifications, "Bildirishnoma", "Qo'ng'iroq yoki xabarni o'tkazib yubormaslik uchun."),
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(onComplete: () -> Unit) {
    val totalPages = slides.size + 1
    val pagerState = rememberPagerState(pageCount = { totalPages })
    val scope = rememberCoroutineScope()
    var notifDone by remember { mutableStateOf(false) }

    val micLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { /* best effort */ }

    val notifLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) {
        notifDone = true
    }

    fun requestMic() {
        micLauncher.launch(Manifest.permission.RECORD_AUDIO)
    }

    fun requestNotif() {
        if (Build.VERSION.SDK_INT >= 33) {
            notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            notifDone = true
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(TcallColors.BgPrimary),
    ) {
        val currentGradient = if (pagerState.currentPage < slides.size) {
            slides[pagerState.currentPage].gradient
        } else {
            listOf(Color(0x33F59E0B), Color(0x1A6366F1), Color.Transparent)
        }
        Box(
            Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(currentGradient)),
        )

        Column(Modifier.fillMaxSize()) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.End,
            ) {
                if (pagerState.currentPage < totalPages - 1) {
                    TextButton(onClick = onComplete) {
                        Text("O'tish", color = TcallColors.TextSecondary, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            HorizontalPager(
                state = pagerState,
                modifier = Modifier.weight(1f),
            ) { page ->
                Column(
                    Modifier
                        .fillMaxSize()
                        .padding(horizontal = 28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    TcallLogo(variant = TcallLogoVariant.Icon, width = 64.dp)
                    Spacer(Modifier.height(28.dp))

                    if (page < slides.size) {
                        val slide = slides[page]
                        Box(
                            Modifier
                                .size(88.dp)
                                .shadow(8.dp, RoundedCornerShape(28.dp))
                                .clip(RoundedCornerShape(28.dp))
                                .background(Color.White.copy(alpha = 0.92f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(slide.icon, contentDescription = null, tint = TcallColors.Brand600, modifier = Modifier.size(40.dp))
                        }
                        Spacer(Modifier.height(24.dp))
                        Text(
                            slide.title,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.Bold,
                            color = TcallColors.TextPrimary,
                            textAlign = TextAlign.Center,
                            lineHeight = 32.sp,
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            slide.desc,
                            fontSize = 16.sp,
                            color = TcallColors.TextSecondary,
                            textAlign = TextAlign.Center,
                            lineHeight = 24.sp,
                        )
                    } else {
                        Text(
                            "Ruxsatlar nima uchun kerak",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = TcallColors.TextPrimary,
                            textAlign = TextAlign.Center,
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Tcall to'liq ishlashi uchun quyidagilarga ruxsat berasiz.",
                            fontSize = 15.sp,
                            color = TcallColors.TextSecondary,
                            textAlign = TextAlign.Center,
                        )
                        Spacer(Modifier.height(20.dp))
                        permItems.forEach { item ->
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp),
                                verticalAlignment = Alignment.Top,
                            ) {
                                Box(
                                    Modifier
                                        .size(36.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(TcallColors.Brand600.copy(alpha = 0.12f)),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(item.icon, contentDescription = null, tint = TcallColors.Brand600, modifier = Modifier.size(18.dp))
                                }
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text(item.label, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TcallColors.TextPrimary)
                                    Text(item.reason, fontSize = 13.sp, color = TcallColors.Slate500, lineHeight = 18.sp)
                                }
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                        TcallPrimaryButton("Mikrofon ruxsati", onClick = ::requestMic)
                        Spacer(Modifier.height(10.dp))
                        TcallPrimaryButton(
                            text = if (notifDone) "Bildirishnomalar yoqildi ✓" else "Bildirishnomalarni yoqish",
                            onClick = ::requestNotif,
                            enabled = !notifDone,
                        )
                    }
                }
            }

            Column(
                Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 24.dp, vertical = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    repeat(totalPages) { i ->
                        Box(
                            Modifier
                                .size(if (pagerState.currentPage == i) 10.dp else 8.dp)
                                .clip(CircleShape)
                                .background(
                                    if (pagerState.currentPage == i) TcallColors.IosBlue else Color(0x4D3C3C43),
                                ),
                        )
                    }
                }
                Spacer(Modifier.height(16.dp))
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (pagerState.currentPage > 0) {
                        TextButton(
                            onClick = {
                                scope.launch {
                                    pagerState.animateScrollToPage(pagerState.currentPage - 1)
                                }
                            },
                            modifier = Modifier.size(48.dp),
                        ) {
                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Orqaga")
                        }
                    }
                    TcallPrimaryButton(
                        text = if (pagerState.currentPage == totalPages - 1) "Boshlash" else "Keyingi",
                        onClick = {
                            if (pagerState.currentPage == totalPages - 1) {
                                onComplete()
                            } else {
                                scope.launch {
                                    pagerState.animateScrollToPage(pagerState.currentPage + 1)
                                }
                            }
                        },
                        modifier = Modifier.weight(1f),
                    )
                    if (pagerState.currentPage < totalPages - 1) {
                        Icon(
                            Icons.AutoMirrored.Filled.KeyboardArrowRight,
                            contentDescription = null,
                            tint = Color.Transparent,
                            modifier = Modifier.size(48.dp),
                        )
                    }
                }
            }
        }
    }
}
