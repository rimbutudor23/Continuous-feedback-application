import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE, apiRequest } from "../apiClient";

function buildWsUrl(activityId, token) {
  const base = API_BASE.replace(/\/$/, "");
  const wsBase = base.startsWith("https")
    ? base.replace(/^https/, "wss")
    : base.replace(/^http/, "ws");

  const params = new URLSearchParams({
    token,
    activityId: String(activityId),
  });

  return `${wsBase}/ws?${params.toString()}`;
}

export default function TeacherActivityLivePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [activity, setActivity] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [activityError, setActivityError] = useState(null);

  const [wsStatus, setWsStatus] = useState("connecting");
  const [activeStudents, setActiveStudents] = useState(0);
  const [hasEnded, setHasEnded] = useState(false);

  const [emoticonCounts, setEmoticonCounts] = useState({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  });
  const [timeline, setTimeline] = useState([]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (user && user.tip !== "profesor") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function loadActivity() {
      setLoadingActivity(true);
      setActivityError(null);
      try {
        const data = await apiRequest("/prof/activities", {
          method: "GET",
        });

        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.activities)
          ? data.activities
          : [];

        const found =
          arr.find((a) => String(a.activitateId || a.id) === String(id)) ||
          null;

        if (!found) {
          setActivityError("Activitatea nu a fost gasita.");
        } else {
          setActivity(found);
        }
      } catch (err) {
        console.error(err);
        setActivityError("Nu s-au putut incarca detaliile activitatii.");
      } finally {
        setLoadingActivity(false);
      }
    }

    loadActivity();
  }, [id]);

  const endTimestamp = useMemo(() => {
    if (!activity?.oraSfarsit) return null;
    const d = new Date(activity.oraSfarsit);
    if (Number.isNaN(d.getTime())) return null;
    return d.getTime();
  }, [activity]);

  const remainingMs = endTimestamp ? endTimestamp - now : null;
  const remaining = useMemo(() => {
    if (remainingMs == null) return null;
    if (remainingMs <= 0) return { expired: true, text: "00:00" };

    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return { expired: false, text: `${mm}:${ss}` };
  }, [remainingMs]);

  useEffect(() => {
    if (remaining?.expired && !hasEnded) {
      setHasEnded(true);
      navigate("/dashboard", { replace: true });
    }
  }, [remaining, hasEnded, navigate]);

  useEffect(() => {
    if (!token || !id) return;
    if (!activity) return;

    const wsUrl = buildWsUrl(id, token);
    const ws = new WebSocket(wsUrl);

    setWsStatus("connecting");

    ws.onopen = () => {
      setWsStatus("open");
    };

    ws.onclose = () => {
      setWsStatus("closed");
    };

    ws.onerror = () => {
      setWsStatus("error");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg || typeof msg.type !== "string") return;

        if (msg.type === "activity_status") {
          const count = msg.payload?.activeStudentsCount ?? 0;
          const ended = !!msg.payload?.hasEnded;
          setActiveStudents(count);
          if (ended) {
            setHasEnded(true);
            navigate("/dashboard", { replace: true });
          }
        }

        if (msg.type === "activity_ended") {
          setHasEnded(true);
          navigate("/dashboard", { replace: true });
        }

        if (msg.type === "feedback_received") {
          const { emoticon, createdAt } = msg.payload || {};

          if ([1, 2, 3, 4].includes(Number(emoticon))) {
            setEmoticonCounts((prev) => ({
              ...prev,
              [emoticon]: (prev[emoticon] || 0) + 1,
            }));

            setTimeline((prev) => [
              { emoticon, createdAt },
              ...prev.slice(0, 49),
            ]);
          }
        }
      } catch (err) {
        console.error("[WS] invalid message", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [token, id, activity, navigate]);

  if (loadingActivity) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600">Se incarca activitatea...</div>
      </div>
    );
  }

  if (activityError || !activity) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-4 shadow-sm text-sm text-slate-700">
          <div className="mb-3">
            {activityError || "Activitatea nu exista."}
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Inapoi la dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalFeedback =
    emoticonCounts[1] +
    emoticonCounts[2] +
    emoticonCounts[3] +
    emoticonCounts[4];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 mb-0.5">
            Activitate live profesor
          </div>
          <div className="text-sm font-semibold text-slate-900">
            {activity.titlu || "(fara titlu)"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            Conexiune:{" "}
            <span
              className={
                wsStatus === "open"
                  ? "text-emerald-600"
                  : wsStatus === "connecting"
                  ? "text-amber-600"
                  : "text-red-600"
              }
            >
              {wsStatus}
            </span>
          </div>
          <Link
            to="/dashboard"
            className="text-xs font-medium text-slate-600 border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-100"
          >
            Iesire
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-6xl mx-auto w-full space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
            <div className="text-xs font-medium text-slate-600 mb-1">
              Timp ramas
            </div>
            <div className="text-3xl font-semibold text-slate-900 mb-1">
              {remaining?.text || "--:--"}
            </div>
            <div className="text-xs text-slate-500">
              {hasEnded || remaining?.expired
                ? "Activitatea ar trebui sa fie incheiata."
                : "Cronometru calculat local din ora de sfarsit."}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
            <div className="text-xs font-medium text-slate-600 mb-1">
              Studenti activi
            </div>
            <div className="text-3xl font-semibold text-slate-900 mb-1">
              {activeStudents}
            </div>
            <div className="text-xs text-slate-500">
              Numarul se actualizeaza automat cand studentii intra / ies.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
            <div className="text-xs font-medium text-slate-600 mb-1">
              Total feedback-uri
            </div>
            <div className="text-3xl font-semibold text-slate-900 mb-1">
              {totalFeedback}
            </div>
            <div className="text-xs text-slate-500">
              Feedback-uri primite in aceasta sesiune live.
            </div>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            Distributie feedback
          </h2>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[1, 2, 3, 4].map((e) => {
              const count = emoticonCounts[e] || 0;
              return (
                <div
                  key={e}
                  className="border border-slate-200 rounded-md py-3 px-2"
                >
                  <div className="text-xs text-slate-500 mb-1">
                    Emoticon {e}
                  </div>
                  <div className="text-xl font-semibold text-slate-900">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">
              Feedback live (ultimele 50)
            </h2>
            <div className="text-[11px] text-slate-500">
              cel mai recent la inceput
            </div>
          </div>
          {timeline.length === 0 ? (
            <div className="text-xs text-slate-500">
              Inca nu a fost trimis niciun feedback.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-md">
              <table className="min-w-full text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium text-slate-600">
                      Emoticon
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-slate-600">
                      Moment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((item, idx) => {
                    const d = item.createdAt ? new Date(item.createdAt) : null;
                    const ts =
                      d && !Number.isNaN(d.getTime())
                        ? d.toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        : "-";

                    return (
                      <tr
                        key={idx}
                        className={
                          idx === 0
                            ? "bg-indigo-50 border-b border-slate-100"
                            : "border-b border-slate-100"
                        }
                      >
                        <td className="px-2 py-1 text-slate-800">
                          Emoticon {item.emoticon}
                        </td>
                        <td className="px-2 py-1 text-slate-500">{ts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
