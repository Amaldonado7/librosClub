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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl"
      >
        {paid ? (
          <div className="text-center py-6 space-y-4">
            <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <Crown className="h-7 w-7 text-amber-600" />
            </div>
            <div>
              <p className="font-mono font-bold text-foreground">¡Plan Premium activado!</p>
              <p className="text-sm text-muted-foreground mt-1">Tus funciones quedan disponibles por 30 días.</p>
            </div>
            <Button className="w-full font-mono bg-amber-600 hover:bg-amber-700 text-white" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-600" />
                <h3 className="font-mono font-bold text-sm text-foreground">Activar Premium</h3>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-5 flex items-center justify-between">
              <span className="text-xs text-amber-700 font-mono">Plan Premium · 30 días</span>
              <span className="text-sm font-bold text-amber-800 font-mono">$5</span>
            </div>

            <form onSubmit={handlePay} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-mono">Nombre en la tarjeta</Label>
                <Input
                  placeholder="JUAN PEREZ"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  className="bg-background font-mono text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-mono">Número de tarjeta</Label>
                <Input
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className="bg-background font-mono text-sm tracking-widest"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-mono">Vencimiento</Label>
                  <Input
                    placeholder="MM/AA"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    className="bg-background font-mono text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-mono">CVV</Label>
                  <Input
                    placeholder="000"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="bg-background font-mono text-sm"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isPaying}
                className="w-full font-mono bg-amber-600 hover:bg-amber-700 text-white mt-1"
              >
                <Crown className="h-3.5 w-3.5 mr-1.5" />
                {isPaying ? 'Procesando...' : 'Pagar $5'}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground/50 mt-4 font-mono">
              * Entorno de demostración — no se realiza ningún cobro real
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PremiumUpgradeModal;
