import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { translateText } from "./src/lib/translate";
import { textToSpeech } from "./src/lib/openai";
import {
  setSocketIO,
  registerUserSocket,
  unregisterUserSocket,
} from "./src/lib/socket-io";
import { seedVanityNumbers } from "./src/lib/tcallId";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);
const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
const apiUrl = process.env.NEXT_PUBLIC_API_URL || appUrl;
const allowedOrigins = dev
  ? "*"
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

app.prepare().then(async () => {
  await seedVanityNumbers().catch(() => {});

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

  io.on("connection", (socket) => {
    let currentRoom: string | null = null;
    let currentUser: RoomUser | null = null;
    let registeredUserId: string | null = null;

    socket.on(
      "register-user",
      (data: { userId: string; translationMode?: string }) => {
        if (!data?.userId) return;
        registeredUserId = data.userId;
        registerUserSocket(data.userId, socket.id);
        socket.join(`user:${data.userId}`);
      }
    );

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
        const { roomId, userId, name, language, translationMode = "text", isHost = false } = data;
        currentRoom = roomId.toUpperCase();
        registeredUserId = userId;
        registerUserSocket(userId, socket.id);

        if (!rooms.has(currentRoom)) {
          rooms.set(currentRoom, new Map());
        }

        const room = rooms.get(currentRoom)!;

        for (const [sid, u] of room.entries()) {
          if (u.userId === userId && sid !== socket.id) {
            room.delete(sid);
          }
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

        const participants = Array.from(room.values()).map((u) => ({
          socketId: u.socketId,
          userId: u.userId,
          name: u.name,
          language: u.language,
          translationMode: u.translationMode,
          isHost: u.isHost,
        }));

        io.to(currentRoom).emit("room-users", participants);
      }
    );

    socket.on("update-translation-mode", (data: { mode: string }) => {
      if (currentUser && data?.mode) {
        currentUser.translationMode = data.mode;
        if (currentRoom) {
          const room = rooms.get(currentRoom);
          if (room) {
            const u = room.get(socket.id);
            if (u) u.translationMode = data.mode;
          }
        }
      }
    });

    socket.on("offer", (data: { offer: RTCSessionDescriptionInit; targetId: string }) => {
      socket.to(data.targetId).emit("offer", {
        offer: data.offer,
        senderId: socket.id,
      });
    });

    socket.on("answer", (data: { answer: RTCSessionDescriptionInit; targetId: string }) => {
      socket.to(data.targetId).emit("answer", {
        answer: data.answer,
        senderId: socket.id,
      });
    });

    socket.on("ice-candidate", (data: { candidate: RTCIceCandidateInit; targetId: string }) => {
      socket.to(data.targetId).emit("ice-candidate", {
        candidate: data.candidate,
        senderId: socket.id,
      });
    });

    socket.on("speech-transcript", async (data: { text: string; isFinal: boolean }) => {
      if (!currentRoom || !currentUser || !data.text.trim() || !data.isFinal) return;

      const room = rooms.get(currentRoom);
      if (!room) return;

      const recipients = Array.from(room.values()).filter((u) => u.socketId !== socket.id);

      await Promise.all(
        recipients.map(async (user) => {
          const needsTranslation = user.language !== currentUser!.language;
          const translated = needsTranslation
            ? await translateText(data.text, currentUser!.language, user.language)
            : data.text;

          let audioBase64: string | undefined;
          const wantsVoice = user.translationMode === "voice";

          if (needsTranslation && translated && wantsVoice) {
            try {
              const audio = await textToSpeech(translated);
              if (audio) audioBase64 = audio.toString("base64");
            } catch (e) {
              console.error("TTS failed:", e);
            }
          }

          io.to(user.socketId).emit("translation", {
            original: data.text,
            translated,
            sourceLang: currentUser!.language,
            targetLang: user.language,
            speaker: currentUser!.name,
            isFinal: true,
            audioBase64,
          });
        })
      );
    });

    socket.on("call-reject", (data: { roomId: string; callerId: string }) => {
      if (data?.callerId) {
        io.to(`user:${data.callerId}`).emit("call-rejected", { roomId: data.roomId });
      }
    });

    socket.on("call-ended", () => {
      if (currentRoom) {
        socket.to(currentRoom).emit("call-ended");
      }
    });

    socket.on("disconnect", () => {
      if (registeredUserId) {
        unregisterUserSocket(registeredUserId);
      }

      if (currentRoom) {
        const room = rooms.get(currentRoom);
        if (room) {
          room.delete(socket.id);
          if (room.size === 0) {
            rooms.delete(currentRoom);
          } else {
            const participants = Array.from(room.values()).map((u) => ({
              socketId: u.socketId,
              userId: u.userId,
              name: u.name,
              language: u.language,
              translationMode: u.translationMode,
              isHost: u.isHost,
            }));
            io.to(currentRoom).emit("room-users", participants);
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
