import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PremiumUpgradeModal from '../PremiumUpgradeModal';

const mocks = vi.hoisted(() => ({
  auth: { token: 'tok' as string | null, login: vi.fn() },
  toast: vi.fn(),
  upgradeUser: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../../utils/api', () => ({
  authAPI: { upgradeUser: mocks.upgradeUser },
}));

const fillCard = () => {
  fireEvent.change(screen.getByLabelText('Nombre en la tarjeta'), { target: { value: 'juan perez' } });
  fireEvent.change(screen.getByLabelText('Número de tarjeta'), { target: { value: '4111111111111111' } });
  fireEvent.change(screen.getByLabelText('Vencimiento'), { target: { value: '1229' } });
  fireEvent.change(screen.getByLabelText('CVV'), { target: { value: '12a3' } });
};

describe('PremiumUpgradeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.token = 'tok';
  });

  it('el botón de cierre tiene nombre accesible y llama onClose', () => {
    const onClose = vi.fn();
    render(<PremiumUpgradeModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('el panel usa la superficie crema', () => {
    render(<PremiumUpgradeModal onClose={vi.fn()} />);
    const panel = screen.getByRole('heading', { name: 'Activar Premium' }).closest('.bg-surface');
    expect(panel).not.toBeNull();
  });

  it('no usa la escala amber', () => {
    const { baseElement } = render(<PremiumUpgradeModal onClose={vi.fn()} />);
    expect(baseElement.querySelector('[class*="amber-"]')).toBeNull();
  });

  it('formatea los datos de la tarjeta mientras se escriben', () => {
    render(<PremiumUpgradeModal onClose={vi.fn()} />);
    fillCard();
    expect(screen.getByLabelText('Nombre en la tarjeta')).toHaveValue('JUAN PEREZ');
    expect(screen.getByLabelText('Número de tarjeta')).toHaveValue('4111 1111 1111 1111');
    expect(screen.getByLabelText('Vencimiento')).toHaveValue('12/29');
    expect(screen.getByLabelText('CVV')).toHaveValue('123');
  });

  it('pago exitoso actualiza el token y muestra la confirmación', async () => {
    mocks.upgradeUser.mockResolvedValue({ token: 'tok-premium' });
    const onClose = vi.fn();
    render(<PremiumUpgradeModal onClose={onClose} />);
    fillCard();
    fireEvent.click(screen.getByRole('button', { name: /Pagar \$5/ }));

    expect(await screen.findByText('¡Plan Premium activado!')).toBeInTheDocument();
    expect(mocks.upgradeUser).toHaveBeenCalledWith('tok');
    expect(mocks.auth.login).toHaveBeenCalledWith('tok-premium');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('un pago fallido muestra toast destructivo', async () => {
    mocks.upgradeUser.mockRejectedValue(new Error('rechazado'));
    render(<PremiumUpgradeModal onClose={vi.fn()} />);
    fillCard();
    fireEvent.click(screen.getByRole('button', { name: /Pagar \$5/ }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error al procesar el pago', variant: 'destructive' }),
      ),
    );
    expect(screen.queryByText('¡Plan Premium activado!')).toBeNull();
  });

  it('sin sesión no intenta cobrar y Cancelar cierra', () => {
    mocks.auth.token = null;
    const onClose = vi.fn();
    render(<PremiumUpgradeModal onClose={onClose} />);
    fillCard();
    fireEvent.click(screen.getByRole('button', { name: /Pagar \$5/ }));
    expect(mocks.upgradeUser).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
  });
});
