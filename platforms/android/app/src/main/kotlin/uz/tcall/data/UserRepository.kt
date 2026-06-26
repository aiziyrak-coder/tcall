package uz.tcall.data

import uz.tcall.network.ChangePasswordRequest
import uz.tcall.network.SendSupportRequest
import uz.tcall.network.TcallApi
import uz.tcall.network.UpdateSettingsRequest
import uz.tcall.network.UserSettingsDto

class UserRepository(private val api: TcallApi) {
    suspend fun getSettings(): Result<UserSettingsDto> = runCatching {
        val res = api.userSettings()
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
        res.body()?.user ?: throw Exception("Profil topilmadi")
    }

    suspend fun updateSettings(body: UpdateSettingsRequest): Result<UserSettingsDto> = runCatching {
        val res = api.updateSettings(body)
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Saqlash xatosi")
        res.body()?.user ?: throw Exception("Javob yo'q")
    }

    suspend fun changePassword(current: String, newPassword: String) = runCatching {
        val res = api.changePassword(ChangePasswordRequest(current, newPassword))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Parol xatosi")
    }

    suspend fun supportMessages() = runCatching {
        val res = api.supportMessages()
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
        res.body()?.messages.orEmpty()
    }

    suspend fun sendSupport(text: String) = runCatching {
        val res = api.sendSupportMessage(SendSupportRequest(text))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Yuborish xatosi")
        res.body()?.message
    }

    suspend fun vanityNumbers(tier: String? = null, q: String? = null, page: Int = 1) = runCatching {
        val res = api.vanityNumbers(tier = tier, q = q, page = page)
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
        res.body() ?: throw Exception("Javob yo'q")
    }

    suspend fun checkNumber(number: String) = runCatching {
        val res = api.checkVanityNumber(uz.tcall.network.VanityRequestBody(number))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Tekshirish xatosi")
        res.body()
    }

    suspend fun requestNumber(number: String) = runCatching {
        val res = api.requestVanityNumber(uz.tcall.network.VanityRequestBody(number))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "So'rov xatosi")
    }

    suspend fun deleteAccount() = runCatching {
        val res = api.deleteAccount(uz.tcall.network.DeleteAccountRequest(confirm = "DELETE"))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "O'chirilmadi")
    }
}
