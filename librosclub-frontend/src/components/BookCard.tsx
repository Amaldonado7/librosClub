import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Book } from '../utils/api';
import { BookOpen } from 'lucide-react';

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  return (
    <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white border-amber-100">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-16 h-24 object-cover rounded-md shadow-sm"
              />
            ) : (
              <div className="w-16 h-24 bg-gradient-to-br from-amber-100 to-orange-100 rounded-md flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-amber-600" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-900 text-lg mb-1 line-clamp-2">
              {book.title}
            </h3>
            <p className="text-amber-700 font-medium mb-2">
              {book.author}
            </p>
            {book.genre && (
              <span className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full mb-2">
                {book.genre}
              </span>
            )}
            {book.description && (
              <p className="text-gray-600 text-sm line-clamp-3">
                {book.description}
              </p>
            )}
            {book.publishedDate && (
              <p className="text-gray-500 text-xs mt-2">
                Publicado: {new Date(book.publishedDate).getFullYear()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookCard;
