import { useEffect, useState } from "react";
import { apiRequest } from "../apiClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TeacherActivitiesPanel from "./TeacherActivitiesPanel";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const TABS = [
  { id: "activities", label: "Activitati" },
  { id: "codes", label: "Coduri personale" },
  { id: "profile", label: "Detalii cont" },
];

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState("activities");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">
        Dashboard profesor
      </h2>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 text-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={classNames(
                "pb-2 border-b-2 font-medium",
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "activities" && <TeacherActivitiesPanel />}
      {activeTab === "codes" && <TeacherCodesPanel />}
      {activeTab === "profile" && <TeacherProfilePanel />}
    </div>
  );
}

function TeacherCodesPanel() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [content, setContent] = useState("");

  async function loadCodes() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest("/prof/codes", {
        method: "GET",
      });

      if (data.success && Array.isArray(data.codes)) {
        setCodes(data.codes);
      } else if (Array.isArray(data)) {
        setCodes(data);
      } else {
        setCodes([]);
      }
    } catch (err) {
      console.error(err);
      setError("Nu s-au putut incarca codurile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCodes();
  }, []);

  async function handleCreateCode(e) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const body = {};
      if (content.trim()) {
        body.continut = content.trim();
      }

      const data = await apiRequest("/prof/codes", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!data.success) {
        throw new Error("Eroare creare cod");
      }

      setContent("");
      await loadCodes();
    } catch (err) {
      console.error(err);
      setCreateError("Nu s-a putut crea codul. Verifica daca este unic.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteCode(codId) {
    if (!window.confirm("Sigur vrei sa stergi acest cod?")) return;

    try {
      await apiRequest(`/prof/codes/${codId}`, {
        method: "DELETE",
      });
      await loadCodes();
    } catch (err) {
      console.error(err);
      alert("Nu s-a putut sterge codul.");
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Coduri personale
          </h3>
          <button
            type="button"
            onClick={loadCodes}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Se incarca...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : codes.length === 0 ? (
          <div className="text-sm text-slate-500">
            Nu exista coduri inca. Creeaza unul in dreapta.
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-[480px] pr-1">
            {codes.map((code) => (
              <div
                key={code.codId || code.id}
                className="border border-slate-200 rounded-md px-3 py-2 flex items-center justify-between"
              >
                <div>
                  <div className="font-mono text-xs bg-slate-100 inline-block px-2 py-0.5 rounded">
                    {code.continut}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {code.esteAleatoriu
                      ? "Generat automat"
                      : "Definit de profesor"}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-[11px] text-red-600 hover:text-red-700"
                  onClick={() => handleDeleteCode(code.codId || code.id)}
                >
                  Sterge
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">
          Creeaza cod nou
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Daca lasi campul gol, se va genera un cod aleatoriu de 8 caractere.
        </p>

        <form onSubmit={handleCreateCode} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Continut cod (optional)
            </label>
            <input
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
              value={content}
              onChange={(e) => setContent(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="EX: FEEDBACK1"
            />
          </div>

          {createError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {createError}
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {creating ? "Se creeaza..." : "Creeaza cod"}
          </button>
        </form>
      </section>
    </div>
  );
}

function TeacherProfilePanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  const [profLinkUrl, setProfLinkUrl] = useState(user?.profLinkUrl || "");

  useEffect(() => {
    async function loadAccount() {
      try {
        setLoading(true);
        const data = await apiRequest("/account", { method: "GET" });
        const profil = data.user || data;
        if (profil) {
          setUsername(profil.username || profil.numeUtilizator || "");
          setEmail(profil.email || "");
          +setProfLinkUrl(profil.profLinkUrl || "");
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
        body.username = username.trim();
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

      setSuccess("Profil actualizat cu succes.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      console.error(err);
      setError(
        err?.data?.error?.message ||
          "Nu s-a putut salva profilul. Verifica datele."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    const ok = window.confirm(
      "Esti sigur ca vrei sa stergi contul? Aceasta actiune este permanenta."
    );
    if (!ok) return;

    try {
      await apiRequest("/account", { method: "DELETE" });
      logout();
      navigate("/register", { replace: true });
    } catch (err) {
      console.error(err);
      alert("Nu s-a putut sterge contul.");
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">
          Detalii cont profesor
        </h3>
        <p className="text-xs text-slate-500">
          Actualizeaza datele de profil si, optional, parola. Pentru proiectul
          curent, aceasta sectiune demonstreaza rutele /account
          (GET/PUT/DELETE).
        </p>
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

        {user?.tip === "profesor" && profLinkUrl && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Link pentru studenti (doar citire)
            </label>
            <div className="flex gap-2">
              <input
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm bg-slate-50 text-slate-700 font-mono"
                value={profLinkUrl}
                readOnly
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={() => {
                  try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(profLinkUrl);
                    } else {
                      const textArea = document.createElement("textarea");
                      textArea.value = profLinkUrl;

                      textArea.style.position = "fixed";
                      textArea.style.left = "-999999px";

                      document.body.appendChild(textArea);
                      textArea.focus();
                      textArea.select();

                      try {
                        document.execCommand("copy");
                      } catch (err) {
                        console.error(
                          "Fallback: Nu s-a putut copia textul",
                          err
                        );
                      } finally {
                        document.body.removeChild(textArea);
                      }
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="text-xs font-medium text-slate-600 border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-100"
              >
                Copy
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Copiaza acest URL si distribuie-l studentilor. Dupa login, ei vor
              vedea pagina dedicata profesorului tau pentru introducerea codului
              de activitate.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Parola curenta (optional)
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
              Parola noua (optional)
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
          {saving ? "Se salveaza..." : "Salveaza profilul"}
        </button>
      </form>

      <div className="border-t border-slate-200 pt-4 mt-2">
        <h4 className="text-xs font-semibold text-red-700 mb-2">
          Zona periculoasa
        </h4>
        <p className="text-xs text-slate-500 mb-2">
          Stergerea contului va elimina profilul profesorului si toate
          dependentele legate de acesta, conform regulilor definite in backend.
        </p>
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="inline-flex items-center rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
        >
          Sterge contul definitiv
        </button>
      </div>
    </section>
  );
}
