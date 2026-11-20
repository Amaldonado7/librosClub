import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../Login';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  toast: vi.fn(),
  apiLogin: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ login: mocks.login }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../../utils/api', () => ({
  authAPI: { login: mocks.apiLogin },
}));

const submit = () => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ari@gmail.com' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ari123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
};

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa la tarjeta re-estilada y el sello decorativo', () => {
    const { container } = render(<Login />);
    expect(screen.getByRole('heading', { name: 'Iniciar Sesión' })).toHaveClass('text-forest');
    expect(container.querySelector('.card-surface')).not.toBeNull();
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it('login exitoso guarda el token y avisa', async () => {
    mocks.apiLogin.mockResolvedValue({ token: 'tok' });
    render(<Login />);
    submit();
    await waitFor(() => expect(mocks.login).toHaveBeenCalledWith('tok'));
    expect(mocks.apiLogin).toHaveBeenCalledWith({ username: 'ari@gmail.com', password: 'ari123' });
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: '¡Bienvenido a LibrosClub!' }));
  });

  it('login fallido muestra toast destructivo', async () => {
    mocks.apiLogin.mockRejectedValue(new Error('401'));
    render(<Login />);
    submit();
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error de autenticación', variant: 'destructive' }),
      ),
    );
    expect(mocks.login).not.toHaveBeenCalled();
  });
});
