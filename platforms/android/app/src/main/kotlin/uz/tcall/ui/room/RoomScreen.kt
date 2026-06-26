package uz.tcall.ui.room

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import uz.tcall.ui.components.TcallEmptyState

@Composable
fun RoomScreen() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        TcallEmptyState(
            title = "Xona",
            subtitle = "Xona kodi orqali qo'shilish uchun Terish bo'limidan 9 xonali ID kiriting va qo'ng'iroq qiling.",
        )
    }
}
