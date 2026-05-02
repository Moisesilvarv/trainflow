import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { EmailVerificationGate } from '../components/auth/EmailVerificationGate';
import { BillingCancelPage } from '../pages/BillingCancelPage';
import { BillingSuccessPage } from '../pages/BillingSuccessPage';
import { DashboardPage } from '../pages/DashboardPage';
import { renderWithRouter } from './renderWithRouter';

const authState = {
  isAuthenticated: false,
  loading: false,
  user: null,
  logout: vi.fn(),
  resendVerificationEmail: vi.fn(),
  refreshUser: vi.fn()
};

const apiGetMock = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState
}));

vi.mock('../api/client', () => ({
  default: {
    get: (...args) => apiGetMock(...args)
  }
}));

vi.mock('../components/charts/RevenueChart', () => ({
  RevenueChart: () => <div>RevenueChart</div>
}));

vi.mock('../components/charts/RetentionChart', () => ({
  RetentionChart: () => <div>RetentionChart</div>
}));

describe('frontend route smoke', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.loading = false;
    authState.user = null;
    apiGetMock.mockImplementation((path) => {
      const responses = {
        '/dashboard': { data: { activeStudents: 4, workoutsCreated: 2, upcomingClasses: 1, monthlyRevenue: [] } },
        '/students': { data: [] },
        '/schedule': { data: [] },
        '/finance': { data: [] },
        '/workouts': { data: [] }
      };
      return Promise.resolve(responses[path] || { data: null });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('bloqueia rota protegida sem autenticacao', () => {
    renderWithRouter(
      <Routes>
        <Route path="/login" element={<div>Tela de login</div>} />
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute>
              <div>Area protegida</div>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/verify-email-pending"
          element={(
            <ProtectedRoute>
              <EmailVerificationGate />
            </ProtectedRoute>
          )}
        />
      </Routes>,
      { route: '/dashboard' }
    );

    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  it('libera rota protegida autenticada', () => {
    authState.isAuthenticated = true;
    authState.user = { appAccess: true, emailVerified: true };

    renderWithRouter(
      <Routes>
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute>
              <div>Area protegida</div>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/verify-email-pending"
          element={(
            <ProtectedRoute>
              <EmailVerificationGate />
            </ProtectedRoute>
          )}
        />
      </Routes>,
      { route: '/dashboard' }
    );

    expect(screen.getByText('Area protegida')).toBeInTheDocument();
  });

  it('bloqueia a area protegida quando o email ainda nao foi confirmado', () => {
    authState.isAuthenticated = true;
    authState.user = {
      email: 'coach@trainflow.com',
      emailVerified: false,
      appAccess: true
    };

    renderWithRouter(
      <Routes>
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute>
              <div>Area protegida</div>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/verify-email-pending"
          element={(
            <ProtectedRoute>
              <EmailVerificationGate />
            </ProtectedRoute>
          )}
        />
      </Routes>,
      { route: '/dashboard' }
    );

    expect(screen.getByText(/confirme seu email para continuar/i)).toBeInTheDocument();
  });

  it('renderiza checkout success e cancel', () => {
    const successRender = renderWithRouter(<BillingSuccessPage />);
    expect(screen.getByText(/assinatura confirmada com sucesso/i)).toBeInTheDocument();

    successRender.unmount();

    renderWithRouter(<BillingCancelPage />);
    expect(screen.getByText(/checkout cancelado/i)).toBeInTheDocument();
  });

  it('renderiza o dashboard basico', async () => {
    authState.isAuthenticated = true;
    authState.user = {
      name: 'Ricardo Coach',
      emailVerified: true,
      plan: 'pro',
      planStatus: 'active',
      trialDaysRemaining: 0
    };

    renderWithRouter(
      <Routes>
        <Route path="*" element={<DashboardPage />} />
      </Routes>
    );

    await waitFor(() => {
      expect(screen.getByText(/painel principal/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/dashboard inteligente/i).length).toBeGreaterThan(0);
    expect(apiGetMock).toHaveBeenCalledWith('/dashboard');
  });
});
