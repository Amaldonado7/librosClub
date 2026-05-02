const API_BASE_URL = 'http://localhost:3000/api';

export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  publishedDate?: string;
  genre?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return response.json();
  }
};

export const booksAPI = {
  getAllBooks: async (token: string): Promise<Book[]> => {
    const response = await fetch(`${API_BASE_URL}/books`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch books');
    }

    return response.json();
  },

  searchBooks: async (token: string, title: string): Promise<Book[]> => {
    const response = await fetch(`${API_BASE_URL}/books?title=${encodeURIComponent(title)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to search books');
    }

    return response.json();
  },

  getBooksFeed: async (token: string): Promise<Book[]> => {
    const response = await fetch(`${API_BASE_URL}/books/feed`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch books feed');
    }

    return response.json();
  },

  updateBook: async (token: string, id: string, payload: { title: string; author: string; genre?: string; coverUrl?: string }): Promise<Book> => {
    const response = await fetch(`${API_BASE_URL}/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Error al actualizar libro');
    return response.json();
  },

  deleteBook: async (token: string, id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/books/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Error al eliminar libro');
  },

  createBook: async (token: string, payload: { title: string; author: string; genre?: string; coverUrl?: string }): Promise<Book> => {
    const response = await fetch(`${API_BASE_URL}/books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Error al agregar libro');
    }

    return response.json();
  },

  searchGoogleBooks: async (q: string, page: number = 0, pageSize: number = 20) => {
    const response = await fetch(
      `${API_BASE_URL}/google-books/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}&lang=es`
    );
    if (!response.ok) throw new Error('Failed to search Google Books');
    return response.json();
  },

  getGoogleFeed: async (topic: string = 'fiction', page: number = 0, limit: number = 15) => {
    const response = await fetch(
      `${API_BASE_URL}/google-books/feed?topic=${encodeURIComponent(topic)}&page=${page}&limit=${limit}&lang=es`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Google Books feed');
    }

    return response.json();
  },
};
