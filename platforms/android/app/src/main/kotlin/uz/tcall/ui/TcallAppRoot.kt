package uz.tcall.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch
import uz.tcall.core.TcallServices
import uz.tcall.data.AuthRepository
import uz.tcall.data.SessionStore
import uz.tcall.push.PushRegistrar
import uz.tcall.ui.auth.AuthViewModel
import uz.tcall.ui.auth.LoginScreen
import uz.tcall.ui.main.MainScreen

@Composable
fun TcallAppRoot(
    sessionStore: SessionStore,
    authRepository: AuthRepository,
    initialRoomId: String? = null,
    initialConversationId: String? = null,
) {
    val context = LocalContext.current
    val services = remember { TcallServices.get(context) }

    val authViewModel: AuthViewModel = viewModel(
        factory = remember(authRepository) {
            object : androidx.lifecycle.ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                    return AuthViewModel(authRepository) as T
                }
            }
        },
    )

    val authState by authViewModel.state.collectAsState()

    LaunchedEffect(authState.user, authState.token) {
        val token = authState.token ?: sessionStore.getTokenSync()
        val user = authState.user
        if (!token.isNullOrBlank() && user != null) {
            services.socketManager.connect(token)
            launch { PushRegistrar.registerIfPossible(services.apiClient.api, context) }
        } else if (user == null && !authState.loading) {
            services.socketManager.disconnect()
        }
    }

    when {
        authState.loading -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        authState.user != null -> {
            MainScreen(
                user = authState.user!!,
                services = services,
                onLogout = authViewModel::logout,
                initialRoomId = initialRoomId,
                initialConversationId = initialConversationId,
            )
        }
        else -> {
            LoginScreen(
                submitting = authState.submitting,
                error = authState.error,
                onLogin = authViewModel::login,
                onClearError = authViewModel::clearError,
            )
        }
    }
}
