package uz.tcall.data

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import uz.tcall.network.ChangePasswordRequest
import uz.tcall.network.DeleteAccountRequest
import uz.tcall.network.SendSupportRequest
import uz.tcall.network.ApiErrorParser
import uz.tcall.network.TcallApi
import uz.tcall.network.TelegramLinkResponse
import uz.tcall.network.TelegramStatusResponse
import uz.tcall.network.UpdateSettingsRequest
import uz.tcall.network.UserSettingsDto
import java.io.File

class UserRepository(private val api: TcallApi) {
    suspend fun getSettings(): Result<UserSettingsDto> = runCatching {
        val res = api.userSettings()
        if (!res.isSuccessful) throw Exception(ApiErrorParser.fromResponse(res, "Xatolik"))
        res.body()?.user ?: throw Exception("Profil topilmadi")
    }

    suspend fun updateSettings(body: UpdateSettingsRequest): Result<UserSettingsDto> = runCatching {
        val res = api.updateSettings(body)
        if (!res.isSuccessful) throw Exception(ApiErrorParser.fromResponse(res, "Saqlash xatosi"))
        res.body()?.user ?: throw Exception("Javob yo'q")
    }

    suspend fun changePassword(current: String, newPassword: String) = runCatching {
        val res = api.changePassword(ChangePasswordRequest(current, newPassword))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Parol xatosi")
    }

    suspend fun uploadAvatar(file: File, mime: String, name: String): Result<String> = runCatching {
        val part = MultipartBody.Part.createFormData(
            "file",
            name,
            file.asRequestBody(mime.toMediaType()),
        )
        val res = api.uploadAvatar(part)
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Yuklash xatosi")
        res.body()?.url ?: throw Exception(res.body()?.error ?: "URL yo'q")
    }

    suspend fun deleteAvatar() = runCatching {
        val res = api.deleteAvatar()
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "O'chirilmadi")
    }

    suspend fun telegramStatus(): Result<TelegramStatusResponse> = runCatching {
        val res = api.telegramStatus()
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
        res.body() ?: throw Exception("Javob yo'q")
    }

    suspend fun linkTelegram(): Result<TelegramLinkResponse> = runCatching {
        val res = api.linkTelegram()
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Ulanmadi")
        res.body() ?: throw Exception("Javob yo'q")
    }

    suspend fun unlinkTelegram() = runCatching {
        val res = api.unlinkTelegram()
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Uzilmadi")
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

    suspend fun deleteAccount(password: String) = runCatching {
        val res = api.deleteAccount(DeleteAccountRequest(password = password))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "O'chirilmadi")
    }
}
