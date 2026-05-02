import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Topbar } from '../components/layout/Topbar';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';

const navigateMock = vi.fn();
const loginMock = vi.fn();
const registerMock = vi.fn();
const startCheckoutMock = vi.fn();
const logoutMock = vi.fn();
const resendVerificationEmailMock = vi.fn();
const verifyEmailMock = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
    register: registerMock,
    startCheckout: startCheckoutMock,
    logout: logoutMock,
    resendVerificationEmail: resendVerificationEmailMock,
    verifyEmail: verifyEmailMock,
    user: {
      name: 'Ricardo Coach',
      email: 'coach@trainflow.com',
      emailVerified: true,
      plan: 'pro',
      planStatus: 'active'
    }
  })
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock
  };
});

describe('frontend auth smoke', () => {
  beforeEach(() => {
    loginMock.mockResolvedValue(undefined);
    registerMock.mockResolvedValue({ token: 'token', user: { plan: 'pro' } });
    startCheckoutMock.mockResolvedValue({ checkoutUrl: 'https://checkout.stripe.test/session_123' });
    resendVerificationEmailMock.mockResolvedValue({ message: 'ok' });
    verifyEmailMock.mockResolvedValue({ message: 'ok' });
    delete window.location;
    window.location = { href: '' };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('executa login com sucesso', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'coach@trainflow.com' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'SenhaForte123!' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('coach@trainflow.com', 'SenhaForte123!');
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('executa cadastro e entra direto no dashboard em modo trial', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Digite seu nome completo'), { target: { value: 'Ricardo Coach' } });
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'ricardo@trainflow.com' } });
    fireEvent.change(screen.getByPlaceholderText('Crie uma senha segura'), { target: { value: 'SenhaForte123!' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme sua senha'), { target: { value: 'SenhaForte123!' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta e comecar gratis/i }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ricardo Coach',
          email: 'ricardo@trainflow.com',
          plan: 'pro',
          trialRequested: true
        })
      );
      expect(startCheckoutMock).not.toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('executa logout a partir do topbar', () => {
    render(
      <MemoryRouter>
        <Topbar onMenuClick={() => {}} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /sair/i }));
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
