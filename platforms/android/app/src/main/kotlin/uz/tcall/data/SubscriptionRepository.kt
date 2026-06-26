package uz.tcall.data

import uz.tcall.network.PurchaseSubscriptionRequest
import uz.tcall.network.SubscriptionResponse
import uz.tcall.network.TcallApi

class SubscriptionRepository(private val api: TcallApi) {
    suspend fun load(): Result<SubscriptionResponse> = runCatching {
        val res = api.subscription()
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Obuna ma'lumoti yo'q")
        res.body() ?: throw Exception("Javob yo'q")
    }

    suspend fun purchase(plan: String): Result<SubscriptionResponse> = runCatching {
        val res = api.purchaseSubscription(PurchaseSubscriptionRequest(plan = plan))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "To'lov xatosi")
        res.body() ?: throw Exception("Javob yo'q")
    }
}
