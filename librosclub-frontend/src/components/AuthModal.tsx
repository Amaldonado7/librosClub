import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import FloralSeal from './brand/FloralSeal';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
  onSuccess?: () => void;
}

const AuthModal: React.FC<Props> = ({ open, onClose, defaultMode = 'login', onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const reset = () => { setUsername(''); setPassword(''); };

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setUsername('');
      setPassword('');
    }
  }, [open, defaultMode]);

  const handleModeChange = (m: 'login' | 'register') => {
    setMode(m);
    reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = mode === 'login'
        ? await authAPI.login({ username, password })
        : await authAPI.register({ username, password });
      login(res.token);
      toast({
        title: mode === 'login' ? '¡Bienvenido!' : '¡Cuenta creada!',
        description: mode === 'login'
          ? 'Sesión iniciada correctamente.'
          : 'Ya podés publicar y unirte a clubes.',
      });
      reset();
      onClose();
      onSuccess?.();
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 text-left">
          <FloralSeal size={40} centerColor="#FFFBF2" />
          <DialogTitle>
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 p-1 rounded-pill border-[1.5px] border-control mb-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleModeChange(m)}
              aria-pressed={mode === m}
              className={cn(
                'chip flex-1 justify-center border-0 px-3 ring-offset-surface',
                mode === m ? 'bg-forest text-warm-cream' : 'text-wood-dark hover:bg-warm-cream'
              )}
            >
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="tu@email.com"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Contraseña</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
            {mode === 'register' && (
              <p className="text-sm text-ink-muted">Mínimo 6 caracteres.</p>
            )}
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
