import React from 'react';

const BookCardSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3">
    <div className="cover-spine shimmer aspect-[2/3] w-full" />
    <div className="flex flex-col gap-2">
      <div className="h-4 w-3/4 rounded-btn shimmer" />
      <div className="h-3 w-1/2 rounded-btn shimmer" />
    </div>
  </div>
);

export const BooksGridSkeleton: React.FC<{ count?: number }> = ({ count = 10 }) => (
  <div className="cover-grid" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <BookCardSkeleton key={i} />
    ))}
  </div>
);

export default BookCardSkeleton;
