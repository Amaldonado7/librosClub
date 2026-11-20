import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthModal from '../AuthModal';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  toast: vi.fn(),
  apiLogin: vi.fn(),
  apiRegister: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ login: mocks.login }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../../utils/api', () => ({
  authAPI: { login: mocks.apiLogin, register: mocks.apiRegister },
}));

const fillAndSubmit = () => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@mail.com' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
};

describe('AuthModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el sello decorativo y el título', () => {
    render(<AuthModal open onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('svg[aria-hidden="true"] circle')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('login exitoso llama login con el token y cierra', async () => {
    const onClose = vi.fn();
    mocks.apiLogin.mockResolvedValue({ token: 'tok-123' });
    render(<AuthModal open onClose={onClose} />);
    fillAndSubmit();

    await waitFor(() => expect(mocks.login).toHaveBeenCalledWith('tok-123'));
    expect(onClose).toHaveBeenCalled();
  });

  it('login rechazado dispara un toast destructivo con el mensaje', async () => {
    mocks.apiLogin.mockRejectedValue(new Error('Credenciales inválidas'));
    render(<AuthModal open onClose={vi.fn()} />);
    fillAndSubmit();

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', description: 'Credenciales inválidas' }),
      ),
    );
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('la contraseña conserva required y minLength', () => {
    render(<AuthModal open onClose={vi.fn()} />);
    const password = screen.getByLabelText('Contraseña');
    expect(password).toHaveAttribute('minLength', '6');
    expect(password).toBeRequired();
  });

  it('los labels están asociados a sus inputs', () => {
    render(<AuthModal open onClose={vi.fn()} />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
  });

  it('modo registro: el selector usa aria-pressed y registra la cuenta', async () => {
    mocks.apiRegister.mockResolvedValue({ token: 'nuevo' });
    const onSuccess = vi.fn();
    render(<AuthModal open onClose={vi.fn()} onSuccess={onSuccess} />);
    const toggle = screen.getByRole('button', { name: 'Registrarse' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Mínimo 6 caracteres.')).toHaveClass('text-ink-muted');

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nuevo@mail.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(mocks.login).toHaveBeenCalledWith('nuevo'));
    expect(mocks.apiRegister).toHaveBeenCalledWith({ username: 'nuevo@mail.com', password: 'secreto1' });
    expect(onSuccess).toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: '¡Cuenta creada!' }));
  });

  it('al abrirse usa el modo de defaultMode', () => {
    const { rerender } = render(<AuthModal open={false} onClose={vi.fn()} defaultMode="register" />);
    rerender(<AuthModal open onClose={vi.fn()} defaultMode="register" />);
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('al reabrirse vuelve al modo de defaultMode aunque se haya cambiado antes', () => {
    const { rerender } = render(<AuthModal open onClose={vi.fn()} defaultMode="register" />);
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();

    rerender(<AuthModal open={false} onClose={vi.fn()} defaultMode="register" />);
    rerender(<AuthModal open onClose={vi.fn()} defaultMode="register" />);
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('al reabrirse en modo login los campos quedan vacíos', () => {
    const { rerender } = render(<AuthModal open onClose={vi.fn()} defaultMode="register" />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@mail.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto1' } });

    rerender(<AuthModal open={false} onClose={vi.fn()} defaultMode="register" />);
    rerender(<AuthModal open onClose={vi.fn()} defaultMode="login" />);

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
  });
});
