import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../apiClient";

function formatDateTime(dtStr) {
  if (!dtStr) return "-";
  const d = new Date(dtStr);
  if (Number.isNaN(d.getTime())) return String(dtStr);
  return d.toLocaleString("ro-RO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function ProfessorLinkPage() {
  const { profLinkToken } = useParams();
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(null);
  const [checkResult, setCheckResult] = useState(null);

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [joinSuccess, setJoinSuccess] = useState(null);

  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    if (checkResult?.alreadyJoined) {
      setIsEnrolled(true);
    }
  }, [checkResult?.alreadyJoined]);

  useEffect(() => {
    if (user && user.tip === "profesor") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const isStudent = user && user.tip === "student";

  async function handleStudentLogin(e) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const ident = identifier.trim();
      await login(ident, password);
    } catch (err) {
      console.error(err);
      setLoginError(
        err?.data?.error?.message || "Autentificare esuata. Verifica datele."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleCheck(e) {
    e.preventDefault();
    setCheckError(null);
    setCheckResult(null);
    setJoinError(null);
    setJoinSuccess(null);

    if (!code.trim()) {
      setCheckError("Introdu codul activitatii.");
      return;
    }

    setChecking(true);
    try {
      const resp = await apiRequest("/student/activities/check", {
        method: "POST",
        body: JSON.stringify({
          profLinkToken: String(profLinkToken),
          cod: code.trim().toUpperCase(),
        }),
      });

      if (!resp.success) {
        throw new Error(
          resp?.error?.message || "Cererea de verificare a esuat."
        );
      }

      setCheckResult(resp);
    } catch (err) {
      console.error(err);
      setCheckError(
        err?.data?.error?.message ||
          "Nu s-a putut verifica activitatea. Verifica codul sau incearca din nou."
      );
    } finally {
      setChecking(false);
    }
  }

  async function handleEnroll() {
    if (!checkResult?.activity) return;

    setJoinError(null);
    setJoinSuccess(null);
    setJoining(true);

    try {
      const resp = await apiRequest("/student/activities/join", {
        method: "POST",
        body: JSON.stringify({
          profLinkToken: String(profLinkToken),
          cod: code.trim().toUpperCase(),
        }),
      });

      if (!resp.success) {
        throw new Error(
          resp?.error?.message || "Inscrierea la activitate a esuat."
        );
      }

      setIsEnrolled(true);
      setJoinSuccess("Inscriere facuta.");
    } catch (err) {
      console.error(err);
      setJoinError(
        err?.data?.error?.message ||
          "Nu s-a putut face inscrierea. Incearca din nou."
      );
    } finally {
      setJoining(false);
    }
  }

  async function handleJoinLive() {
    if (!checkResult?.activity) return;

    setJoinError(null);
    setJoinSuccess(null);
    setJoining(true);

    try {
      const resp = await apiRequest("/student/activities/join", {
        method: "POST",
        body: JSON.stringify({
          profLinkToken: String(profLinkToken),
          cod: code.trim().toUpperCase(),
        }),
      });

      if (!resp.success) {
        throw new Error(
          resp?.error?.message || "Join-ul in activitate a esuat."
        );
      }

      const act = checkResult.activity;
      const activityId = act.activitateId || act.id;

      navigate(`/student/activities/${activityId}/live`, {
        state: { activity: act },
      });
    } catch (err) {
      console.error(err);
      setJoinError(
        err?.data?.error?.message ||
          "Nu s-a putut deschide activitatea. Incearca din nou."
      );
    } finally {
      setJoining(false);
    }
  }

  const canJoinNow =
    checkResult?.access?.canJoinNow === true && !!checkResult?.activity;
  const canEnrollNow =
    checkResult?.access?.canEnrollNow === true && !!checkResult?.activity;

  const showEnrollButton = canEnrollNow && !isEnrolled && !canJoinNow;
  const showJoinButton = canJoinNow;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 px-6 py-6 max-w-xl mx-auto w-full">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Intrare student in activitate
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Autentifica-te ca student, apoi introdu codul activitatii.
            </p>
          </div>

          {!isStudent && (
            <form
              onSubmit={handleStudentLogin}
              className="space-y-3 border border-slate-200 rounded-md p-3 bg-slate-50"
            >
              <div className="text-xs font-semibold text-slate-800 mb-1">
                Autentificare
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Username sau email
                </label>
                <input
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Parola
                </label>
                <input
                  type="password"
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {loginError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loginLoading ? "Se autentifica..." : "Intra in cont"}
              </button>

              {user && user.tip && user.tip !== "student" && (
                <div className="text-[11px] text-slate-500 mt-2">
                  Esti autentificat ca <b>{user.tip}</b>. Pentru acces aici
                  trebuie cont de student.
                  <button
                    type="button"
                    onClick={logout}
                    className="ml-1 text-[11px] font-medium text-indigo-600 hover:underline"
                  >
                    Logout
                  </button>
                </div>
              )}
            </form>
          )}

          {isStudent && (
            <>
              <form onSubmit={handleCheck} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Codul activitatii
                  </label>
                  <input
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase tracking-[0.12em]"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Ex: ABCD1234"
                  />
                </div>

                {checkError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {checkError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={checking}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {checking ? "Se verifica..." : "Verifica activitatea"}
                </button>
              </form>

              {checkResult?.activity && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <h2 className="text-xs font-semibold text-slate-800 mb-2">
                    Detalii activitate
                  </h2>
                  <div className="border border-slate-200 rounded-md p-3 text-xs space-y-2">
                    <div className="text-sm font-semibold text-slate-900">
                      {checkResult.activity.titlu || "(fara titlu)"}
                    </div>
                    {checkResult.activity.descriere && (
                      <div className="text-slate-600">
                        {checkResult.activity.descriere}
                      </div>
                    )}

                    <div className="text-slate-500">
                      Acces:{" "}
                      <span className="font-medium text-slate-800">
                        {formatDateTime(checkResult.activity.accesibilDeLa)} –{" "}
                        {formatDateTime(checkResult.activity.accesibilPanaLa)}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      Activitate:{" "}
                      <span className="font-medium text-slate-800">
                        {formatDateTime(checkResult.activity.oraInceput)} –{" "}
                        {formatDateTime(checkResult.activity.oraSfarsit)}
                      </span>
                    </div>

                    <div className="text-slate-500">
                      Status:{" "}
                      <span className="font-medium text-slate-800">
                        {checkResult.summary?.status || "-"}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      Esti inscris:{" "}
                      <span className="font-medium text-slate-800">
                        {isEnrolled ? "da" : "nu"}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      Poti intra acum:{" "}
                      <span
                        className={`font-medium ${
                          checkResult.access?.canJoinNow
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {checkResult.access?.canJoinNow ? "da" : "nu"}
                      </span>
                    </div>
                    {checkResult.access?.reason && (
                      <div className="text-[11px] text-slate-500">
                        Motiv: {checkResult.access.reason}
                      </div>
                    )}

                    {joinError && (
                      <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1.5 mt-1">
                        {joinError}
                      </div>
                    )}
                    {joinSuccess && (
                      <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1.5 mt-1">
                        {joinSuccess}
                      </div>
                    )}

                    {showEnrollButton && (
                      <button
                        type="button"
                        disabled={joining}
                        onClick={handleEnroll}
                        className="mt-2 inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {joining ? "Se inscrie..." : "Inscriere"}
                      </button>
                    )}

                    {showJoinButton && (
                      <button
                        type="button"
                        disabled={joining}
                        onClick={handleJoinLive}
                        className="mt-2 inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {joining ? "Se deschide..." : "Intra live"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
