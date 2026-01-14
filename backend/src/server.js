require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const url = require("url");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const { Profil, Activitate, Participare, Feedback } = require("../models");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

const authRoutes = require("./routes/authRoutes");
const profCodesRoutes = require("./routes/profCodesRoutes");
const profActivitiesRoutes = require("./routes/profActivitiesRoutes");
const studentActivitiesRoutes = require("./routes/studentActivitiesRoutes");
const accountRoutes = require("./routes/accountRoutes");

app.use("/auth", authRoutes);
app.use("/prof/codes", profCodesRoutes);
app.use("/prof/activities", profActivitiesRoutes);
app.use("/student/activities", studentActivitiesRoutes);
app.use("/account", accountRoutes);

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;

const server = http.createServer(app);

const wss = new WebSocket.Server({
  server,
  path: "/ws",
});

const activityRooms = new Map();

function heartbeat() {
  this.isAlive = true;
}

function getOrCreateRoom(activityId) {
  const key = String(activityId);
  if (!activityRooms.has(key)) {
    activityRooms.set(key, {
      professors: new Set(),
      students: new Set(),
    });
  }
  return activityRooms.get(key);
}

function removeFromRoom(activityId, ws) {
  const key = String(activityId);
  const room = activityRooms.get(key);
  if (!room) return;

  room.professors.delete(ws);
  room.students.delete(ws);

  if (room.professors.size === 0 && room.students.size === 0) {
    activityRooms.delete(key);
  }
}

