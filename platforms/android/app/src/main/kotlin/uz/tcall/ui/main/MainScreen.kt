package uz.tcall.ui.main

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import uz.tcall.ui.theme.TcallMotion
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
import uz.tcall.ui.call.OutgoingCallOverlay
import uz.tcall.ui.invite.InviteModal
import uz.tcall.ui.subscription.SubscriptionModal
import uz.tcall.webrtc.WebRtcCallManager
import uz.tcall.ui.chat.ChatListScreen
import uz.tcall.ui.chat.ChatListViewModel
import uz.tcall.ui.chat.ChatThreadScreen
import uz.tcall.ui.chat.ChatThreadViewModel
import uz.tcall.ui.components.PhoneShell
import uz.tcall.ui.components.PhoneTab
import uz.tcall.ui.dialer.DialerScreen
import uz.tcall.ui.dialer.DialerViewModel
import uz.tcall.ui.dialer.RecentsViewModel
import uz.tcall.ui.friends.FriendsScreen
import uz.tcall.ui.friends.FriendsViewModel
import uz.tcall.ui.interpreter.InterpreterScreen
import uz.tcall.ui.interpreter.InterpreterViewModel
import uz.tcall.ui.room.RoomScreen
import uz.tcall.ui.room.RoomViewModel
import uz.tcall.ui.settings.SettingsModal
import uz.tcall.ui.settings.SettingsViewModel
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.strings.UiLocaleLoader
import uz.tcall.ui.strings.uiStrings
import uz.tcall.ui.support.SupportChatModal
import uz.tcall.ui.vanity.VanityScreen
import uz.tcall.ui.vanity.VanityViewModel

data class ActiveCall(val roomId: String, val peerName: String)

data class OpenChat(val conversationId: String, val title: String, val peerTcallId: String? = null)

private enum class Overlay { NONE, VANITY }

