package uz.vizara.tcall.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import uz.vizara.tcall.network.UserDto

private val Context.dataStore by preferencesDataStore(name = "tcall_session")

class SessionStore(private val context: Context) {
    private val tokenKey = stringPreferencesKey("auth_token")
    private val userIdKey = stringPreferencesKey("user_id")
    private val userNameKey = stringPreferencesKey("user_name")
    private val userEmailKey = stringPreferencesKey("user_email")
    private val tcallIdKey = stringPreferencesKey("tcall_id")
    private val languageKey = stringPreferencesKey("language")

    val isLoggedIn: Flow<Boolean> = context.dataStore.data.map { prefs ->
        !prefs[tokenKey].isNullOrBlank()
    }

    val currentUser: Flow<UserDto?> = context.dataStore.data.map { prefs ->
        val token = prefs[tokenKey]
        val userId = prefs[userIdKey]
        if (token.isNullOrBlank() || userId.isNullOrBlank()) return@map null
        UserDto(
            userId = userId,
            email = prefs[userEmailKey] ?: "",
            name = prefs[userNameKey] ?: "",
            language = prefs[languageKey] ?: "uz",
            tcallId = prefs[tcallIdKey] ?: "",
        )
    }

    fun getTokenSync(): String? = runBlocking {
        context.dataStore.data.first()[tokenKey]
    }

    suspend fun saveSession(token: String, user: UserDto) {
        context.dataStore.edit { prefs ->
            prefs[tokenKey] = token
            prefs[userIdKey] = user.userId
            prefs[userNameKey] = user.name
            prefs[userEmailKey] = user.email
            prefs[tcallIdKey] = user.tcallId
            prefs[languageKey] = user.language
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
