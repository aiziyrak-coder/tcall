package uz.vizara.tcall.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import uz.vizara.tcall.data.AuthRepository
import uz.vizara.tcall.data.SessionStore
import uz.vizara.tcall.ui.auth.AuthViewModel
import uz.vizara.tcall.ui.auth.LoginScreen
import uz.vizara.tcall.ui.main.MainScreen

@Composable
fun TcallAppRoot(
    sessionStore: SessionStore,
    authRepository: AuthRepository,
) {
    val authViewModel: AuthViewModel = viewModel(
        factory = remember(authRepository) {
            object : androidx.lifecycle.ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                    return AuthViewModel(authRepository) as T
                }
            }
        }
    )

    val authState by authViewModel.state.collectAsState()

    when {
        authState.loading -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        authState.user != null -> {
            MainScreen(
                user = authState.user!!,
                onLogout = authViewModel::logout,
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
