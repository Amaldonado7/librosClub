import React, { useState } from 'react';
import { Book, bookRequestsAPI, BookRequest } from '../utils/api';
import BookCoverCard from './BookCoverCard';
import { BooksGridSkeleton } from './BookCardSkeleton';
import EmptyState from './EmptyState';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Settings, ChevronRight, CheckCircle, XCircle, Clock, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  token: string | null;
  allBooks: Book[];
  isLoadingBooks: boolean;
  isAdmin: boolean;
  onGoToAdmin: () => void;
  myRequests: Map<number, BookRequest['status']>;
  onRequested: (req: BookRequest) => void;
  onAuthRequired?: () => void;
}

const STATUS_PILL = 'pill w-full justify-center gap-1 py-1.5';

const STATUS_BADGE: Record<string, React.ReactNode> = {
  pending: (
    <span className={cn(STATUS_PILL, 'pill-sun')}>
      <Clock className="h-3 w-3 flex-shrink-0" aria-hidden="true" /> Pendiente
    </span>
  ),
  accepted: (
    <span className={cn(STATUS_PILL, 'pill-forest')}>
      <CheckCircle className="h-3 w-3 flex-shrink-0" aria-hidden="true" /> Aceptado
    </span>
  ),
  rejected: (
    <span className={cn(STATUS_PILL, 'pill-outline text-destructive')}>
      <XCircle className="h-3 w-3 flex-shrink-0" aria-hidden="true" /> Rechazado
    </span>
  ),
};

const LibrosDisponiblesTab: React.FC<Props> = ({
  token, allBooks, isLoadingBooks, isAdmin, onGoToAdmin, myRequests, onRequested, onAuthRequired,
}) => {
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRequest = async (book: Book) => {
    if (!token) { onAuthRequired?.(); return; }
    setRequestingId(book.id);
    try {
      const req = await bookRequestsAPI.request(token, book.id);
      onRequested(req);
      toast({
        title: book.type === 'intercambio' ? 'Solicitud de intercambio enviada' : 'Solicitud de compra enviada',
        description: 'El administrador verá tu solicitud.',
      });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setRequestingId(null);
    }
  };

  if (isLoadingBooks) return <BooksGridSkeleton />;
  if (allBooks.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-7">
      {isAdmin && (
        <button
          type="button"
          onClick={onGoToAdmin}
          className="card-surface border-line-strong w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:border-forest group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-forest flex items-center justify-center flex-shrink-0">
              <Settings className="h-4 w-4 text-sunlight" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="label-mono text-forest">Gestionar catálogo</p>
              <p className="font-serif text-base text-ink-muted">Agregá, editá o eliminá libros desde el panel de administración.</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-ink-muted group-hover:text-forest transition-colors flex-shrink-0" aria-hidden="true" />
        </button>
      )}

      <div className="cover-grid">
        {allBooks.map((book, i) => {
          const reqStatus = myRequests.get(Number(book.id));
          return (
            <div key={book.id} className="flex min-w-0 flex-col gap-2">
              <BookCoverCard
                title={book.title}
                subtitle={book.author}
                badge={book.type === 'intercambio' ? 'Intercambio' : 'En venta'}
                badgeVariant={book.type === 'intercambio' ? 'accent' : 'primary'}
                thumbnail={book.coverUrl}
                index={i}
              />
              {!isAdmin && (
                reqStatus ? (
                  STATUS_BADGE[reqStatus]
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleRequest(book)}
                    disabled={requestingId === book.id}
                    className="w-full"
                  >
                    {requestingId === book.id ? '...' : <><ArrowLeftRight className="h-3 w-3" aria-hidden="true" />Solicitar</>}
                  </Button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LibrosDisponiblesTab;
