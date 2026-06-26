package uz.tcall

import android.app.Application
import android.webkit.CookieManager

class TcallApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        CookieManager.getInstance().setAcceptCookie(true)
    }
}
