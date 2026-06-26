package uz.tcall.data

import uz.tcall.network.PinBodyRequest
import uz.tcall.network.PinStatusResponse
import uz.tcall.network.PinVerifyRequest
import uz.tcall.network.TcallApi

class PinRepository(private val api: TcallApi) {
    suspend fun status(): Result<PinStatusResponse> = runCatching {
        val res = api.pinStatus()
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "PIN holati yo'q")
        res.body() ?: throw Exception("Javob yo'q")
    }

    suspend fun setPin(pin: String): Result<Unit> = runCatching {
        val res = api.setPin(PinBodyRequest(pin = pin))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "PIN o'rnatilmadi")
    }

    suspend fun verify(pin: String): Result<Unit> = runCatching {
        val res = api.verifyPin(PinVerifyRequest(pin = pin))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "PIN noto'g'ri")
    }

    suspend fun disable(pin: String): Result<Unit> = runCatching {
        val res = api.disablePin(PinVerifyRequest(pin = pin))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "PIN o'chirilmadi")
    }

    suspend fun changePin(currentPin: String, newPin: String): Result<Unit> = runCatching {
        val res = api.changePin(uz.tcall.network.PinChangeRequest(currentPin = currentPin, pin = newPin))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "PIN o'zgartirilmadi")
    }
}
