import React, { useState } from 'react';
import { Crown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { authAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onClose: () => void;
}

const PremiumUpgradeModal: React.FC<Props> = ({ onClose }) => {
  const { token, login } = useAuth();
  const { toast } = useToast();
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const formatCardNumber = (value: string) =>
    value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    return digits.length >= 3 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsPaying(true);
    try {
      const result = await authAPI.upgradeUser(token);
      login(result.token);
      setPaid(true);
    } catch {
      toast({ title: 'Error al procesar el pago', variant: 'destructive' });
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-wood-dark/60 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-surface border-[1.5px] border-line rounded-lg p-6 w-full max-w-sm shadow-xl"
      >
        {paid ? (
          <div className="text-center py-6 flex flex-col items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-sunlight flex items-center justify-center">
              <Crown className="h-7 w-7 text-wood-dark" aria-hidden="true" />
            </div>
            <div>
              <p className="font-serif text-2xl text-forest">¡Plan Premium activado!</p>
              <p className="font-serif text-base text-ink-muted mt-1">Tus funciones quedan disponibles por 30 días.</p>
            </div>
            <Button variant="accent" className="w-full" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-terracotta" aria-hidden="true" />
                <h3 className="font-serif font-normal text-2xl text-forest">Activar Premium</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="inline-flex h-11 w-11 items-center justify-center rounded-pill text-wood-dark transition-colors hover:bg-warm-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-surface"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="card-surface border-line-strong px-3 py-2.5 mb-5 flex items-center justify-between">
              <span className="pill pill-sun">Plan Premium · 30 días</span>
              <span className="font-serif text-xl text-forest">$5</span>
            </div>

            <form onSubmit={handlePay} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="premium-card-name">Nombre en la tarjeta</Label>
                <Input
                  id="premium-card-name"
                  placeholder="JUAN PEREZ"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  className="font-mono"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="premium-card-number">Número de tarjeta</Label>
                <Input
                  id="premium-card-number"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className="font-mono tracking-widest"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="premium-card-expiry">Vencimiento</Label>
                  <Input
                    id="premium-card-expiry"
                    placeholder="MM/AA"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    className="font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="premium-card-cvv">CVV</Label>
                  <Input
                    id="premium-card-cvv"
                    placeholder="000"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="font-mono"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
                <Button type="button" variant="outline" className="sm:flex-1" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" variant="accent" disabled={isPaying} className="sm:flex-1">
                  <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                  {isPaying ? 'Procesando...' : 'Pagar $5'}
                </Button>
              </div>
            </form>

            <p className="text-center label-mono normal-case tracking-normal text-ink-muted mt-4">
              * Entorno de demostración — no se realiza ningún cobro real
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PremiumUpgradeModal;
