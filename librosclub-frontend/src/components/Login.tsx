import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import FloralSeal from './brand/FloralSeal';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import heroImage from '../assets/hero-bg.jpg';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authAPI.login({ username, password });
      login(response.token);
      toast({
        title: "¡Bienvenido a LibrosClub!",
        description: "Has iniciado sesión correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error de autenticación",
        description: "Credenciales incorrectas. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - hero image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={heroImage}
          alt="Cabaña de lectura acogedora"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-forest/80" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-warm-cream">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <FloralSeal size={48} centerColor="#5E5827" />
            </div>
            <h1 className="text-6xl font-serif font-normal mb-4 text-warm-cream">LibrosClub</h1>
            <p className="font-serif text-xl text-warm-cream max-w-md leading-relaxed">
              Intercambiá libros, descubrí clubes de lectura y conectá con lectores cerca tuyo.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side - login form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <FloralSeal size={48} />
            </div>
            <h1 className="text-5xl font-serif font-normal text-forest mb-2">LibrosClub</h1>
            <p className="font-serif text-lg text-ink-muted">Tu comunidad de libros favorita</p>
          </div>

          <Card>
            <CardHeader className="text-center pb-2">
              <CardTitle>Iniciar Sesión</CardTitle>
              <CardDescription className="font-serif text-base">
                Accedé a tu biblioteca personal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Email</Label>
                  <Input
                    id="username"
                    type="email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Iniciando sesión...' : 'Entrar'}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-warm-cream rounded-lg border-[1.5px] border-line">
                <p className="label-mono text-wood-dark mb-2">Credenciales de prueba:</p>
                <p className="font-serif text-base text-ink-muted">Email: ari@gmail.com</p>
                <p className="font-serif text-base text-ink-muted">Contraseña: ari123</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
