import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

const AuthModal: React.FC<Props> = ({ open, onClose, defaultMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const reset = () => { setUsername(''); setPassword(''); };

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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 p-1 bg-muted rounded-lg mb-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleModeChange(m)}
              className={cn(
                'flex-1 py-1.5 text-sm font-mono rounded-md transition-colors',
                mode === m
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="tu@email.com"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-muted-foreground">Contraseña</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
            {mode === 'register' && (
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
            )}
          </div>
          <Button type="submit" disabled={isLoading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {isLoading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
