package uz.tcall.data

import uz.tcall.network.DialRequest
import uz.tcall.network.EndCallRequest
import uz.tcall.network.JoinCallRequest
import uz.tcall.network.TcallApi

class CallRepository(private val api: TcallApi) {
    suspend fun dial(tcallId: String): Result<String> = runCatching {
        val res = api.dial(DialRequest(tcallId))
        if (!res.isSuccessful) {
            val err = res.errorBody()?.string() ?: "Qo'ng'iroq xatosi"
            throw Exception(err)
        }
        res.body()?.roomId ?: throw Exception(res.body()?.error ?: "roomId yo'q")
    }

    suspend fun join(roomId: String): Result<Unit> = runCatching {
        val res = api.joinCall(JoinCallRequest(roomId))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Qo'shilish xatosi")
    }

    suspend fun end(roomId: String) {
        runCatching { api.endCall(EndCallRequest(roomId)) }
    }
}
