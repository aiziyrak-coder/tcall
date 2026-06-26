package uz.tcall.session

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * WebView localStorage ishlamasligi mumkin — sessiyani native xavfsiz saqlash.
 * Play Market WebView ilovalari uchun standart yondashuv.
 */
class TcallSessionStore(context: Context) {
    private val prefs = EncryptedSharedPreferences.create(
        context,
        PREFS_NAME,
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun hasSession(): Boolean = !getToken().isNullOrBlank()

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)?.takeIf { it.isNotBlank() }

    fun getUserJson(): String? = prefs.getString(KEY_USER, null)?.takeIf { it.isNotBlank() }

    fun save(token: String, userJson: String) {
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putString(KEY_USER, userJson)
            .apply()
    }

    fun clear() {
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_USER)
            .apply()
    }

    companion object {
        private const val PREFS_NAME = "tcall_secure_session"
        private const val KEY_TOKEN = "auth_token"
        private const val KEY_USER = "auth_user"
    }
}
