package uz.tcall.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import uz.tcall.core.TcallServices
import uz.tcall.data.AuthRepository
import uz.tcall.data.SessionStore
import uz.tcall.push.PushRegistrar
import uz.tcall.ui.applock.AppLockGate
import uz.tcall.ui.auth.AuthScreen
import uz.tcall.ui.auth.AuthViewModel
import uz.tcall.ui.auth.ForgotPasswordScreen
import uz.tcall.ui.auth.LoginScreen
import uz.tcall.ui.auth.RegisterScreen
import uz.tcall.ui.main.MainScreen
import uz.tcall.ui.onboarding.OnboardingScreen
import uz.tcall.ui.splash.AppSplashScreen

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
        factory = remember(authRepository, services.appPreferences) {
            object : androidx.lifecycle.ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                    return AuthViewModel(authRepository, services.appPreferences) as T
                }
            }
        },
    )

    val authState by authViewModel.state.collectAsState()
    var onboardingDone by remember { mutableStateOf<Boolean?>(null) }
    var rememberedEmail by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        onboardingDone = services.appPreferences.onboardingComplete.first()
        rememberedEmail = services.appPreferences.rememberedEmail.first().orEmpty()
    }

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
        authState.loading || onboardingDone == null -> {
            AppSplashScreen(message = "Tcall")
        }
        authState.user != null -> {
            AppLockGate(pinRepository = services.pinRepository) {
                MainScreen(
                    user = authState.user!!,
                    services = services,
                    onLogout = authViewModel::logout,
                    initialRoomId = initialRoomId,
                    initialConversationId = initialConversationId,
                )
            }
        }
        onboardingDone == false -> {
            OnboardingScreen(
                onComplete = {
                    scope.launch {
                        services.appPreferences.completeOnboarding()
                        onboardingDone = true
                    }
                },
            )
        }
        else -> when (authState.screen) {
            AuthScreen.REGISTER -> RegisterScreen(
                submitting = authState.submitting,
                error = authState.error,
                onRegister = authViewModel::register,
                onClearError = authViewModel::clearError,
                onLogin = authViewModel::showLogin,
            )
            AuthScreen.FORGOT_PASSWORD -> ForgotPasswordScreen(
                submitting = authState.submitting,
                error = authState.error,
                info = authState.info,
                initialEmail = rememberedEmail,
                onSubmit = authViewModel::forgotPassword,
                onClearError = authViewModel::clearError,
                onLogin = authViewModel::showLogin,
            )
            AuthScreen.LOGIN -> LoginScreen(
                submitting = authState.submitting,
                error = authState.error,
                initialEmail = rememberedEmail,
                onLogin = authViewModel::login,
                onClearError = authViewModel::clearError,
                onRegister = authViewModel::showRegister,
                onForgotPassword = authViewModel::showForgotPassword,
            )
        }
    }
}
