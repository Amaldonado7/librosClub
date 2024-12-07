import React, { useEffect, useState } from 'react';

const FeedPage = () => {
    const [books, setBooks] = useState([]);

    useEffect(() => {
        // Simulación de llamada al backend
        setBooks([
            { id: 1, title: 'Libro más vendido 1' },
            { id: 2, title: 'Libro mejor valorado 2' },
        ]);
    }, []);

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Feed de novedades</h1>
            <ul>
                {books.map((book) => (
                    <li key={book.id}>{book.title}</li>
                ))}
            </ul>
        </div>
    );
};

export default FeedPage;
