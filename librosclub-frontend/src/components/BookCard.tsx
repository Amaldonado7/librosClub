import React from 'react';
import { Book } from '../utils/api';
import BookCoverCard from './BookCoverCard';

interface BookCardProps {
  book: Book;
  index?: number;
}

const TYPE_LABELS: Record<string, string> = {
  venta: 'En venta',
  intercambio: 'Para intercambio',
};

const BookCard: React.FC<BookCardProps> = ({ book, index = 0 }) => (
  <BookCoverCard
    title={book.title}
    subtitle={book.author}
    badge={book.type ? TYPE_LABELS[book.type] : book.genre}
    badgeVariant={book.type === 'intercambio' ? 'accent' : 'primary'}
    thumbnail={book.coverUrl}
    index={index}
  />
);

export default BookCard;
