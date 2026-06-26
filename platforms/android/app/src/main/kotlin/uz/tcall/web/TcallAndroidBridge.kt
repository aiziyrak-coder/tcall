package uz.tcall.web

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.content.ContextCompat
import android.webkit.CookieManager
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import uz.tcall.BuildConfig

/**
 * Web ilova (web.tcall.uz) bilan Android o'rtasidagi ko'prik.
 * Push ro'yxatdan o'tish va boshqa native funksiyalar.
 */
class TcallAndroidBridge(
    private val webView: WebView,
    private val scope: CoroutineScope,
) {
    @JavascriptInterface
    fun registerPush(authToken: String?) {
        if (authToken.isNullOrBlank()) return
        scope.launch(Dispatchers.IO) {
            runCatching {
                if (Build.VERSION.SDK_INT >= 33) {
                    val granted = ContextCompat.checkSelfPermission(
                        webView.context,
                        Manifest.permission.POST_NOTIFICATIONS,
                    ) == PackageManager.PERMISSION_GRANTED
                    if (!granted) return@launch
                }
                val fcm = FirebaseMessaging.getInstance().token.await()
                val json = """{"token":"$fcm","platform":"android"}"""
                val req = Request.Builder()
                    .url("${BuildConfig.API_BASE_URL}/api/user/device-token")
                    .post(json.toRequestBody("application/json".toMediaType()))
                    .header("Authorization", "Bearer $authToken")
                    .header("X-Tcall-Native", "1")
                    .build()
                OkHttpClient().newCall(req).execute().use { res ->
                    if (!res.isSuccessful) throw Exception("HTTP ${res.code}")
                }
                Log.i(TAG, "FCM token serverga yuborildi")
            }.onFailure { Log.w(TAG, "registerPush: ${it.message}") }
        }
    }

    @JavascriptInterface
    fun syncCookies() {
        CookieManager.getInstance().flush()
    }

    @JavascriptInterface
    fun log(message: String?) {
        if (!message.isNullOrBlank()) Log.d(TAG, message)
    }

    companion object {
        private const val TAG = "TcallBridge"

        /** Sahifa yuklanishidan oldin — web bilan bir xil native CSS/JS */
        val DOCUMENT_START_SCRIPT: String = """
            (function(){
              try {
                window.Capacitor = window.Capacitor || {
                  isNativePlatform: function(){ return true; },
                  getPlatform: function(){ return 'android'; },
                  isPluginAvailable: function(){ return false; }
                };
                window.TcallNative = { isAndroid: true, platform: 'android' };
                document.documentElement.classList.add('web-app','native-app','native-android');
                if (document.body) document.body.classList.add('web-app','native-app','native-android');
              } catch(e) {}
            })();
        """.trimIndent()
    }
}
