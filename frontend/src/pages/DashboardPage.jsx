import { useAuth } from "../context/AuthContext";

import StudentDashboard from "./StudentDashboard";
import TeacherDashboard from "./TeacherDashboard";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
        <div>
          <div className="text-sm font-medium text-slate-900">
            Bine ai venit, {user.username}
          </div>
          <div className="text-xs text-slate-500">
            {user.tip === "student" ? "Student" : "Profesor"}
          </div>
        </div>
        <button
          onClick={logout}
          className="text-xs font-medium text-slate-600 border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-100"
        >
          Logout
        </button>
      </header>

      <main className="flex-1 px-6 py-4">
        {user.tip === "student" ? <StudentDashboard /> : <TeacherDashboard />}
      </main>
    </div>
  );
}
