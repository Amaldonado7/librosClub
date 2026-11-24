import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Rss, Search, Library, ArrowRight, Users, MapPin, ArrowLeftRight, Check, Crown, X, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { motion } from 'framer-motion';
import AuthModal from './AuthModal';
import PremiumUpgradeModal from './PremiumUpgradeModal';
import FloralSeal from './brand/FloralSeal';
import Sticker from './brand/Sticker';
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

const FREE_INCLUDED = [
  'Feed de novedades por género',
  'Búsqueda de libros',
  'Catálogo de la comunidad',
  'Intercambios P2P',
  'Unirse a clubes de lectura',
  'Hasta 10 miembros por club',
];

const FREE_EXCLUDED = ['Libro actual del club', 'Reuniones del club', 'Foro del club'];

const PREMIUM_INCLUDED = [
  'Todo lo del plan Gratis',
  'Sin límite de miembros',
  'Libro actual del club',
  'Reuniones y agenda del club',
  'Foro asíncrono del club',
];

const DARK_FOCUS = 'focus-visible:ring-sunlight';
const TEXT_LINK =
  'inline-flex min-h-11 sm:min-h-0 items-center underline underline-offset-2 rounded-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

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
      <section className="bg-forest text-warm-cream overflow-hidden">
        <div className="mx-auto max-w-[1200px] px-6 pt-7 pb-[104px] flex flex-col gap-14">
          <div className="flex items-center gap-3">
            <FloralSeal variant="mark" size={34} centerColor="#5E5827" />
            <span className="font-mono text-[15px] font-semibold uppercase tracking-[0.16em]">LibrosClub</span>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex min-w-0 flex-col gap-6">
              <motion.div
                className="flex flex-col gap-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <p className="accent-hand text-2xl text-sunlight">hola libro nuevo</p>
                <h1 className="font-serif font-normal text-[clamp(52px,7vw,92px)] leading-[0.98] max-w-2xl">
                  Tu comunidad de lectores
                </h1>
                <p className="font-serif text-[21px] leading-relaxed max-w-xl">
                  Descubrí nuevos libros, intercambialos con otros lectores, unite a clubes de lectura y encontrá tu próxima historia favorita.
                </p>
              </motion.div>

              <motion.div
                className="flex flex-wrap gap-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <Button
                  variant="accent"
                  size="lg"
                  className={`${DARK_FOCUS} ring-offset-forest`}
                  onClick={() => navigate('/app')}
                >
                  Explorar la plataforma
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                {!isAuthenticated && (
                  <Button
                    size="lg"
                    variant="outline"
                    className={`border-warm-cream text-warm-cream hover:bg-warm-cream hover:text-forest ${DARK_FOCUS} ring-offset-forest`}
                    onClick={() => openAuth('register')}
                  >
                    Crear cuenta gratis
                  </Button>
                )}
                <Link
                  to="/regalo"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    `min-h-11 border-sunlight text-sunlight hover:bg-sunlight hover:text-forest ${DARK_FOCUS} ring-offset-forest`,
                  )}
                >
                  <Gift className="h-4 w-4" aria-hidden="true" />
                  Regalá un libro
                </Link>
              </motion.div>

              <motion.p
                className="font-mono text-[13px] tracking-[0.04em]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {isAuthenticated ? (
                  <>
                    Hola, <span className="text-sunlight">{username}</span>.{' '}
                    <button
                      onClick={() => navigate('/app')}
                      className={`${TEXT_LINK} text-sunlight ${DARK_FOCUS} ring-offset-forest`}
                    >
                      Ir a la plataforma
                    </button>
                  </>
                ) : (
                  <>
                    ¿Ya tenés cuenta?{' '}
                    <button
                      onClick={() => openAuth('login')}
                      className={`${TEXT_LINK} text-sunlight ${DARK_FOCUS} ring-offset-forest`}
                    >
                      Iniciá sesión
                    </button>
                  </>
                )}
              </motion.p>
            </div>

            <div className="relative mx-auto w-[260px] sm:w-[400px] max-w-full">
              <FloralSeal variant="emblem" size={400} label="LibrosClub" className="h-auto w-full max-w-full" />
              <Sticker tone="sun" rotate={-8} className="absolute bottom-[8%] left-0">
                Olor a libro nuevo
              </Sticker>
              <Sticker tone="terracotta" rotate={6} className="absolute top-[6%] right-0">
                Compro, apilo, algún día leo
              </Sticker>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-[104px] flex flex-col gap-12">
        <div className="flex flex-col gap-3">
          <h2 className="font-serif font-normal text-[clamp(36px,5vw,52px)] leading-[1.05] text-forest">
            Todo lo que encontrás
          </h2>
          <p className="font-serif text-xl text-ink-muted">Una plataforma pensada para los que aman leer.</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className="card-surface p-7 flex flex-col gap-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-forest">
                    <Icon className="h-6 w-6 text-sunlight" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-[13px] font-medium text-terracotta" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-serif font-normal text-[27px] leading-tight text-forest">{f.title}</h3>
                <p className="font-serif text-lg leading-relaxed text-wood-dark">{f.description}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center">
          <Button size="lg" onClick={() => navigate('/app')}>
            Entrar a la plataforma
            <ArrowRight className="h-4 w-4 text-sunlight" aria-hidden="true" />
          </Button>
        </div>
      </section>

      <section className="bg-wood-dark text-warm-cream">
        <div className="mx-auto max-w-[1000px] px-6 py-[104px] flex flex-col gap-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="accent-hand text-2xl text-sunlight">para cada lector</p>
            <h2 className="font-serif font-normal text-[clamp(36px,5vw,52px)] leading-[1.05]">Planes</h2>
            <p className="font-serif text-xl">Empezá gratis. Desbloqueá todo con Premium.</p>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-6">
            <motion.div
              className="bg-warm-cream text-wood-dark rounded-lg px-8 py-9 flex flex-col gap-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <div className="flex flex-col gap-1">
                <p className="label-mono text-terracotta">Gratis</p>
                <p className="font-serif text-[60px] leading-none text-forest">$0</p>
                <p className="font-mono text-[13px] text-ink-muted">Para siempre</p>
              </div>
              <ul className="flex flex-col gap-3 font-serif text-lg flex-1">
                {FREE_INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="h-5 w-5 text-forest flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
                {FREE_EXCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-ink-muted">
                    <X className="h-5 w-5 text-terracotta flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full ring-offset-warm-cream"
                onClick={() => isAuthenticated ? navigate('/app') : openAuth('register')}
              >
                {isAuthenticated ? 'Ir a la plataforma' : 'Empezar gratis'}
              </Button>
            </motion.div>

            <motion.div
              className="relative bg-forest text-warm-cream rounded-lg px-8 py-9 flex flex-col gap-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.12 }}
            >
              <Sticker tone="sun" rotate={4} decorative={false} className="absolute -top-4 right-6">
                <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                Premium
              </Sticker>
              <div className="flex flex-col gap-1">
                <p className="label-mono text-sunlight">Premium</p>
                <p className="font-serif text-[60px] leading-none">
                  $5<span className="font-mono text-base">/mes</span>
                </p>
                <p className="font-mono text-[13px] text-sidebar-muted">Por club</p>
              </div>
              <ul className="flex flex-col gap-3 font-serif text-lg flex-1">
                {PREMIUM_INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="h-5 w-5 text-sunlight flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              {isPremium ? (
                <div className="flex flex-col gap-2">
                  <span className="pill pill-sun justify-center gap-1.5 py-2 text-xs">
                    <Crown className="h-4 w-4" aria-hidden="true" />
                    Ya sos Premium
                  </span>
                  <Button
                    variant="outline"
                    className={`w-full border-warm-cream text-warm-cream hover:bg-warm-cream hover:text-forest ${DARK_FOCUS} ring-offset-forest`}
                    onClick={() => navigate('/app')}
                  >
                    Ir a la plataforma
                  </Button>
                </div>
              ) : isAuthenticated ? (
                <Button
                  variant="accent"
                  className={`w-full ${DARK_FOCUS} ring-offset-forest`}
                  onClick={() => setPaymentOpen(true)}
                >
                  <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                  Activar Premium
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="accent"
                    className={`w-full ${DARK_FOCUS} ring-offset-forest`}
                    onClick={() => openAuth('login')}
                  >
                    Iniciá sesión para activar
                  </Button>
                  <p className="text-center font-mono text-[13px]">
                    ¿No tenés cuenta?{' '}
                    <button
                      className={`${TEXT_LINK} text-sunlight ${DARK_FOCUS} ring-offset-forest`}
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

      <footer className="bg-forest text-warm-cream">
        <div className="mx-auto max-w-[1200px] px-6 py-7 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <span className="text-sm font-semibold uppercase tracking-[0.16em]">LibrosClub</span>
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
