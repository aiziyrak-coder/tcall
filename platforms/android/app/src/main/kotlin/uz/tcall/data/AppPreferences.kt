package uz.tcall.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking

private val Context.prefsStore by preferencesDataStore(name = "tcall_prefs")

class AppPreferences(private val context: Context) {
    private val onboardingKey = booleanPreferencesKey("onboarding_v1")
    private val rememberedEmailKey = stringPreferencesKey("remembered_email")

    val onboardingComplete: Flow<Boolean> = context.prefsStore.data.map { prefs ->
        prefs[onboardingKey] == true
    }

    val rememberedEmail: Flow<String?> = context.prefsStore.data.map { prefs ->
        prefs[rememberedEmailKey]
    }

    fun isOnboardingCompleteSync(): Boolean = runBlocking {
        context.prefsStore.data.first()[onboardingKey] == true
    }

    suspend fun completeOnboarding() {
        context.prefsStore.edit { it[onboardingKey] = true }
    }

    suspend fun saveRememberedEmail(email: String?) {
        context.prefsStore.edit { prefs ->
            if (email.isNullOrBlank()) {
                prefs.remove(rememberedEmailKey)
            } else {
                prefs[rememberedEmailKey] = email
            }
        }
    }
}
