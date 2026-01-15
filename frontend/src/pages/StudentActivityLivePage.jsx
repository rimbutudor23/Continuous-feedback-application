import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../apiClient";

export default function StudentActivityLivePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const activityFromState = location.state?.activity || null;

  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [wsError, setWsError] = useState(null);
  const [lastFeedback, setLastFeedback] = useState(null);

  const [now, setNow] = useState(() => new Date());
  const wsRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    if (user.tip !== "student") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const token =
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    "";

  const wsUrl = useMemo(() => {
    const base =
      (API_BASE || "").replace(/^http/, "ws") || "ws://localhost:4000";
    return `${base}/ws?token=${encodeURIComponent(
      token
    )}&activityId=${encodeURIComponent(id)}`;
  }, [id, token]);

  useEffect(() => {
    if (!token) {
      setConnectionStatus("error");
      setWsError("Nu esti autentificat.");
      return;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setConnectionStatus("connecting");
    setWsError(null);

    ws.onopen = () => {
      setConnectionStatus("open");
    };

    ws.onclose = () => {
      setConnectionStatus("closed");
    };

    ws.onerror = () => {
      setConnectionStatus("error");
      setWsError("Nu se poate conecta la server.");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg || typeof msg.type !== "string") return;

        if (msg.type === "feedback_accepted") {
          setLastFeedback(msg.payload);
        }

        if (msg.type === "activity_ended") {
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 1500);
        }
      } catch (err) {
        console.error("[WS STUDENT] invalid message", err);
      }
    };

    return () => {
      try {
        ws.close();
      } catch (_) {}
    };
  }, [wsUrl, navigate, token]);

  if (!activityFromState) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-4 shadow-sm text-sm text-slate-700 max-w-md w-full">
          <div className="font-semibold mb-1">Nu pot deschide activitatea.</div>
          <p className="text-xs text-slate-500 mb-3">
            Intra din nou din pagina profesorului si apoi deschide live.
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard", { replace: true })}
            className="text-xs font-medium text-slate-600 border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-100"
          >
            Inapoi
          </button>
        </div>
      </div>
    );
  }

  const endTime = activityFromState.oraSfarsit
    ? new Date(activityFromState.oraSfarsit)
    : null;

  const remaining = useMemo(() => {
    if (!endTime || Number.isNaN(endTime.getTime())) {
      return null;
    }
    const diffMs = endTime.getTime() - now.getTime();
    if (diffMs <= 0) {
      return { minutes: 0, seconds: 0, isOver: true };
    }
    const totalSec = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return { minutes, seconds, isOver: false };
  }, [endTime, now]);

  useEffect(() => {
    if (remaining?.isOver) {
      navigate("/dashboard", { replace: true });
    }
  }, [remaining, navigate]);

  function sendFeedback(emoticon) {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    const emoNum = Number(emoticon);
    if (![1, 2, 3, 4].includes(emoNum)) return;

    const msg = {
      type: "send_feedback",
      payload: { emoticon: emoNum },
    };

    try {
      wsRef.current.send(JSON.stringify(msg));
    } catch (err) {
      console.error("[WS STUDENT] send error", err);
    }
  }

  const connLabel =
    connectionStatus === "connecting"
      ? "Conectare..."
      : connectionStatus === "open"
      ? "Conectat"
      : connectionStatus === "closed"
      ? "Deconectat"
      : "Eroare";

  const connColor =
    connectionStatus === "open"
      ? "text-emerald-600"
      : connectionStatus === "connecting"
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 mb-0.5">Live</div>
          <div className="text-sm font-semibold text-slate-900">
            {activityFromState.titlu || "(fara titlu)"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/dashboard", { replace: true })}
          className="text-xs font-medium text-slate-600 border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-100"
        >
          Iesi
        </button>
      </header>

      <main className="flex-1 px-4 py-4 max-w-3xl mx-auto w-full space-y-4">
        <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">Conexiune</div>
            <div className={`text-sm font-semibold ${connColor}`}>
              {connLabel}
            </div>
            {wsError && (
              <div className="text-[11px] text-red-600">{wsError}</div>
            )}
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-500">Timp ramas</div>
            {remaining ? (
              <div className="text-lg font-semibold text-slate-900">
                {remaining.minutes.toString().padStart(2, "0")}:
                {remaining.seconds.toString().padStart(2, "0")}
              </div>
            ) : (
              <div className="text-sm text-slate-500">N/A</div>
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 mb-1">
              Feedback
            </h2>
            <p className="text-xs text-slate-500">
              Apasa un emoticon. Poti trimite de mai multe ori.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <FeedbackButton
              label="1 - Nu inteleg"
              emoji="😕"
              color="bg-rose-500 hover:bg-rose-600"
              onClick={() => sendFeedback(1)}
              disabled={connectionStatus !== "open"}
            />
            <FeedbackButton
              label="2 - E greu"
              emoji="😐"
              color="bg-orange-500 hover:bg-orange-600"
              onClick={() => sendFeedback(2)}
              disabled={connectionStatus !== "open"}
            />
            <FeedbackButton
              label="3 - Inteleg"
              emoji="🙂"
              color="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => sendFeedback(3)}
              disabled={connectionStatus !== "open"}
            />
            <FeedbackButton
              label="4 - Totul e clar"
              emoji="😄"
              color="bg-blue-500 hover:bg-blue-600"
              onClick={() => sendFeedback(4)}
              disabled={connectionStatus !== "open"}
            />
          </div>

          {lastFeedback && (
            <div className="mt-2 text-xs text-slate-500">
              Ultimul:{" "}
              <span className="font-medium text-slate-900">
                nivel {lastFeedback.emoticon}
              </span>{" "}
              la{" "}
              {lastFeedback.createdAt
                ? new Date(lastFeedback.createdAt).toLocaleTimeString()
                : "-"}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function FeedbackButton({ label, emoji, color, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${color}`}
    >
      <span className="text-base">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}
