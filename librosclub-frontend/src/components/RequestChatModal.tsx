import React, { useState, useEffect, useRef } from 'react';
import { bookRequestsAPI, BookRequestMessage } from '../utils/api';
import { Button } from '@/components/ui/button';
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md flex flex-col"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <p className="font-mono text-sm font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-accent flex-shrink-0" />
              Coordinar intercambio
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {bookTitle}{requesterUsername ? ` · con ${requesterUsername}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0 ml-3">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">
              Ningún mensaje todavía. ¡Empezá la conversación para coordinar el intercambio!
            </p>
          )}
          {messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-muted-foreground px-1">{msg.senderUsername}</span>
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isOwn
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}>
                  {msg.message}
                </div>
                <span className="text-[10px] text-muted-foreground/60 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 border-t border-border flex-shrink-0">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribí un mensaje..."
            maxLength={500}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors font-sans"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !text.trim()}
            className="bg-accent text-accent-foreground hover:bg-accent/90 h-9 w-9 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RequestChatModal;
