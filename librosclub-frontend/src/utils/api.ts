
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
  }
};
