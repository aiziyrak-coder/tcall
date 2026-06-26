package uz.tcall.data

import uz.tcall.network.BlockRequest
import uz.tcall.network.FriendRequestActionRequest
import uz.tcall.network.LookupUserDto
import uz.tcall.network.SendFriendRequestRequest
import uz.tcall.network.TcallApi

class SocialRepository(private val api: TcallApi) {
    suspend fun loadFriends() = runCatching {
        val res = api.contacts()
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
        res.body()?.contacts.orEmpty()
    }

    suspend fun loadBlocks() = runCatching {
        val res = api.blocks()
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
        res.body()?.blocks.orEmpty()
    }

    suspend fun loadIncomingRequests() = runCatching {
        val res = api.friendRequests()
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
        res.body()?.incoming.orEmpty()
    }

    suspend fun lookup(tcallId: String): Result<LookupUserDto?> = runCatching {
        val res = api.lookupUser(tcallId)
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Qidiruv xatosi")
        val body = res.body() ?: return@runCatching null
        if (body.found != true) null else body.user
    }

    suspend fun sendFriendRequest(tcallId: String, name: String) = runCatching {
        val res = api.sendFriendRequest(SendFriendRequestRequest(tcallId, name))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
    }

    suspend fun respondRequest(senderTcallId: String, accept: Boolean) = runCatching {
        val res = api.respondFriendRequest(FriendRequestActionRequest(senderTcallId, accept))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
    }

    suspend fun removeFriend(contactId: String) = runCatching {
        val res = api.deleteContact(contactId)
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
    }

    suspend fun blockUser(tcallId: String) = runCatching {
        val res = api.blockUser(BlockRequest(tcallId))
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
    }

    suspend fun unblockUser(tcallId: String) = runCatching {
        val res = api.unblockUser(tcallId)
        if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Xatolik")
    }
}
