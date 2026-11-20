import React, { useState, useEffect, useRef } from 'react';
import { bookRequestsAPI, BookRequestMessage } from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, X, MessageCircle } from 'lucide-react';

interface Props {
  requestId: number;
  token: string;
  currentUserId: number;
  bookTitle: string;
  requesterUsername?: string;
  onClose: () => void;
}

const RequestChatModal: React.FC<Props> = ({
  requestId, token, currentUserId, bookTitle, requesterUsername, onClose,
}) => {
  const [messages, setMessages] = useState<BookRequestMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const loadMessages = async () => {
    try {
      const data = await bookRequestsAPI.getMessages(token, requestId);
      setMessages(data);
    } catch { /* fallo silencioso en poll */ }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const msg = await bookRequestsAPI.sendMessage(token, requestId, text.trim());
      setMessages((prev) => [...prev, msg]);
      setText('');
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-wood-dark/60 backdrop-blur-sm p-4">
      <div
        className="bg-surface border-[1.5px] border-line rounded-lg shadow-xl w-full max-w-md flex flex-col"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-[1.5px] border-line flex-shrink-0">
          <div className="min-w-0">
            <p className="label-mono text-ink-muted flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-terracotta flex-shrink-0" aria-hidden="true" />
              Coordinar intercambio
            </p>
            <p className="font-serif text-xl text-forest mt-0.5 truncate">
              {bookTitle}{requesterUsername ? ` · con ${requesterUsername}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-11 w-11 items-center justify-center rounded-pill text-wood-dark hover:bg-warm-cream flex-shrink-0 ml-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-surface"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {messages.length === 0 && (
            <p className="text-center font-serif text-base text-ink-muted py-8">
              Ningún mensaje todavía. ¡Empezá la conversación para coordinar el intercambio!
            </p>
          )}
          {messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                <span className="label-mono text-ink-muted px-1">{msg.senderUsername}</span>
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-lg text-base leading-relaxed ${
                  isOwn
                    ? 'bg-forest text-warm-cream rounded-br-sm'
                    : 'bg-warm-cream border-[1.5px] border-line text-wood-dark rounded-bl-sm'
                }`}>
                  {msg.message}
                </div>
                <span className="label-mono text-[11px] text-ink-muted px-1">
                  {new Date(msg.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 border-t-[1.5px] border-line flex-shrink-0">
          <Input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribí un mensaje..."
            aria-label="Escribí un mensaje..."
            maxLength={500}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !text.trim()}
            aria-label="Enviar"
            className="bg-accent text-accent-foreground hover:bg-accent/90 h-11 w-11 md:h-9 md:w-9 flex-shrink-0"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RequestChatModal;
