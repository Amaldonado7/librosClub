import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Rss, Search, Library, ArrowRight, Users, MapPin, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import AuthModal from './AuthModal';

const features = [
  {
    icon: Rss,
    title: 'Feed de novedades',
    description: 'Explorá libros organizados por género. Ficción, thriller, romance, poesía y más.',
  },
  {
    icon: Search,
    title: 'Búsqueda de libros',
    description: 'Encontrá cualquier libro por título, autor, saga o ISBN.',
  },
  {
    icon: Library,
    title: 'Catálogo disponible',
    description: 'Accedé al catálogo de libros de la comunidad y pedí los que te interesan.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Intercambios P2P',
    description: 'Publicá libros que ya leíste e intercambialos directamente con otros lectores.',
  },
  {
    icon: Users,
    title: 'Clubes de lectura',
    description: 'Unite a clubes locales, seguí el libro del mes y participá del foro.',
  },
  {
    icon: MapPin,
    title: 'Cerca tuyo',
    description: 'Descubrí lectores y clubes en tu zona.',
  },
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-sidebar relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-sidebar-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-20 w-96 h-96 rounded-full bg-sidebar-primary/8 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-20 sm:py-28">
          <div className="flex items-center gap-3 mb-10">
            <BookOpen className="h-7 w-7 text-sidebar-primary" />
            <span className="font-serif text-xl font-bold text-sidebar-foreground">LibrosClub</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-sidebar-foreground leading-tight max-w-2xl">
              Tu comunidad de lectores
            </h1>
            <p className="mt-5 text-lg text-sidebar-foreground/70 max-w-xl leading-relaxed" style={{ fontFamily: 'Lora, serif' }}>
              Descubrí nuevos libros, intercambialos con otros lectores, unite a clubes de lectura y encontrá tu próxima historia favorita.
            </p>
          </motion.div>

          <motion.div
            className="mt-8 flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Button
              size="lg"
              className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 font-mono"
              onClick={() => navigate('/app')}
            >
              Explorar la plataforma
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-sidebar-foreground/30 text-sidebar-foreground bg-transparent hover:bg-sidebar-accent/50 hover:text-sidebar-foreground font-mono"
              onClick={() => openAuth('register')}
            >
              Crear cuenta gratis
            </Button>
          </motion.div>

          <motion.p
            className="mt-5 text-xs text-sidebar-foreground/40 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            ¿Ya tenés cuenta?{' '}
            <button
              onClick={() => openAuth('login')}
              className="underline underline-offset-2 hover:text-sidebar-foreground/70 transition-colors"
            >
              Iniciá sesión
            </button>
          </motion.p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="mb-12">
          <h2 className="font-mono text-2xl sm:text-3xl font-bold text-foreground">
            Todo lo que encontrás
          </h2>
          <p className="mt-2 text-muted-foreground">
            Una plataforma pensada para los que aman leer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className="bg-card border border-border rounded-xl p-6"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-mono text-sm font-bold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Button
            size="lg"
            onClick={() => navigate('/app')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono"
          >
            Entrar a la plataforma
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground font-mono">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>LibrosClub</span>
          </div>
          <span className="text-xs">Trabajo final · Analista de Sistemas · Escuela Da Vinci</span>
        </div>
      </footer>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultMode={authMode}
        onSuccess={() => navigate('/app')}
      />
    </div>
  );
};

export default LandingPage;
