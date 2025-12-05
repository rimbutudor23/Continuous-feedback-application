import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import TeacherActivityLivePage from "./pages/TeacherActivityLivePage";
import TeacherActivityStatsPage from "./pages/TeacherActivityStatsPage";
import ProfessorLinkPage from "./pages/ProfessorLinkPage";
import StudentActivityLivePage from "./pages/StudentActivityLivePage";

function App() {
  const { authStatus, user } = useAuth();

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-sm text-slate-600">Se incarca...</div>
      </div>
    );
  }

  const isAuthed = authStatus === "authed";

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthed ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            isAuthed ? <Navigate to="/dashboard" replace /> : <RegisterPage />
          }
        />

        <Route
          path="/dashboard"
          element={
            isAuthed ? <DashboardPage /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/prof/activities/:id/live"
          element={
            isAuthed && user?.tip === "profesor" ? (
              <TeacherActivityLivePage />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/prof/activities/:id/stats"
          element={
            isAuthed && user?.tip === "profesor" ? (
              <TeacherActivityStatsPage />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        <Route
          path="/"
          element={
            isAuthed ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/professor/:profLinkToken"
          element={<ProfessorLinkPage />}
        />

        <Route
          path="/student/activities/:id/live"
          element={
            isAuthed ? (
              <StudentActivityLivePage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
              <div className="text-sm text-slate-600">Pagina nu exista.</div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
