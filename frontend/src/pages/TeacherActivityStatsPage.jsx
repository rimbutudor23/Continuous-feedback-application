import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../apiClient";
import { useAuth } from "../context/AuthContext";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const PIE_COLORS = ["#f97373", "#fb923c", "#22c55e", "#3b82f6"];

const EMOJI_CONFIG = [
  {
    id: "1",
    key: "emo1",
    emoji: "😕",
    label: "Nu inteleg",
    color: PIE_COLORS[0],
  },
  { id: "2", key: "emo2", emoji: "😐", label: "E greu", color: PIE_COLORS[1] },
  { id: "3", key: "emo3", emoji: "🙂", label: "Inteleg", color: PIE_COLORS[2] },
  {
    id: "4",
    key: "emo4",
    emoji: "😄",
    label: "Totul e clar",
    color: PIE_COLORS[3],
  },
];

export default function TeacherActivityStatsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && user.tip !== "profesor") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      setError(null);
      try {
        const resp = await apiRequest(`/prof/activities/${id}/stats`, {
          method: "GET",
        });
        if (!resp || !resp.success) {
          throw new Error("stats_error");
        }
        setData(resp);
      } catch (err) {
        console.error(err);
        setError("Nu pot incarca statisticile.");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [id]);

  const activity = data?.activity || null;
  const summary = data?.summary || null;
  const feedbackByEmoticon = data?.feedbackByEmoticon || null;
  const feedbackTimelineRaw = data?.feedbackTimelineRaw || null;

  const feedbackTimelineByMinute = data?.feedbackTimelineByMinute || null;

  function formatDateTime(dt) {
    if (!dt) return "-";
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const pieData = useMemo(() => {
    return EMOJI_CONFIG.map((cfg) => ({
      id: cfg.id,
      name: `${cfg.emoji} ${cfg.label}`,
      value: Number(feedbackByEmoticon?.[cfg.id] || 0),
    }));
  }, [feedbackByEmoticon]);

  const minuteChartData = useMemo(() => {
    const startDt = activity?.oraInceput ? new Date(activity.oraInceput) : null;

    if (
      Array.isArray(feedbackTimelineByMinute) &&
      feedbackTimelineByMinute.length > 0
    ) {
      const base =
        startDt && !Number.isNaN(startDt.getTime())
          ? startDt
          : new Date(feedbackTimelineByMinute[0].time);

      if (Number.isNaN(base.getTime())) {
        return [];
      }

      return feedbackTimelineByMinute.map((bucket, index) => {
        const t = bucket.time ? new Date(bucket.time) : null;
        let minuteIndex = index;
        if (t && !Number.isNaN(t.getTime())) {
          const diffMs = t.getTime() - base.getTime();
          minuteIndex = Math.max(0, Math.floor(diffMs / 60000));
        }

        const by = bucket.byEmoticon || {};
        const emoCounts = {
          emo1: Number(by["1"] || 0),
          emo2: Number(by["2"] || 0),
          emo3: Number(by["3"] || 0),
          emo4: Number(by["4"] || 0),
        };
        const totalFromBucket =
          bucket.total != null ? Number(bucket.total) : null;
        const totalComputed =
          emoCounts.emo1 + emoCounts.emo2 + emoCounts.emo3 + emoCounts.emo4;
        const total = totalFromBucket != null ? totalFromBucket : totalComputed;

        return {
          minute: minuteIndex,
          label: String(minuteIndex),
          total,
          ...emoCounts,
        };
      });
    }

    if (!feedbackTimelineRaw || !Array.isArray(feedbackTimelineRaw)) {
      return [];
    }

    if (!startDt || Number.isNaN(startDt.getTime())) {
      return [];
    }

    const minuteMap = new Map();

    for (const item of feedbackTimelineRaw) {
      if (!item?.time) continue;
      const t = new Date(item.time);
      if (Number.isNaN(t.getTime())) continue;

      const diffMs = t.getTime() - startDt.getTime();
      const idx = Math.floor(diffMs / 60000);
      if (idx < 0) continue;

      const emoId = String(item.emoticon);
      const key = idx;

      if (!minuteMap.has(key)) {
        minuteMap.set(key, {
          minute: idx,
          label: String(idx),
          total: 0,
          emo1: 0,
          emo2: 0,
          emo3: 0,
          emo4: 0,
        });
      }

      const bucket = minuteMap.get(key);
      bucket.total += 1;
      if (emoId === "1") bucket.emo1 += 1;
      else if (emoId === "2") bucket.emo2 += 1;
      else if (emoId === "3") bucket.emo3 += 1;
      else if (emoId === "4") bucket.emo4 += 1;
    }

    return Array.from(minuteMap.values()).sort((a, b) => a.minute - b.minute);
  }, [feedbackTimelineByMinute, feedbackTimelineRaw, activity]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600">Incarcare...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-4 shadow-sm text-sm text-slate-700">
          <div className="mb-3">{error || "Nu exista date de afisat."}</div>
          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Inapoi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 mb-0.5">Statistici</div>
          <div className="text-sm font-semibold text-slate-900">
            {activity?.titlu || "(fara titlu)"}
          </div>
        </div>
        <Link
          to="/dashboard"
          className="text-xs font-medium text-slate-600 border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-100"
        >
          Inapoi
        </Link>
      </header>

      <main className="flex-1 px-4 py-4 max-w-6xl mx-auto w-full space-y-4">
        <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            Detalii activitate
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
            <div>
              <dt className="text-slate-500">Titlu</dt>
              <dd className="text-slate-900">{activity?.titlu || "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Descriere</dt>
              <dd className="text-slate-900">{activity?.descriere || "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Inceput</dt>
              <dd className="text-slate-900">
                {formatDateTime(activity?.oraInceput)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Sfarsit</dt>
              <dd className="text-slate-900">
                {formatDateTime(activity?.oraSfarsit)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Acces de la</dt>
              <dd className="text-slate-900">
                {formatDateTime(activity?.accesibilDeLa)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Acces pana la</dt>
              <dd className="text-slate-900">
                {formatDateTime(activity?.accesibilPanaLa)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Cod activitate</dt>
              <dd className="text-slate-900">
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                  {activity?.codContinut || "-"}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="text-slate-900">{summary?.status || "-"}</dd>
            </div>
          </dl>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Rezumat</h2>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="border border-slate-200 rounded-md p-3">
              <div className="text-xs text-slate-500 mb-1">Participanti</div>
              <div className="text-xl font-semibold text-slate-900">
                {summary?.participantsCount ?? 0}
              </div>
              <div className="text-[11px] text-slate-500">
                {summary?.participantsWithFeedbackCount ?? 0} au trimis
                feedback.
              </div>
            </div>
            <div className="border border-slate-200 rounded-md p-3">
              <div className="text-xs text-slate-500 mb-1">Total feedback</div>
              <div className="text-xl font-semibold text-slate-900">
                {summary?.feedbackCount ?? 0}
              </div>
              <div className="text-[11px] text-slate-500">
                Medie/participant:{" "}
                {summary?.avgFeedbackPerParticipant != null
                  ? Number(summary.avgFeedbackPerParticipant).toFixed(2)
                  : "-"}
              </div>
            </div>
            <div className="border border-slate-200 rounded-md p-3">
              <div className="text-xs text-slate-500 mb-1">Durata</div>
              <div className="text-xl font-semibold text-slate-900">
                {summary?.durationMinutes ?? "-"} min
              </div>
              <div className="text-[11px] text-slate-500">
                Feedback/min:{" "}
                {summary?.feedbackPerMinute != null
                  ? Number(summary.feedbackPerMinute).toFixed(2)
                  : "-"}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            Distributie
          </h2>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-full md:w-1/2" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={1}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell
                        key={`cell-${entry.id || idx}`}
                        fill={PIE_COLORS[idx % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value, name) => [`${value}`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1">
              <ul className="space-y-2 text-xs">
                {pieData.map((entry, idx) => (
                  <li key={entry.name} className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                      }}
                    />
                    <span className="text-slate-700">{entry.name}</span>
                    <span className="ml-auto font-mono text-slate-900">
                      {entry.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">Pe minute</h2>

            <div className="text-[11px] text-slate-500">Minute de la start</div>
          </div>

          {minuteChartData.length === 0 ? (
            <div className="text-xs text-slate-500">
              Nu exista date pentru grafic.
            </div>
          ) : (
            <div className="w-full" style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={minuteChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    formatter={(value, name) => [`${value}`, "Total"]}
                    labelFormatter={(label) => `Minutul ${label}`}
                  />
                  {EMOJI_CONFIG.map((cfg) => (
                    <Bar
                      key={cfg.key}
                      dataKey={cfg.key}
                      stackId="a"
                      fill={cfg.color}
                      name={`${cfg.emoji} ${cfg.label}`}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
