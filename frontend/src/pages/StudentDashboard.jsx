import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../apiClient";
import { useAuth } from "../context/AuthContext";

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("history");

  useEffect(() => {
    if (user && user.tip !== "student") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="max-w-5xl mx-auto w-full space-y-4">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`px-3 py-1.5 rounded-md ${
            activeTab === "history"
              ? "bg-indigo-600 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Istoric
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("account")}
          className={`px-3 py-1.5 rounded-md ${
            activeTab === "account"
              ? "bg-indigo-600 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Cont
        </button>
      </div>

      {activeTab === "history" && <StudentHistoryPanel />}
      {activeTab === "account" && <StudentAccountPanel />}
    </div>
  );
}

function StudentHistoryPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      setError(null);
      try {
        const resp = await apiRequest("/student/activities/history", {
          method: "GET",
        });

        const list =
          (resp && resp.success && Array.isArray(resp.activities)
            ? resp.activities
            : Array.isArray(resp)
            ? resp
            : []) || [];

        setItems(list);
      } catch (err) {
        console.error(err);
        setError("Nu pot incarca istoricul.");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

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

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800 mb-3">Istoric</h2>

      {loading ? (
        <div className="text-sm text-slate-500">Incarcare...</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-slate-500">
          Nu ai activitati in istoric.
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 text-xs">
          {items.map((it) => (
            <div
              key={it.participareId || it.id}
              className="border border-slate-200 rounded-md p-3 hover:border-indigo-200 transition"
            >
              <div className="text-sm font-semibold text-slate-900">
                {it.titlu || "(fara titlu)"}
              </div>
              {it.descriere && (
                <div className="text-slate-600 mt-0.5">{it.descriere}</div>
              )}
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-slate-500">
                <div>
                  <span className="font-medium text-slate-600">
                    Ultima actiune:
                  </span>{" "}
                  {formatDateTime(it.lastAccessAt || it.lastActionAt)}
                </div>
                <div>
                  <span className="font-medium text-slate-600">
                    Cod activitate:
                  </span>{" "}
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                    {it.codContinut || "-"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StudentAccountPanel() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [username, setUsername] = useState(
    user?.username || user?.numeUtilizator || ""
  );
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    async function loadAccount() {
      try {
        setLoading(true);
        const data = await apiRequest("/account", { method: "GET" });
        const profil = data.user || data;
        if (profil) {
          setUsername(profil.username || profil.numeUtilizator || "");
          setEmail(profil.email || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const body = {};
      if (username.trim()) {
        body.numeUtilizator = username.trim();
      }
      if (email.trim()) {
        body.email = email.trim();
      }
      if (currentPassword && newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const resp = await apiRequest("/account", {
        method: "PUT",
        body: JSON.stringify(body),
      });

      const updatedUser = resp.user || resp;
      if (updatedUser && updatedUser.email) {
        sessionStorage.setItem("authUser", JSON.stringify(updatedUser));
      }

      setSuccess("Salvat.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      console.error(err);
      setError(
        err?.data?.error?.message || "Nu s-a putut salva. Verifica datele."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    const ok = window.confirm("Stergi contul definitiv?");
    if (!ok) return;

    try {
      await apiRequest("/account", { method: "DELETE" });
      logout();
    } catch (err) {
      console.error(err);
      alert("Nu s-a putut sterge.");
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Cont</h3>
        <p className="text-xs text-slate-500">Editeaza datele contului.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-3 max-w-md">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Username
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Parola curenta
            </label>
            <input
              type="password"
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Parola noua
            </label>
            <input
              type="password"
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Se salveaza..." : "Salveaza"}
        </button>
      </form>

      <div className="border-t border-slate-200 pt-4 mt-2">
        <h4 className="text-xs font-semibold text-red-700 mb-2">
          Zona periculoasa
        </h4>
        <p className="text-xs text-slate-500 mb-2">
          Stergerea contului va elimina contul si istoricul.
        </p>
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="inline-flex items-center rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
        >
          Sterge contul
        </button>
      </div>
    </section>
  );
}
