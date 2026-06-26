package uz.tcall.ui.friends

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import uz.tcall.ui.components.TcallEmptyState

@Composable
fun FriendsScreen() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        TcallEmptyState(
            title = "Do'stlar",
            subtitle = "Do'stlar ro'yxati va qidiruv tez orada qo'shiladi — web ilovadagi kabi.",
        )
    }
}
