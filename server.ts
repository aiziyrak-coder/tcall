import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { translateText } from "./src/lib/translate";
import { textToSpeech } from "./src/lib/openai";
import { verifyToken, type SessionPayload } from "./src/lib/auth";
import { parseCookies } from "./src/lib/cookies";
import { prisma } from "./src/lib/prisma";
import {
  acceptCall,
  rejectCall,
  cancelCall,
  expireStaleRingingCalls,
  clampTranscript,
  RING_TIMEOUT_MS,
} from "./src/lib/call-service";
import {
  setSocketIO,
  registerUserSocket,
  unregisterUserSocket,
  emitToUser,
} from "./src/lib/socket-io";
import { seedVanityNumbers } from "./src/lib/tcallId";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);
const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
const apiUrl = process.env.NEXT_PUBLIC_API_URL || appUrl;
const allowedOrigins = dev
  ? ["http://localhost:3000", "http://127.0.0.1:3000", appUrl, apiUrl]
  : [appUrl, apiUrl, "https://tcall.vizara.uz", "https://tcallapi.vizara.uz"].filter(Boolean);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface RoomUser {
  socketId: string;
  userId: string;
  name: string;
  language: string;
  translationMode: string;
  isHost: boolean;
}

const MAX_ROOM_SIZE = 2;
const rooms = new Map<string, Map<string, RoomUser>>();

function getSession(socket: { data: { session?: SessionPayload } }): SessionPayload | null {
  return socket.data.session ?? null;
}

function isInRoom(roomId: string, socketId: string): boolean {
  const room = rooms.get(roomId);
  return room ? room.has(socketId) : false;
}

