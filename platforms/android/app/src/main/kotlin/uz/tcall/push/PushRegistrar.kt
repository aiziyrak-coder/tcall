package uz.tcall.push

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await
import uz.tcall.network.DeviceTokenRequest
import uz.tcall.network.TcallApi

object PushRegistrar {
    private const val TAG = "TcallPush"

    suspend fun registerIfPossible(api: TcallApi, context: android.content.Context): Boolean {
        if (Build.VERSION.SDK_INT >= 33) {
            val granted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) return false
        }
        return runCatching {
            val token = FirebaseMessaging.getInstance().token.await()
            val res = api.registerDeviceToken(DeviceTokenRequest(token = token, platform = "android"))
            if (!res.isSuccessful) throw Exception("token register failed")
            Log.i(TAG, "FCM token registered")
            true
        }.getOrElse {
            Log.w(TAG, "FCM skip: ${it.message}")
            false
        }
    }
}
