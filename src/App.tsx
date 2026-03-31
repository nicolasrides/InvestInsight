import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import SignIn from '@/pages/SignIn'
import SignUp from '@/pages/SignUp'
import Setup from '@/pages/Setup'
import Dashboard from '@/pages/Dashboard'
import PlanGraph from '@/pages/PlanGraph'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/setup" element={<Setup />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plans/:id"
          element={
            <ProtectedRoute>
              <PlanGraph />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
