import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { LoadingScreen } from './components/LoadingScreen';
import { AppShell } from './components/layout/AppShell';
import { EmailVerificationGate } from './components/auth/EmailVerificationGate';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';

const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage').then((module) => ({ default: module.VerifyEmailPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then((module) => ({ default: module.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((module) => ({ default: module.PrivacyPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then((module) => ({ default: module.ContactPage })));
const PlansPage = lazy(() => import('./pages/PlansPage').then((module) => ({ default: module.PlansPage })));
const BillingSuccessPage = lazy(() => import('./pages/BillingSuccessPage').then((module) => ({ default: module.BillingSuccessPage })));
const BillingCancelPage = lazy(() => import('./pages/BillingCancelPage').then((module) => ({ default: module.BillingCancelPage })));
const TrialExpiredPage = lazy(() => import('./pages/TrialExpiredPage').then((module) => ({ default: module.TrialExpiredPage })));
const AthleteAreaPage = lazy(() => import('./pages/AthleteAreaPage').then((module) => ({ default: module.AthleteAreaPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const StudentsPage = lazy(() => import('./pages/StudentsPage').then((module) => ({ default: module.StudentsPage })));
const StudentProfilePage = lazy(() => import('./pages/StudentProfilePage').then((module) => ({ default: module.StudentProfilePage })));
const WorkoutsPage = lazy(() => import('./pages/WorkoutsPage').then((module) => ({ default: module.WorkoutsPage })));
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((module) => ({ default: module.ProgressPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const SchedulePage = lazy(() => import('./pages/SchedulePage').then((module) => ({ default: module.SchedulePage })));
const FinancePage = lazy(() => import('./pages/FinancePage').then((module) => ({ default: module.FinancePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const FootballPage = lazy(() => import('./pages/FootballPage').then((module) => ({ default: module.FootballPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));

function AuthLayout({ children }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

function GuestLayout({ children }) {
  return <PublicRoute>{children}</PublicRoute>;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen label="Carregando pagina..." tone="hero" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <GuestLayout>
              <LoginPage />
            </GuestLayout>
          }
        />
        <Route
          path="/register"
          element={
            <GuestLayout>
              <RegisterPage />
            </GuestLayout>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestLayout>
              <ForgotPasswordPage />
            </GuestLayout>
          }
        />
        <Route
          path="/reset-password"
          element={
            <GuestLayout>
              <ResetPasswordPage />
            </GuestLayout>
          }
        />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/verify-email-pending"
          element={
            <ProtectedRoute>
              <EmailVerificationGate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trial-expired"
          element={
            <ProtectedRoute>
              <TrialExpiredPage />
            </ProtectedRoute>
          }
        />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route
          path="/billing/success"
          element={
            <AuthLayout>
              <BillingSuccessPage />
            </AuthLayout>
          }
        />
        <Route
          path="/billing/cancel"
          element={
            <AuthLayout>
              <BillingCancelPage />
            </AuthLayout>
          }
        />
        <Route path="/athlete" element={<AthleteAreaPage />} />
        <Route path="/athlete/:token" element={<AthleteAreaPage />} />

        <Route
          path="/dashboard"
          element={
            <AuthLayout>
              <DashboardPage />
            </AuthLayout>
          }
        />
        <Route
          path="/students"
          element={
            <AuthLayout>
              <StudentsPage />
            </AuthLayout>
          }
        />
        <Route
          path="/students/:id"
          element={
            <AuthLayout>
              <StudentProfilePage />
            </AuthLayout>
          }
        />
        <Route
          path="/workouts"
          element={
            <AuthLayout>
              <WorkoutsPage />
            </AuthLayout>
          }
        />
        <Route
          path="/progress"
          element={
            <AuthLayout>
              <ProgressPage />
            </AuthLayout>
          }
        />
        <Route
          path="/reports"
          element={
            <AuthLayout>
              <ReportsPage />
            </AuthLayout>
          }
        />
        <Route
          path="/schedule"
          element={
            <AuthLayout>
              <SchedulePage />
            </AuthLayout>
          }
        />
        <Route
          path="/finance"
          element={
            <AuthLayout>
              <FinancePage />
            </AuthLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthLayout>
              <SettingsPage />
            </AuthLayout>
          }
        />
        <Route
          path="/football"
          element={
            <AuthLayout>
              <FootballPage />
            </AuthLayout>
          }
        />
        <Route
          path="/admin"
          element={
            <AuthLayout>
              <AdminPage />
            </AuthLayout>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
