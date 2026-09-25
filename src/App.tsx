import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useSubscription } from './lib/useSubscription';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import NewCosting from './pages/NewCosting';
import SavedCostings from './pages/SavedCostings';
import Suppliers from './pages/Suppliers';
import Billing from './pages/Billing';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RequireSubscription({ children }: { children: ReactNode }) {
  const { hasAccess, loading } = useSubscription();

  // The billing API routes only exist on Vercel, not the local Vite dev
  // server, so the trial/subscription gate can't function locally — skip it
  // in dev builds only. import.meta.env.DEV is fixed at build time, so this
  // never affects production.
  if (import.meta.env.DEV) {
    return <>{children}</>;
  }

  if (loading) {
    return <p className="text-slate-500">Loading...</p>;
  }

  if (!hasAccess) {
    return <Navigate to="/billing" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          path="new"
          element={
            <RequireSubscription>
              <NewCosting />
            </RequireSubscription>
          }
        />
        <Route
          path="saved"
          element={
            <RequireSubscription>
              <SavedCostings />
            </RequireSubscription>
          }
        />
        <Route
          path="suppliers"
          element={
            <RequireSubscription>
              <Suppliers />
            </RequireSubscription>
          }
        />
        <Route path="billing" element={<Billing />} />
        <Route path="*" element={<Navigate to="/new" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
