import React from 'react';
import { Book } from '../utils/api';
import BookCoverCard from './BookCoverCard';

interface BookCardProps {
  book: Book;
  index?: number;
}

const BookCard: React.FC<BookCardProps> = ({ book, index = 0 }) => (
  <BookCoverCard
    title={book.title}
    subtitle={book.author}
    badge={book.genre}
    badgeVariant="primary"
    thumbnail={book.coverUrl}
    index={index}
  />
);

export default BookCard;
