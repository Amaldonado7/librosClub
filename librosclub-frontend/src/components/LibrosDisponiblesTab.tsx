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
  token: string;
  allBooks: Book[];
  isLoadingBooks: boolean;
  isAdmin: boolean;
  onGoToAdmin: () => void;
  myRequests: Map<number, BookRequest['status']>;
  onRequested: (req: BookRequest) => void;
}

const STATUS_BADGE: Record<string, React.ReactNode> = {
  pending: (
    <span className="flex items-center justify-center gap-1 text-xs font-mono bg-accent/20 text-foreground px-2 py-1 rounded-full w-full">
      <Clock className="h-3 w-3 flex-shrink-0" /> Pendiente
    </span>
  ),
  accepted: (
    <span className="flex items-center justify-center gap-1 text-xs font-mono bg-primary/15 text-primary px-2 py-1 rounded-full w-full">
      <CheckCircle className="h-3 w-3 flex-shrink-0" /> Aceptado
    </span>
  ),
  rejected: (
    <span className="flex items-center justify-center gap-1 text-xs font-mono bg-destructive/10 text-destructive px-2 py-1 rounded-full w-full">
      <XCircle className="h-3 w-3 flex-shrink-0" /> Rechazado
    </span>
  ),
};

const LibrosDisponiblesTab: React.FC<Props> = ({
  token, allBooks, isLoadingBooks, isAdmin, onGoToAdmin, myRequests, onRequested,
}) => {
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRequest = async (book: Book) => {
    setRequestingId(book.id);
    try {
      const req = await bookRequestsAPI.request(token, book.id);
      onRequested(req);
      toast({
        title: book.type === 'intercambio' ? 'Solicitud de intercambio enviada' : 'Solicitud de compra enviada',
        description: 'El administrador verá tu solicitud.',
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setRequestingId(null);
    }
  };

  if (isLoadingBooks) return <BooksGridSkeleton />;
  if (allBooks.length === 0) return <EmptyState />;

  return (
    <div className="space-y-5">
      {isAdmin && (
        <button
          onClick={onGoToAdmin}
          className="w-full flex items-center justify-between gap-4 bg-primary/8 border border-primary/20 rounded-xl px-5 py-4 text-left hover:bg-primary/12 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-mono text-sm font-bold text-foreground">Gestionar catálogo</p>
              <p className="text-xs text-muted-foreground mt-0.5">Agregá, editá o eliminá libros desde el panel de administración.</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </button>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {allBooks.map((book, i) => {
          const reqStatus = myRequests.get(Number(book.id));
          return (
            <div key={book.id} className="flex flex-col gap-1.5">
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
                    className="w-full text-xs h-8 bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {requestingId === book.id ? '...' : <><ArrowLeftRight className="h-3 w-3 mr-1.5" />Solicitar</>}
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
