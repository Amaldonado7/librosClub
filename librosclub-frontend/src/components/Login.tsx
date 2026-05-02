import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { BookOpen, Leaf } from 'lucide-react';
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
        <div className="absolute inset-0 bg-gradient-to-r from-wood-dark/80 to-wood-dark/40" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-primary-foreground">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="h-10 w-10 text-sunlight" />
            </div>
            <h1 className="text-5xl font-serif font-bold mb-4 text-primary-foreground">LibrosClub</h1>
            <p className="text-xl text-primary-foreground/80 max-w-md font-light leading-relaxed">
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
              <BookOpen className="h-8 w-8 text-primary" />
              <Leaf className="h-6 w-6 text-forest" />
            </div>
            <h1 className="text-4xl font-serif font-bold text-foreground mb-2">LibrosClub</h1>
            <p className="text-muted-foreground">Tu comunidad de libros favorita</p>
          </div>

          <Card className="shadow-warm border-border bg-card">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-serif text-foreground">Iniciar Sesión</CardTitle>
              <CardDescription className="text-muted-foreground">
                Accedé a tu biblioteca personal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-foreground">Email</Label>
                  <Input
                    id="username"
                    type="email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="bg-background border-border focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-background border-border focus-visible:ring-primary"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? 'Iniciando sesión...' : 'Entrar'}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
                <p className="text-sm text-foreground font-medium mb-2">Credenciales de prueba:</p>
                <p className="text-sm text-muted-foreground">Email: ari@gmail.com</p>
                <p className="text-sm text-muted-foreground">Contraseña: ari123</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
