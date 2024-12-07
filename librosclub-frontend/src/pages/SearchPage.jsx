import React, { useState } from 'react';

const SearchPage = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    const handleSearch = async () => {
        // Simulación de búsqueda (puedes conectar el backend aquí)
        setResults([
            { id: 1, title: 'Libro 1' },
            { id: 2, title: 'Libro 2' },
        ]);
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Buscador de libros</h1>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca un libro..."
            />
            <button onClick={handleSearch}>Buscar</button>

            <ul>
                {results.map((book) => (
                    <li key={book.id}>{book.title}</li>
                ))}
            </ul>
        </div>
    );
};

export default SearchPage;
