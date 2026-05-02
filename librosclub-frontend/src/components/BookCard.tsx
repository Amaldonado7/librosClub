import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Book } from '../utils/api';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface BookCardProps {
  book: Book;
  index?: number;
}

const BookCard: React.FC<BookCardProps> = ({ book, index = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="h-full hover:shadow-warm transition-all duration-300 hover:-translate-y-1 bg-card border-border group">
        <CardContent className="p-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-20 h-28 object-cover rounded-md shadow-card"
                />
              ) : (
                <div className="w-20 h-28 bg-gradient-to-br from-secondary to-muted rounded-md flex items-center justify-center shadow-card">
                  <BookOpen className="h-8 w-8 text-primary/60" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-serif font-semibold text-foreground text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                {book.title}
              </h3>
              <p className="text-muted-foreground font-medium text-sm mb-2">
                {book.author}
              </p>
              {book.genre && (
                <span className="inline-block bg-secondary text-secondary-foreground text-xs px-2.5 py-1 rounded-full mb-2 font-medium">
                  {book.genre}
                </span>
              )}
              {book.description && (
                <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                  {book.description}
                </p>
              )}
              {book.publishedDate && (
                <p className="text-muted-foreground/70 text-xs mt-2">
                  Publicado: {new Date(book.publishedDate).getFullYear()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BookCard;
