package uz.tcall.ui.main

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import uz.tcall.core.TcallServices
import uz.tcall.network.IncomingCallEvent
import uz.tcall.network.UserDto
import uz.tcall.ui.call.CallScreen
import uz.tcall.ui.call.IncomingCallDialog
import uz.tcall.ui.chat.ChatListScreen
import uz.tcall.ui.chat.ChatListViewModel
import uz.tcall.ui.chat.ChatThreadScreen
import uz.tcall.ui.chat.ChatThreadViewModel
import uz.tcall.ui.components.PhoneShell
import uz.tcall.ui.components.PhoneTab
import uz.tcall.ui.dialer.DialerScreen
import uz.tcall.ui.dialer.DialerViewModel
import uz.tcall.ui.friends.FriendsScreen
import uz.tcall.ui.interpreter.InterpreterScreen
import uz.tcall.ui.interpreter.InterpreterViewModel
import uz.tcall.ui.room.RoomScreen

data class ActiveCall(val roomId: String, val peerName: String)

data class OpenChat(val conversationId: String, val title: String)

@Composable
fun MainScreen(
    user: UserDto,
    services: TcallServices,
    onLogout: () -> Unit,
    initialRoomId: String? = null,
    initialConversationId: String? = null,
) {
    var selectedTab by rememberSaveable { mutableStateOf(PhoneTab.KEYPAD.name) }
    val tab = PhoneTab.valueOf(selectedTab)
    var activeCall by remember { mutableStateOf<ActiveCall?>(null) }
    var openChat by remember { mutableStateOf<OpenChat?>(null) }
    var incomingCall by remember { mutableStateOf<IncomingCallEvent?>(null) }
    val scope = rememberCoroutineScope()

    val chatListVm: ChatListViewModel = viewModel(
        factory = remember(services) {
            object : androidx.lifecycle.ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : androidx.lifecycle.ViewModel> create(c: Class<T>): T =
                    ChatListViewModel(services.chatRepository, services.socketManager) as T
            }
        },
    )
    val dialerVm: DialerViewModel = viewModel(
        factory = remember(services) {
            object : androidx.lifecycle.ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : androidx.lifecycle.ViewModel> create(c: Class<T>): T =
                    DialerViewModel(services.callRepository, services.chatRepository) as T
            }
        },
    )
    val interpreterVm: InterpreterViewModel = viewModel(
        factory = remember(services) {
            object : androidx.lifecycle.ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : androidx.lifecycle.ViewModel> create(c: Class<T>): T =
                    InterpreterViewModel(services.interpreterRecorder) as T
            }
        },
    )

    fun enterCall(roomId: String, peerName: String = "Suhbatdosh") {
        activeCall = ActiveCall(roomId, peerName)
        services.webRtcCallManager.initialize()
        services.socketManager.joinRoom(roomId, user)
    }

    LaunchedEffect(user) {
        services.webRtcCallManager.initialize()
        services.socketManager.roomUsers.onEach { participants ->
            if (activeCall != null) {
                services.webRtcCallManager.startCall(activeCall!!.roomId, participants, user.userId)
            }
        }.launchIn(this)

        services.socketManager.incomingCall.onEach { incomingCall = it }.launchIn(this)

        services.socketManager.offer.onEach { payload ->
            services.webRtcCallManager.handleOffer(payload.sdp, payload.senderId)
        }.launchIn(this)
        services.socketManager.answer.onEach { payload ->
            services.webRtcCallManager.handleAnswer(payload.sdp)
        }.launchIn(this)
        services.socketManager.iceCandidate.onEach { ice ->
            services.webRtcCallManager.handleIceCandidate(ice.candidate, ice.sdpMid, ice.sdpMLineIndex)
        }.launchIn(this)
        services.socketManager.requestReoffer.onEach { fromId ->
            services.webRtcCallManager.handleReofferRequest(fromId)
        }.launchIn(this)
    }

    LaunchedEffect(initialRoomId) {
        initialRoomId?.let { enterCall(it) }
    }
    LaunchedEffect(initialConversationId) {
        initialConversationId?.let {
            openChat = OpenChat(it, "Chat")
            selectedTab = PhoneTab.MESSAGES.name
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            activeCall?.let { call ->
                services.socketManager.leaveRoom(call.roomId)
                scope.launch { services.callRepository.end(call.roomId) }
                services.webRtcCallManager.end()
            }
        }
    }

    if (activeCall != null) {
        CallScreen(
            roomId = activeCall!!.roomId,
            peerName = activeCall!!.peerName,
            callManager = services.webRtcCallManager,
            onEnd = {
                val room = activeCall!!.roomId
                services.socketManager.leaveRoom(room)
                services.socketManager.endCall()
                scope.launch { services.callRepository.end(room) }
                services.webRtcCallManager.end()
                activeCall = null
            },
        )
        return
    }

    openChat?.let { chat ->
        val threadVm: ChatThreadViewModel = viewModel(
            key = chat.conversationId,
            factory = remember(chat.conversationId, services) {
                object : androidx.lifecycle.ViewModelProvider.Factory {
                    @Suppress("UNCHECKED_CAST")
                    override fun <T : androidx.lifecycle.ViewModel> create(c: Class<T>): T =
                        ChatThreadViewModel(
                            chat.conversationId,
                            user.userId,
                            services.chatRepository,
                            services.socketManager,
                        ) as T
                }
            },
        )
        ChatThreadScreen(title = chat.title, viewModel = threadVm, onBack = { openChat = null })
        return
    }

    incomingCall?.let { call ->
        IncomingCallDialog(
            call = call,
            onAccept = {
                incomingCall = null
                scope.launch {
                    services.socketManager.acceptCall(call.roomId)
                    services.callRepository.join(call.roomId)
                    enterCall(call.roomId, call.caller.name)
                }
            },
            onReject = {
                services.socketManager.rejectCall(call.roomId)
                incomingCall = null
            },
        )
    }

    val chatState by chatListVm.state.collectAsState()

    PhoneShell(
        selectedTab = tab,
        onTabSelected = { selectedTab = it.name },
        userName = user.name,
        userTcallId = user.tcallId,
        onLogout = onLogout,
        badges = buildMap {
            if (chatState.unreadTotal > 0) put(PhoneTab.MESSAGES, chatState.unreadTotal)
        },
    ) {
        Box(Modifier.fillMaxSize()) {
            when (tab) {
                PhoneTab.MESSAGES -> ChatListScreen(
                    viewModel = chatListVm,
                    onOpenChat = { conv -> openChat = OpenChat(conv.id, conv.title) },
                )
                PhoneTab.FRIENDS -> FriendsScreen()
                PhoneTab.KEYPAD -> DialerScreen(
                    viewModel = dialerVm,
                    onCall = { roomId -> enterCall(roomId) },
                    onMessage = { convId ->
                        openChat = OpenChat(convId, dialerVm.state.value.digits)
                        selectedTab = PhoneTab.MESSAGES.name
                    },
                )
                PhoneTab.ROOM -> RoomScreen()
                PhoneTab.INTERPRETER -> InterpreterScreen(viewModel = interpreterVm)
            }
        }
    }
}