function broadcastToProfessors(activityId, messageObj) {
  const key = String(activityId);
  const room = activityRooms.get(key);
  if (!room) return;

  const json = JSON.stringify(messageObj);
  for (const client of room.professors) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

function broadcastToAll(activityId, messageObj) {
  const key = String(activityId);
  const room = activityRooms.get(key);
  if (!room) return;

  const json = JSON.stringify(messageObj);
  const all = [...room.professors, ...room.students];

  for (const client of all) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

wss.on("connection", async (ws, req) => {
  ws.isAlive = true;
  ws.on("pong", heartbeat);

  try {
    const parsedUrl = url.parse(req.url, true);
    const { token, activityId } = parsedUrl.query || {};

    console.log("[WS CONNECT] url:", req.url);
    console.log("[WS CONNECT] query:", parsedUrl.query);

    if (!token || !activityId) {
      console.log("[WS REJECT] missing token or activityId");
      ws.close(4001, "Missing token or activityId");
      return;
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
      console.log("[WS JWT PAYLOAD]", payload);
    } catch (err) {
      console.log("[WS REJECT] invalid token:", err.message);
      ws.close(4002, "Invalid token");
      return;
    }

    const profilId = payload.profilId ?? payload.id;
    const tip = payload.tip;

    if (!profilId || !tip) {
      console.log(
        "[WS REJECT] invalid token payload, profilId/tip lipsesc",
        payload
      );
      ws.close(4003, "Invalid token payload");
      return;
    }

    const activity = await Activitate.findByPk(activityId);

    if (!activity) {
      ws.close(4004, "Activity not found");
      return;
    }

    if (tip === "profesor") {
      if (activity.profesorId !== profilId) {
        ws.close(4005, "Not owner of activity");
        return;
      }
    } else if (tip === "student") {
      const participare = await Participare.findOne({
        where: {
          studentId: profilId,
          activitateId: activityId,
        },
      });

      if (!participare) {
        ws.close(4006, "No participation for activity");
        return;
      }

      await participare.update({ lastActionAt: new Date() });
    } else {
      ws.close(4007, "Unknown role");
      return;
    }

    ws.profilId = profilId;
    ws.tip = tip;
    ws.activityId = Number(activityId);

    const room = getOrCreateRoom(activityId);

    if (tip === "profesor") {
      room.professors.add(ws);
    } else {
      room.students.add(ws);
    }

    const now = new Date();
    const hasEnded = new Date(activity.oraSfarsit) <= now;

    const statusPayload = {
      type: "activity_status",
      payload: {
        activityId: Number(activityId),
        activeStudentsCount: room.students.size,
        hasEnded,
      },
    };
    broadcastToProfessors(activityId, statusPayload);

    if (hasEnded) {
      const endedPayload = {
        type: "activity_ended",
        payload: {
          activityId: Number(activityId),
        },
      };
      broadcastToAll(activityId, endedPayload);
    }

    ws.on("message", (data) => {
      handleWsMessage(ws, data);
    });

    ws.on("close", () => {
      handleWsClose(ws);
    });
  } catch (err) {
    console.error("[WS] connection error", err);
    try {
      ws.close(1011, "Internal error");
    } catch (_) {}
  }
});

async function handleWsMessage(ws, data) {
  let msg;
  try {
    msg = JSON.parse(data.toString());
  } catch (err) {
    console.warn("[WS] invalid JSON message");
    return;
  }

  if (!msg || typeof msg.type !== "string") {
    return;
  }

  if (msg.type === "ping") {
    const resp = {
      type: "pong",
      payload: {
        ts: Date.now(),
      },
    };
    try {
      ws.send(JSON.stringify(resp));
    } catch (_) {}
    return;
  }

  if (msg.type === "send_feedback") {
    await handleSendFeedback(ws, msg.payload || {});
    return;
  }
}

async function handleSendFeedback(ws, payload) {
  try {
    if (!ws.activityId || !ws.profilId || !ws.tip) {
      return;
    }

    if (ws.tip !== "student") {
      return;
    }

    const activityId = ws.activityId;
    const studentId = ws.profilId;
    const { emoticon } = payload;

    const emoNum = Number(emoticon);
    if (![1, 2, 3, 4].includes(emoNum)) {
      return;
    }

    const activity = await Activitate.findByPk(activityId);
    if (!activity) {
      return;
    }

    const now = new Date();
    const hasEnded = new Date(activity.oraSfarsit) <= now;

    if (hasEnded) {
      const endedPayload = {
        type: "activity_ended",
        payload: {
          activityId,
        },
      };
      broadcastToAll(activityId, endedPayload);
      return;
    }

    const participare = await Participare.findOne({
      where: {
        studentId,
        activitateId: activityId,
      },
    });

    if (!participare) {
      return;
    }

    const fb = await Feedback.create({
      activitateId: activityId,
      emoticon: emoNum,
    });

    await participare.update({
      lastActionAt: now,
    });

    const payloadForProf = {
      type: "feedback_received",
      payload: {
        activityId,
        studentId,
        emoticon: emoNum,
        createdAt: fb.createdAt,
      },
    };
    broadcastToProfessors(activityId, payloadForProf);

    const confirm = {
      type: "feedback_accepted",
      payload: {
        activityId,
        emoticon: emoNum,
        createdAt: fb.createdAt,
      },
    };
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(confirm));
      }
    } catch (_) {}
  } catch (err) {
    console.error("[WS] handleSendFeedback error", err);
  }
}

function handleWsClose(ws) {
  try {
    const activityId = ws.activityId;
    const tip = ws.tip;

    if (!activityId || !tip) {
      return;
    }

    removeFromRoom(activityId, ws);

    const room = activityRooms.get(String(activityId));
    const activeStudentsCount = room ? room.students.size : 0;

    const statusPayload = {
      type: "activity_status",
      payload: {
        activityId,
        activeStudentsCount,
        hasEnded: false,
      },
    };

    broadcastToProfessors(activityId, statusPayload);
  } catch (err) {
    console.error("[WS] handleWsClose error", err);
  }
}

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", function close() {
  clearInterval(interval);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[SERVER] Listening on port ${PORT}`);
});

// psql 'postgresql://neondb_owner:npg_bfpvKR5W0VBQ@ep-red-haze-agevpz31-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
