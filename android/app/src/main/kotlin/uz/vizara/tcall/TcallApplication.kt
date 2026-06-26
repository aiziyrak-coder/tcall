package uz.vizara.tcall

import android.app.Application
import uz.vizara.tcall.data.SessionStore
import uz.vizara.tcall.network.ApiClient

class TcallApplication : Application() {
    lateinit var sessionStore: SessionStore
        private set

    lateinit var apiClient: ApiClient
        private set

    override fun onCreate() {
        super.onCreate()
        sessionStore = SessionStore(this)
        apiClient = ApiClient(sessionStore)
    }
}