@Composable
fun MainScreen(
    user: UserDto,
    services: TcallServices,
    onLogout: () -> Unit,
    initialRoomId: String? = null,
    initialConversationId: String? = null,
) {
    var currentUser by remember(user) { mutableStateOf(user) }
    var selectedTab by rememberSaveable { mutableStateOf(PhoneTab.KEYPAD.name) }
    val tab = PhoneTab.valueOf(selectedTab)
    var activeCall by remember { mutableStateOf<ActiveCall?>(null) }
    var openChat by remember { mutableStateOf<OpenChat?>(null) }
    var incomingCall by remember { mutableStateOf<IncomingCallEvent?>(null) }
    var overlay by remember { mutableStateOf(Overlay.NONE) }
    var supportOpen by remember { mutableStateOf(false) }
    var settingsOpen by remember { mutableStateOf(false) }
    var subscriptionOpen by remember { mutableStateOf(false) }
    var inviteOpen by remember { mutableStateOf(false) }
    var outgoingCall by remember { mutableStateOf<ActiveCall?>(null) }
    val scope = rememberCoroutineScope()
    var ui by remember(currentUser.language) { mutableStateOf(uiStrings(currentUser.language)) }
    LaunchedEffect(currentUser.language) {
        ui = UiLocaleLoader.load(services.apiClient.api, currentUser.language)
    }

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
    val recentsVm: RecentsViewModel = viewModel(
        factory = remember(services) {
            object : androidx.lifecycle.ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : androidx.lifecycle.ViewModel> create(c: Class<T>): T =
                    RecentsViewModel(services.callRepository) as T
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
    val friendsVm: FriendsViewModel = viewModel(
        factory = remember(services) {
            object : androidx.lifecycle.ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : androidx.lifecycle.ViewModel> create(c: Class<T>): T =
                    FriendsViewModel(services.socialRepository) as T
            }
        },
    )
    val roomVm: RoomViewModel = viewModel(
        factory = remember(services) {
            object : androidx.lifecycle.ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : androidx.lifecycle.ViewModel> create(c: Class<T>): T =
                    RoomViewModel(services.callRepository) as T
            }
        },
    )
    val settingsVm: SettingsViewModel = viewModel(
        factory = remember(services, currentUser.userId) {
            object : androidx.lifecycle.ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : androidx.lifecycle.ViewModel> create(c: Class<T>): T =
                    SettingsViewModel(
                        services.userRepository,
                        services.pinRepository,
                        services.sessionStore,
                    ) { updated -> currentUser = updated } as T
            }
        },
    )
    val vanityVm: VanityViewModel = viewModel(
        factory = remember(services) {
            object : androidx.lifecycle.ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : androidx.lifecycle.ViewModel> create(c: Class<T>): T =
                    VanityViewModel(services.userRepository) as T
            }
        },
    )

    fun enterCall(roomId: String, peerName: String = "Suhbatdosh") {
        outgoingCall = ActiveCall(roomId, peerName)
        activeCall = ActiveCall(roomId, peerName)
        services.webRtcCallManager.initialize()
        services.socketManager.joinRoom(roomId, user)
    }

    fun openChatByTcallId(tcallId: String, title: String = tcallId) {
        scope.launch {
            services.chatRepository.openDirectChat(tcallId)
                .onSuccess { convId ->
                    openChat = OpenChat(convId, title, tcallId)
                    selectedTab = PhoneTab.MESSAGES.name
                }
        }
    }

    fun startChatFromList(tcallId: String) {
        scope.launch {
            services.chatRepository.openDirectChat(tcallId)
                .onSuccess { convId ->
                    openChat = OpenChat(convId, tcallId, tcallId)
                    chatListVm.refresh()
                }
        }
    }

    fun createGroupFromList(name: String, memberIds: List<String>) {
        scope.launch {
            services.chatRepository.createGroupChat(name, memberIds)
                .onSuccess { convId ->
                    openChat = OpenChat(convId, name)
                    chatListVm.refresh()
                }
        }
    }

    fun dialByTcallId(tcallId: String) {
        scope.launch {
            services.callRepository.dial(tcallId)
                .onSuccess { roomId -> enterCall(roomId, tcallId) }
        }
    }

    LaunchedEffect(user) {
        services.webRtcCallManager.initialize()
        services.socketManager.roomUsers.onEach { participants ->
            if (activeCall != null) {
                services.webRtcCallManager.startCall(activeCall!!.roomId, participants, user.userId)
            }
        }.launchIn(this)

        services.webRtcCallManager.callState.onEach { cs ->
            if (cs == WebRtcCallManager.CallState.CONNECTED) outgoingCall = null
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

    when (overlay) {
        Overlay.VANITY -> {
            VanityScreen(viewModel = vanityVm, ui = ui, onBack = { overlay = Overlay.NONE })
            return
        }
        Overlay.NONE -> Unit
    }

    if (activeCall != null && outgoingCall != null) {
        OutgoingCallOverlay(peerName = outgoingCall!!.peerName) {
            val room = activeCall!!.roomId
            services.socketManager.leaveRoom(room)
            services.socketManager.endCall()
            scope.launch { services.callRepository.end(room) }
            services.webRtcCallManager.end()
            activeCall = null
            outgoingCall = null
        }
        return
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
                outgoingCall = null
                recentsVm.refresh()
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
        ChatThreadScreen(
            title = chat.title,
            peerTcallId = chat.peerTcallId,
            ui = ui,
            viewModel = threadVm,
            onBack = { openChat = null },
            onCall = ::dialByTcallId,
        )
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

    Box(Modifier.fillMaxSize()) {
        PhoneShell(
            selectedTab = tab,
            onTabSelected = { selectedTab = it.name },
            userName = currentUser.name,
            userTcallId = currentUser.tcallId,
            ui = ui,
            userLanguage = currentUser.language,
            onLogout = onLogout,
            onOpenSettings = { settingsOpen = true },
            onOpenVanity = { overlay = Overlay.VANITY },
            onOpenSupport = { supportOpen = true },
            badges = buildMap {
                if (chatState.unreadTotal > 0) put(PhoneTab.MESSAGES, chatState.unreadTotal)
            },
        ) {
            AnimatedContent(
                targetState = tab,
                transitionSpec = {
                    (fadeIn(TcallMotion.tabSpring) + slideInHorizontally(TcallMotion.slideTween) { it / 10 }) togetherWith
                        (fadeOut(TcallMotion.fadeTween) + slideOutHorizontally(TcallMotion.slideTween) { -it / 10 })
                },
                label = "tabContent",
            ) { currentTab ->
                Box(Modifier.fillMaxSize()) {
                    when (currentTab) {
                        PhoneTab.MESSAGES -> ChatListScreen(
                            viewModel = chatListVm,
                            ui = ui,
                            onOpenChat = { conv ->
                                val peer = conv.members?.firstOrNull { it.tcallId != null }?.tcallId
                                openChat = OpenChat(conv.id, conv.title, peer)
                            },
                            onStartChat = ::startChatFromList,
                            onCreateGroup = ::createGroupFromList,
                        )
                        PhoneTab.FRIENDS -> FriendsScreen(
                            viewModel = friendsVm,
                            ui = ui,
                            onCall = ::dialByTcallId,
                            onMessage = ::openChatByTcallId,
                        )
                        PhoneTab.KEYPAD -> DialerScreen(
                            viewModel = dialerVm,
                            recentsViewModel = recentsVm,
                            ui = ui,
                            userTcallId = currentUser.tcallId,
                            onCall = { roomId -> enterCall(roomId) },
                            onMessage = { convId ->
                                val digits = dialerVm.state.value.digits
                                openChat = OpenChat(convId, digits, digits)
                                selectedTab = PhoneTab.MESSAGES.name
                            },
                            onDialTcallId = ::dialByTcallId,
                        )
                        PhoneTab.ROOM -> RoomScreen(viewModel = roomVm, ui = ui, onJoinCall = { roomId -> enterCall(roomId) })
                        PhoneTab.INTERPRETER -> InterpreterScreen(viewModel = interpreterVm, ui = ui)
                    }
                }
            }
        }

        SupportChatModal(
            open = supportOpen,
            userRepository = services.userRepository,
            ui = ui,
            onClose = { supportOpen = false },
        )

        SettingsModal(
            open = settingsOpen,
            viewModel = settingsVm,
            ui = ui,
            onClose = { settingsOpen = false },
            onLogout = onLogout,
            onOpenSubscription = { settingsOpen = false; subscriptionOpen = true },
            onOpenInvite = { settingsOpen = false; inviteOpen = true },
            onOpenSupport = { settingsOpen = false; supportOpen = true },
        )

        SubscriptionModal(
            open = subscriptionOpen,
            repository = services.subscriptionRepository,
            onClose = { subscriptionOpen = false },
        )

        InviteModal(
            open = inviteOpen,
            api = services.apiClient.api,
            onClose = { inviteOpen = false },
        )
    }
}
