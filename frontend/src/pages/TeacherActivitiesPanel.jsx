import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../apiClient";

const ACTIVITIES_PAGE_SIZE = 10;

function TeacherActivitiesPanel() {
  const navigate = useNavigate();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("createdAt_desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [form, setForm] = useState({
    titlu: "",
    descriere: "",
    oraInceput: "",
    oraSfarsit: "",
    accesibilDeLa: "",
    accesibilPanaLa: "",
  });

  const [codeMode, setCodeMode] = useState("auto");
  const [codes, setCodes] = useState([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesError, setCodesError] = useState(null);
  const [selectedCodeId, setSelectedCodeId] = useState(null);
  const [codesPage, setCodesPage] = useState(1);
  const CODES_PAGE_SIZE = 5;

  const [editingActivity, setEditingActivity] = useState(null);
  const [editForm, setEditForm] = useState({
    titlu: "",
    descriere: "",
    oraInceput: "",
    oraSfarsit: "",
    accesibilDeLa: "",
    accesibilPanaLa: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  async function loadActivities(opts = {}) {
    const nextPage = opts.page ?? page;
    const start = (nextPage - 1) * ACTIVITIES_PAGE_SIZE;
    const limit = ACTIVITIES_PAGE_SIZE;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("start", String(start));
      params.set("limit", String(limit));
      params.set("sort", sortKey);

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const url = `/prof/activities?${params.toString()}`;
      const data = await apiRequest(url, { method: "GET" });

      let acts = [];
      let pag = null;

      if (data && data.success && Array.isArray(data.activities)) {
        acts = data.activities;
        pag = data.pagination || null;
      } else if (Array.isArray(data)) {
        acts = data;
      }

      setActivities(acts);
      setPagination(pag);
      setPage(nextPage);
    } catch (err) {
      console.error(err);
      setError("Nu pot incarca activitatile.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCodesForSelect() {
    setCodesLoading(true);
    setCodesError(null);
    try {
      const data = await apiRequest("/prof/codes", { method: "GET" });

      if (data.success && Array.isArray(data.codes)) {
        setCodes(data.codes);
      } else if (Array.isArray(data)) {
        setCodes(data);
      } else {
        setCodes([]);
      }

      setCodesPage(1);
      setSelectedCodeId(null);
    } catch (err) {
      console.error(err);
      setCodesError("Nu pot incarca codurile.");
    } finally {
      setCodesLoading(false);
    }
  }

  useEffect(() => {
    loadActivities({ page: 1 });
  }, [sortKey, statusFilter]);

  useEffect(() => {
    if (codeMode === "existing") {
      loadCodesForSelect();
    }
  }, [codeMode]);

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmitActivity(e) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const body = {
        titlu: form.titlu,
        descriere: form.descriere || null,
        oraInceput: form.oraInceput
          ? new Date(form.oraInceput).toISOString()
          : null,
        oraSfarsit: form.oraSfarsit
          ? new Date(form.oraSfarsit).toISOString()
          : null,
        accesibilDeLa: form.accesibilDeLa
          ? new Date(form.accesibilDeLa).toISOString()
          : null,
        accesibilPanaLa: form.accesibilPanaLa
          ? new Date(form.accesibilPanaLa).toISOString()
          : null,
      };

      if (codeMode === "existing") {
        if (!selectedCodeId) {
          setCreateError(
            "Selecteaza un cod din lista sau alege generare automata."
          );
          setCreating(false);
          return;
        }
        body.codId = Number(selectedCodeId);
      }

      const data = await apiRequest("/prof/activities", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!data.success) {
        throw new Error("Eroare creare activitate");
      }

      setForm({
        titlu: "",
        descriere: "",
        oraInceput: "",
        oraSfarsit: "",
        accesibilDeLa: "",
        accesibilPanaLa: "",
      });
      setCodeMode("auto");
      setSelectedCodeId(null);

      await loadActivities({ page: 1 });
    } catch (err) {
      console.error(err);
      setCreateError("Nu s-a putut crea. Verifica datele.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteActivity(act) {
    const id = act.activitateId || act.id;
    if (!id) return;

    const ok = window.confirm("Stergi activitatea definitiv?");
    if (!ok) return;

    try {
      await apiRequest(`/prof/activities/${id}`, {
        method: "DELETE",
      });
      await loadActivities({ page });
    } catch (err) {
      console.error(err);
      alert("Nu s-a putut sterge.");
    }
  }

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

  function statusBadge(status) {
    let label = status || "necunoscut";
    let classes =
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

    switch (status) {
      case "future":
        classes += " bg-slate-100 text-slate-700";
        label = "Viitoare";
        break;
      case "access_open":
        classes += " bg-emerald-100 text-emerald-700";
        label = "Acces deschis";
        break;
      case "current":
        classes += " bg-indigo-100 text-indigo-700";
        label = "In desfasurare";
        break;
      case "ended":
        classes += " bg-slate-200 text-slate-700";
        label = "Incheiata";
        break;
      default:
        classes += " bg-slate-100 text-slate-500";
    }

    return <span className={classes}>{label}</span>;
  }

  function startEditActivity(act) {
    if (act.status !== "future") {
      alert("Poti edita doar activitatile care nu au inceput.");
      return;
    }

    setEditingActivity(act);
    setEditError(null);

    setEditForm({
      titlu: act.titlu || "",
      descriere: act.descriere || "",
      oraInceput: act.oraInceput
        ? new Date(act.oraInceput).toISOString().slice(0, 16)
        : "",
      oraSfarsit: act.oraSfarsit
        ? new Date(act.oraSfarsit).toISOString().slice(0, 16)
        : "",
      accesibilDeLa: act.accesibilDeLa
        ? new Date(act.accesibilDeLa).toISOString().slice(0, 16)
        : "",
      accesibilPanaLa: act.accesibilPanaLa
        ? new Date(act.accesibilPanaLa).toISOString().slice(0, 16)
        : "",
    });
  }

  function handleEditFormChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingActivity) return;

    const id = editingActivity.activitateId || editingActivity.id;
    if (!id) return;

    setEditSaving(true);
    setEditError(null);

    try {
      const body = {
        titlu: editForm.titlu,
        descriere: editForm.descriere || null,
        oraInceput: editForm.oraInceput
          ? new Date(editForm.oraInceput).toISOString()
          : null,
        oraSfarsit: editForm.oraSfarsit
          ? new Date(editForm.oraSfarsit).toISOString()
          : null,
        accesibilDeLa: editForm.accesibilDeLa
          ? new Date(editForm.accesibilDeLa).toISOString()
          : null,
        accesibilPanaLa: editForm.accesibilPanaLa
          ? new Date(editForm.accesibilPanaLa).toISOString()
          : null,
      };

      const resp = await apiRequest(`/prof/activities/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      if (!resp.success) {
        throw new Error("Eroare update activitate");
      }

      setEditingActivity(null);
      await loadActivities({ page });
    } catch (err) {
      console.error(err);
      setEditError(
        err?.data?.error?.message || "Nu s-a putut salva. Verifica datele."
      );
    } finally {
      setEditSaving(false);
    }
  }

  function cancelEdit() {
    setEditingActivity(null);
    setEditError(null);
  }

  const totalCodePages = Math.max(1, Math.ceil(codes.length / CODES_PAGE_SIZE));
  const currentPageCodes = codes.slice(
    (codesPage - 1) * CODES_PAGE_SIZE,
    codesPage * CODES_PAGE_SIZE
  );

  const totalActivities = pagination?.total ?? null;
  const startIndex = pagination?.start ?? 0;
  const returned = pagination?.returned ?? activities.length;

  const now = new Date();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Activitatile mele
          </h3>
          <div className="flex items-center gap-3">
            <select
              className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-600"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Toate</option>
              <option value="future">Viitoare</option>
              <option value="access_open">Acces deschis</option>
              <option value="current">In desfasurare</option>
              <option value="ended">Incheiate (istoric)</option>
            </select>

            <select
              className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-600"
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value);
                setPage(1);
              }}
            >
              <option value="createdAt_desc">Create recent</option>
              <option value="oraInceput_asc">Start apropiat</option>
              <option value="oraInceput_desc">Start indepartat</option>
            </select>

            <button
              type="button"
              onClick={() => loadActivities({ page: 1 })}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Reincarca
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Incarcare...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : activities.length === 0 ? (
          <div className="text-sm text-slate-500">
            Nu ai activitati pentru filtrul ales.
          </div>
        ) : (
          <>
            <div className="space-y-3 overflow-y-auto h-full pr-1">
              {activities.map((act) => (
                <div
                  key={act.activitateId || act.id}
                  className="border border-slate-200 rounded-md p-3 hover:border-indigo-200 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {act.titlu || "(fara titlu)"}
                      </div>
                      {act.descriere && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {act.descriere}
                        </div>
                      )}
                    </div>
                    {statusBadge(act.status)}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                    <div>
                      <span className="font-medium text-slate-600">
                        Acces de la:
                      </span>{" "}
                      {formatDateTime(act.accesibilDeLa)}
                    </div>
                    <div>
                      <span className="font-medium text-slate-600">
                        Acces pana la:
                      </span>{" "}
                      {formatDateTime(act.accesibilPanaLa)}
                    </div>
                    <div>
                      <span className="font-medium text-slate-600">
                        Inceput:
                      </span>{" "}
                      {formatDateTime(act.oraInceput)}
                    </div>
                    <div>
                      <span className="font-medium text-slate-600">
                        Sfarsit:
                      </span>{" "}
                      {formatDateTime(act.oraSfarsit)}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-slate-600">Cod:</span>{" "}
                      <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                        {act.codContinut || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {act.oraInceput &&
                      act.oraSfarsit &&
                      now >= new Date(act.oraInceput) &&
                      now <= new Date(act.oraSfarsit) && (
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                          onClick={() => {
                            const id = act.activitateId || act.id;
                            navigate(`/prof/activities/${id}/live`);
                          }}
                        >
                          Intra live
                        </button>
                      )}

                    {act.status === "ended" && (
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          const id = act.activitateId || act.id;
                          navigate(`/prof/activities/${id}/stats`);
                        }}
                      >
                        Statistici
                      </button>
                    )}

                    {act.status === "future" && (
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => startEditActivity(act)}
                      >
                        Editeaza
                      </button>
                    )}

                    {(act.status === "future" ||
                      act.status === "access_open" ||
                      act.status === "ended") && (
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteActivity(act)}
                      >
                        Sterge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalActivities != null && (
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <div>
                  {totalActivities === 0
                    ? "0 rezultate"
                    : `${startIndex + 1}-${
                        startIndex + returned
                      } din ${totalActivities}`}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => loadActivities({ page: page - 1 })}
                    className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
                  >
                    &lt;
                  </button>
                  <button
                    type="button"
                    disabled={startIndex + returned >= totalActivities}
                    onClick={() => loadActivities({ page: page + 1 })}
                    className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {editingActivity && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <h4 className="text-xs font-semibold text-slate-800 mb-2">
              Editeaza activitatea:{" "}
              <span className="font-normal">
                {editingActivity.titlu || "(fara titlu)"}
              </span>
            </h4>

            <form onSubmit={handleSaveEdit} className="space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Titlu
                </label>
                <input
                  name="titlu"
                  className="block w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={editForm.titlu}
                  onChange={handleEditFormChange}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Descriere
                </label>
                <textarea
                  name="descriere"
                  className="block w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={2}
                  value={editForm.descriere}
                  onChange={handleEditFormChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Accesibil de la
                  </label>
                  <input
                    type="datetime-local"
                    name="accesibilDeLa"
                    className="block w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={editForm.accesibilDeLa}
                    onChange={handleEditFormChange}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Accesibil pana la
                  </label>
                  <input
                    type="datetime-local"
                    name="accesibilPanaLa"
                    className="block w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={editForm.accesibilPanaLa}
                    onChange={handleEditFormChange}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Ora inceput
                  </label>
                  <input
                    type="datetime-local"
                    name="oraInceput"
                    className="block w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={editForm.oraInceput}
                    onChange={handleEditFormChange}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Ora sfarsit
                  </label>
                  <input
                    type="datetime-local"
                    name="oraSfarsit"
                    className="block w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={editForm.oraSfarsit}
                    onChange={handleEditFormChange}
                  />
                </div>
              </div>

              {editError && (
                <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
                  {editError}
                </div>
              )}

              <div className="flex gap-2 mt-1">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {editSaving ? "Se salveaza..." : "Salveaza"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Anuleaza
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Creeaza activitate noua
          </h3>
          <p className="text-xs text-slate-500">
            Completeaza detaliile si alege codul.
          </p>
        </div>

        <form onSubmit={handleSubmitActivity} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Titlu activitate
            </label>
            <input
              name="titlu"
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={form.titlu}
              onChange={handleFormChange}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Descriere
            </label>
            <textarea
              name="descriere"
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
              value={form.descriere}
              onChange={handleFormChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Accesibil de la
              </label>
              <input
                type="datetime-local"
                name="accesibilDeLa"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={form.accesibilDeLa}
                onChange={handleFormChange}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Accesibil pana la
              </label>
              <input
                type="datetime-local"
                name="accesibilPanaLa"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={form.accesibilPanaLa}
                onChange={handleFormChange}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ora inceput
              </label>
              <input
                type="datetime-local"
                name="oraInceput"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={form.oraInceput}
                onChange={handleFormChange}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ora sfarsit
              </label>
              <input
                type="datetime-local"
                name="oraSfarsit"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={form.oraSfarsit}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-md p-3 space-y-2">
            <div className="text-xs font-medium text-slate-700 mb-1">
              Cod activitate
            </div>
            <div className="flex gap-4 text-xs">
              <button
                type="button"
                onClick={() => setCodeMode("auto")}
                className={`px-3 py-1.5 rounded-md border text-xs font-medium ${
                  codeMode === "auto"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                Genereaza cod automat
              </button>
              <button
                type="button"
                onClick={() => setCodeMode("existing")}
                className={`px-3 py-1.5 rounded-md border text-xs font-medium ${
                  codeMode === "existing"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                Alege cod existent
              </button>
            </div>

            {codeMode === "auto" && (
              <p className="text-[11px] text-slate-500 mt-1">
                Se genereaza automat un cod de 8 caractere.
              </p>
            )}

            {codeMode === "existing" && (
              <div className="mt-2 space-y-2">
                {codesLoading ? (
                  <div className="text-[11px] text-slate-500">
                    Incarcare coduri...
                  </div>
                ) : codesError ? (
                  <div className="text-[11px] text-red-600">{codesError}</div>
                ) : codes.length === 0 ? (
                  <div className="text-[11px] text-slate-500">
                    Nu ai coduri. Creeaza unul in "Coduri" si revino.
                  </div>
                ) : (
                  <>
                    <div className="border border-slate-200 rounded-md overflow-hidden">
                      <table className="min-w-full text-[11px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-2 py-1 text-left font-medium text-slate-600">
                              Cod
                            </th>
                            <th className="px-2 py-1 text-left font-medium text-slate-600">
                              Tip
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentPageCodes.map((code) => {
                            const id = code.codId || code.id;
                            const isSelected = selectedCodeId === id;

                            return (
                              <tr
                                key={id}
                                className={`border-b border-slate-100 cursor-pointer ${
                                  isSelected
                                    ? "bg-indigo-50"
                                    : "hover:bg-slate-50"
                                }`}
                                onClick={() => setSelectedCodeId(id)}
                              >
                                <td className="px-2 py-1">
                                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                    {code.continut}
                                  </span>
                                </td>
                                <td className="px-2 py-1 text-slate-500">
                                  {code.esteAleatoriu
                                    ? "Generat automat"
                                    : "Definit de profesor"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <div>
                        Pagina {codesPage} / {totalCodePages}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={codesPage <= 1}
                          onClick={() =>
                            setCodesPage((p) => Math.max(1, p - 1))
                          }
                          className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
                        >
                          &lt;
                        </button>
                        <button
                          type="button"
                          disabled={codesPage >= totalCodePages}
                          onClick={() =>
                            setCodesPage((p) => Math.min(totalCodePages, p + 1))
                          }
                          className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
                        >
                          &gt;
                        </button>
                      </div>
                    </div>

                    {selectedCodeId && (
                      <div className="text-[11px] text-emerald-700">
                        Selectat:{" "}
                        {
                          (
                            codes.find(
                              (c) => (c.codId || c.id) === selectedCodeId
                            ) || {}
                          ).continut
                        }
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
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
            {creating ? "Se creeaza..." : "Creeaza activitate"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default TeacherActivitiesPanel;
