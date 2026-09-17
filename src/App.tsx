import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { Header } from '@/components/layout/Header'
import { MobileNavigation } from '@/components/layout/MobileNavigation'
import { AuthProvider } from '@/hooks/useAdminAuth'
import { RequireAdmin, RedirectIfAdmin } from '@/components/RequireAdmin'
import { Home } from '@/pages/Home'
import { Register } from '@/pages/Register'
import { Competitions } from '@/pages/Competitions'
import { CompetitionDetail } from '@/pages/CompetitionDetail'
import { MyCompetitions } from '@/pages/MyCompetitions'
import { Teams } from '@/pages/Teams'
import { TeamDetail } from '@/pages/TeamDetail'
import { Results } from '@/pages/Results'
import { ClassificationPage } from '@/pages/Classification'
import { ConnectionTest } from '@/pages/ConnectionTest'
import { AdminLogin } from '@/pages/admin/AdminLogin'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminParticipants } from '@/pages/admin/AdminParticipants'
import { AdminCompetitions } from '@/pages/admin/AdminCompetitions'
import { AdminTeams } from '@/pages/admin/AdminTeams'
import { AdminRounds } from '@/pages/admin/AdminRounds'
import { AdminPoints } from '@/pages/admin/AdminPoints'
import { AdminAttendance } from '@/pages/admin/AdminAttendance'

function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex flex-col relative w-full pt-20 pb-24 bg-surface min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/competencias" element={<Competitions />} />
          <Route path="/competencia/:id" element={<CompetitionDetail />} />
          <Route path="/mis-competencias" element={<MyCompetitions />} />
          <Route path="/equipos" element={<Teams />} />
          <Route path="/equipos/:id" element={<TeamDetail />} />
          <Route path="/prueba-conexion" element={<ConnectionTest />} />
          <Route
            path="/admin/login"
            element={
              <RedirectIfAdmin>
                <AdminLogin />
              </RedirectIfAdmin>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/asistencia"
            element={
              <RequireAdmin>
                <AdminAttendance />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/participantes"
            element={
              <RequireAdmin>
                <AdminParticipants />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/competencias"
            element={
              <RequireAdmin>
                <AdminCompetitions />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/equipos"
            element={
              <RequireAdmin>
                <AdminTeams />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/rondas"
            element={
              <RequireAdmin>
                <AdminRounds />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/puntos"
            element={
              <RequireAdmin>
                <AdminPoints />
              </RequireAdmin>
            }
          />
          <Route path="/resultados" element={<Results />} />
          <Route path="/clasificacion" element={<ClassificationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <MobileNavigation />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <Layout />
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  )
}