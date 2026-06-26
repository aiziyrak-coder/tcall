package uz.tcall

import android.app.Application
import uz.tcall.core.TcallServices
import uz.tcall.data.AuthRepository
import uz.tcall.data.SessionStore
import uz.tcall.network.ApiClient

class TcallApplication : Application() {
    private val services by lazy { TcallServices.get(this) }

    val sessionStore: SessionStore
        get() = services.sessionStore

    val apiClient: ApiClient
        get() = services.apiClient

    val authRepository: AuthRepository
        get() = services.apiClient.authRepository
}