app.prepare().then(async () => {
  if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    console.error("FATAL: JWT_SECRET required in production");
    process.exit(1);
  }

  await seedVanityNumbers().catch(() => {});

  setInterval(() => {
    expireStaleRingingCalls()
      .then((stale) => {
        for (const call of stale) {
          emitToUser(call.hostId, "call-timeout", { roomId: call.roomId });
          if (call.calleeId) {
            emitToUser(call.calleeId, "call-timeout", { roomId: call.roomId });
          }
        }
      })
      .catch(() => {});
  }, 30_000);

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
    pingInterval: 10000,
    pingTimeout: 20000,
    transports: ["websocket", "polling"],
  });

  setSocketIO(io);

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies.session;
      if (!token) return next(new Error("Unauthorized"));
      const session = await verifyToken(token);
      if (!session?.userId) return next(new Error("Unauthorized"));
      socket.data.session = session;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const session = getSession(socket)!;
    let currentRoom: string | null = null;
    let currentUser: RoomUser | null = null;

    registerUserSocket(session.userId, socket.id);
    socket.join(`user:${session.userId}`);

    try {
      if (session.tcallId) {
        const pendingIncoming = await prisma.call.findMany({
          where: {
            status: "ringing",
            calleeTcallId: session.tcallId,
            createdAt: { gte: new Date(Date.now() - RING_TIMEOUT_MS) },
          },
          include: {
            host: { select: { id: true, name: true, language: true, tcallId: true } },
          },
        });
        for (const call of pendingIncoming) {
          socket.emit("incoming-call", {
            roomId: call.roomId,
            callId: call.id,
            caller: {
              userId: call.host.id,
              name: call.host.name,
              language: call.host.language,
              tcallId: call.host.tcallId,
            },
          });
        }
      }

      const acceptedCall = await prisma.call.findFirst({
        where: {
          hostId: session.userId,
          status: "active",
          callType: "dial",
          createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { participants: true } } },
      });
      if (acceptedCall && acceptedCall._count.participants >= 2) {
        socket.emit("call-accepted", { roomId: acceptedCall.roomId });
      }
    } catch (e) {
      console.error("Pending call sync error:", e);
    }

    socket.on("register-user", (data: { translationMode?: string }) => {
      if (data?.translationMode && currentUser) {
        currentUser.translationMode = data.translationMode;
      }
    });

    socket.on(
      "join-room",
      (data: {
        roomId: string;
        userId: string;
        name: string;
        language: string;
        translationMode?: string;
        isHost?: boolean;
      }) => {
        if (!data?.roomId || data.userId !== session.userId) return;

        const { roomId, userId, name, language, translationMode = "text", isHost = false } = data;
        currentRoom = roomId.toUpperCase();
        registerUserSocket(userId, socket.id);

        if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Map());
        const room = rooms.get(currentRoom)!;

        for (const [sid, u] of room.entries()) {
          if (u.userId === userId && sid !== socket.id) room.delete(sid);
        }

        if (room.size >= MAX_ROOM_SIZE && !Array.from(room.values()).some((u) => u.userId === userId)) {
          socket.emit("room-full", { message: "Qo'ng'iroq band" });
          return;
        }

        currentUser = {
          socketId: socket.id,
          userId,
          name,
          language,
          translationMode,
          isHost,
        };
        room.set(socket.id, currentUser);
        socket.join(currentRoom);

        io.to(currentRoom).emit(
          "room-users",
          Array.from(room.values()).map((u) => ({
            socketId: u.socketId,
            userId: u.userId,
            name: u.name,
            language: u.language,
            translationMode: u.translationMode,
            isHost: u.isHost,
          }))
        );
      }
    );

    socket.on("update-translation-mode", (data: { mode: string }) => {
      if (!currentUser || !data?.mode) return;
      currentUser.translationMode = data.mode;
      if (currentRoom) {
        const u = rooms.get(currentRoom)?.get(socket.id);
        if (u) u.translationMode = data.mode;
      }
    });

    socket.on("offer", (data: { offer: RTCSessionDescriptionInit; targetId: string }) => {
      if (!data?.targetId || !currentRoom || !isInRoom(currentRoom, socket.id)) return;
      if (!isInRoom(currentRoom, data.targetId)) return;
      socket.to(data.targetId).emit("offer", { offer: data.offer, senderId: socket.id });
    });

    socket.on("answer", (data: { answer: RTCSessionDescriptionInit; targetId: string }) => {
      if (!data?.targetId || !currentRoom || !isInRoom(currentRoom, socket.id)) return;
      socket.to(data.targetId).emit("answer", { answer: data.answer, senderId: socket.id });
    });

    socket.on("ice-candidate", (data: { candidate: RTCIceCandidateInit; targetId: string }) => {
      if (!data?.targetId || !currentRoom || !isInRoom(currentRoom, socket.id)) return;
      if (!isInRoom(currentRoom, data.targetId)) return;
      socket.to(data.targetId).emit("ice-candidate", { candidate: data.candidate, senderId: socket.id });
    });

    socket.on("speech-transcript", async (data: { text: string; isFinal: boolean }) => {
      if (!currentRoom || !currentUser || !data.isFinal) return;
      const text = clampTranscript(data.text);
      if (!text) return;

      const room = rooms.get(currentRoom);
      if (!room) return;

      const recipients = Array.from(room.values()).filter((u) => u.socketId !== socket.id);
      const callRecord = await prisma.call.findUnique({ where: { roomId: currentRoom } });
      let savedTranslation: string | null = null;

      await Promise.all(
        recipients.map(async (user) => {
          const needsTranslation = user.language !== currentUser!.language;
          const translated = needsTranslation
            ? await translateText(text, currentUser!.language, user.language)
            : text;

          if (needsTranslation && !savedTranslation) savedTranslation = translated;

          let audioBase64: string | undefined;
          if (needsTranslation && translated && user.translationMode === "voice") {
            try {
              const audio = await textToSpeech(translated);
              if (audio) audioBase64 = audio.toString("base64");
            } catch (e) {
              console.error("TTS failed:", e);
            }
          }

          io.to(user.socketId).emit("translation", {
            original: text,
            translated,
            sourceLang: currentUser!.language,
            targetLang: user.language,
            speaker: currentUser!.name,
            isFinal: true,
            audioBase64,
          });
        })
      );

      if (callRecord) {
        prisma.callTranscript
          .create({
            data: {
              callId: callRecord.id,
              speakerName: currentUser!.name,
              originalText: text,
              translatedText: savedTranslation,
              sourceLang: currentUser!.language,
              targetLang: savedTranslation ? recipients[0]?.language : null,
            },
          })
          .catch(() => {});
      }
    });

    socket.on("call-reject", async (data: { roomId: string }) => {
      if (!data?.roomId) return;
      const result = await rejectCall(data.roomId, session.userId, session.tcallId);
      if (result.ok && result.hostId) {
        emitToUser(result.hostId, "call-rejected", { roomId: data.roomId });
      }
    });

    socket.on("call-accept", async (data: { roomId: string }) => {
      if (!data?.roomId) return;
      const result = await acceptCall(data.roomId, session.userId, session.tcallId);
      if (result.ok && result.hostId) {
        emitToUser(result.hostId, "call-accepted", { roomId: data.roomId });
      } else if (!result.ok) {
        const message = "reason" in result ? result.reason : "Xatolik";
        socket.emit("call-error", { roomId: data.roomId, message });
      }
    });

    socket.on("call-cancel", async (data: { roomId: string }) => {
      if (!data?.roomId) return;
      const result = await cancelCall(data.roomId, session.userId);
      if (result.ok && result.calleeId) {
        emitToUser(result.calleeId, "call-cancelled", { roomId: data.roomId });
      }
    });

    socket.on("call-ended", () => {
      if (currentRoom) socket.to(currentRoom).emit("call-ended");
    });

    socket.on("disconnect", () => {
      unregisterUserSocket(session.userId, socket.id);

      if (currentRoom) {
        const room = rooms.get(currentRoom);
        if (room) {
          room.delete(socket.id);
          if (room.size === 0) {
            rooms.delete(currentRoom);
          } else {
            io.to(currentRoom).emit(
              "room-users",
              Array.from(room.values()).map((u) => ({
                socketId: u.socketId,
                userId: u.userId,
                name: u.name,
                language: u.language,
                translationMode: u.translationMode,
                isHost: u.isHost,
              }))
            );
            io.to(currentRoom).emit("user-left", { socketId: socket.id });
          }
        }
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Tcall audio server ${appUrl}`);
  });
});
