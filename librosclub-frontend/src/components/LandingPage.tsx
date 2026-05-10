import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Rss, Search, Library, ArrowRight, Users, MapPin, ArrowLeftRight, Check, Crown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import AuthModal from './AuthModal';
import PremiumUpgradeModal from './PremiumUpgradeModal';
import { useAuth } from '../contexts/AuthContext';

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
  const { isAuthenticated, isPremium, username } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [paymentOpen, setPaymentOpen] = useState(false);

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
            {!isAuthenticated && (
              <Button
                size="lg"
                variant="outline"
                className="border-sidebar-foreground/30 text-sidebar-foreground bg-transparent hover:bg-sidebar-accent/50 hover:text-sidebar-foreground font-mono"
                onClick={() => openAuth('register')}
              >
                Crear cuenta gratis
              </Button>
            )}
          </motion.div>

          <motion.p
            className="mt-5 text-xs text-sidebar-foreground/40 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {isAuthenticated ? (
              <>
                Hola, <span className="text-sidebar-foreground/60">{username}</span>.{' '}
                <button
                  onClick={() => navigate('/app')}
                  className="underline underline-offset-2 hover:text-sidebar-foreground/70 transition-colors"
                >
                  Ir a la plataforma
                </button>
              </>
            ) : (
              <>
                ¿Ya tenés cuenta?{' '}
                <button
                  onClick={() => openAuth('login')}
                  className="underline underline-offset-2 hover:text-sidebar-foreground/70 transition-colors"
                >
                  Iniciá sesión
                </button>
              </>
            )}
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

      {/* Pricing */}
      <section className="bg-muted/40 border-y border-border py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-12">
            <h2 className="font-mono text-2xl sm:text-3xl font-bold text-foreground">
              Planes
            </h2>
            <p className="mt-2 text-muted-foreground">
              Empezá gratis. Desbloqueá todo con Premium.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Free */}
            <motion.div
              className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <div>
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Gratis</p>
                <p className="font-mono text-3xl font-bold text-foreground">$0</p>
                <p className="text-xs text-muted-foreground mt-1">Para siempre</p>
              </div>
              <ul className="flex flex-col gap-2.5 text-sm flex-1">
                {[
                  'Feed de novedades por género',
                  'Búsqueda de libros',
                  'Catálogo de la comunidad',
                  'Intercambios P2P',
                  'Unirse a clubes de lectura',
                  'Hasta 10 miembros por club',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-foreground">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
                {[
                  'Libro actual del club',
                  'Reuniones del club',
                  'Foro del club',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-muted-foreground/50">
                    <X className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full font-mono"
                onClick={() => isAuthenticated ? navigate('/app') : openAuth('register')}
              >
                {isAuthenticated ? 'Ir a la plataforma' : 'Empezar gratis'}
              </Button>
            </motion.div>

            {/* Premium */}
            <motion.div
              className="bg-card border-2 border-amber-400 rounded-xl p-6 flex flex-col gap-4 relative"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.12 }}
            >
              <div className="absolute top-4 right-4">
                <span className="flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  <Crown className="h-3 w-3" />
                  Premium
                </span>
              </div>
              <div>
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Premium</p>
                <p className="font-mono text-3xl font-bold text-foreground">
                  $5<span className="text-base font-normal text-muted-foreground">/mes</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Por club</p>
              </div>
              <ul className="flex flex-col gap-2.5 text-sm flex-1">
                {[
                  'Todo lo del plan Gratis',
                  'Sin límite de miembros',
                  'Libro actual del club',
                  'Reuniones y agenda del club',
                  'Foro asíncrono del club',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-foreground">
                    <Check className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>

              {/* CTA según estado de auth */}
              {isPremium ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-50 border border-amber-200">
                    <Crown className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-mono font-bold text-amber-700">Ya sos Premium</span>
                  </div>
                  <Button variant="outline" className="w-full font-mono text-xs" onClick={() => navigate('/app')}>
                    Ir a la plataforma
                  </Button>
                </div>
              ) : isAuthenticated ? (
                <Button
                  className="w-full font-mono bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => setPaymentOpen(true)}
                >
                  <Crown className="h-3.5 w-3.5 mr-1.5" />
                  Activar Premium
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full font-mono bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => openAuth('login')}
                  >
                    Iniciá sesión para activar
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    ¿No tenés cuenta?{' '}
                    <button
                      className="underline underline-offset-2 hover:text-foreground transition-colors"
                      onClick={() => openAuth('register')}
                    >
                      Registrate
                    </button>
                  </p>
                </div>
              )}
            </motion.div>
          </div>
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

      {paymentOpen && <PremiumUpgradeModal onClose={() => setPaymentOpen(false)} />}
    </div>
  );
};

export default LandingPage;
