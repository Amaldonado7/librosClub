const API_BASE_URL = 'http://localhost:3000/api';

// Dispara un evento global cuando el backend responde 401 con expired:true
async function handleResponse(res: Response): Promise<Response> {
  if (res.status === 401) {
    const body = await res.clone().json().catch(() => ({}));
    if (body.expired) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
  }
  return res;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  publishedDate?: string;
  genre?: string;
  type?: 'venta' | 'intercambio';
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error((body as any).message ?? 'Credenciales incorrectas.');
    }
    return response.json();
  },

  register: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error((body as any).message ?? 'Error al registrarse.');
    }
    return response.json();
  },
};

export const booksAPI = {
  getAllBooks: async (token: string | null): Promise<Book[]> => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await handleResponse(await fetch(`${API_BASE_URL}/books`, { headers }));

    if (!response.ok) {
      throw new Error('Failed to fetch books');
    }

    return response.json();
  },

  searchBooks: async (token: string, title: string): Promise<Book[]> => {
    const response = await handleResponse(await fetch(`${API_BASE_URL}/books?title=${encodeURIComponent(title)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }));

    if (!response.ok) {
      throw new Error('Failed to search books');
    }

    return response.json();
  },

  getBooksFeed: async (token: string): Promise<Book[]> => {
    const response = await handleResponse(await fetch(`${API_BASE_URL}/books/feed`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }));

    if (!response.ok) {
      throw new Error('Failed to fetch books feed');
    }

    return response.json();
  },

  updateBook: async (token: string, id: string, payload: { title: string; author: string; genre?: string; coverUrl?: string; type?: 'venta' | 'intercambio'; description?: string }): Promise<Book> => {
    const response = await handleResponse(await fetch(`${API_BASE_URL}/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
    }));
    if (!response.ok) throw new Error('Error al actualizar libro');
    return response.json();
  },

  deleteBook: async (token: string, id: string): Promise<void> => {
    const response = await handleResponse(await fetch(`${API_BASE_URL}/books/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    }));
    if (!response.ok) throw new Error('Error al eliminar libro');
  },

  createBook: async (token: string, payload: { title: string; author: string; genre?: string; coverUrl?: string; type?: 'venta' | 'intercambio'; description?: string }): Promise<Book> => {
    const response = await handleResponse(await fetch(`${API_BASE_URL}/books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }));

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

export interface ExchangeListing {
  id: number;
  userId: number;
  username: string;
  title: string;
  author: string;
  coverUrl?: string | null;
  description?: string | null;
  status: 'available' | 'exchanged';
  createdAt: string;
  myRequestStatus?: 'pending' | 'accepted' | 'rejected' | null;
}

export interface ExchangeRequest {
  id: number;
  listingId: number;
  requesterId: number;
  requesterUsername: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface MyListing extends ExchangeListing {
  requests: ExchangeRequest[];
}

const authHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export const exchangeAPI = {
  getListings: async (token: string): Promise<ExchangeListing[]> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/exchanges`, { headers: authHeaders(token) }));
    if (!r.ok) throw new Error('Error al cargar publicaciones.');
    return r.json();
  },

  createListing: async (
    token: string,
    payload: { title: string; author: string; coverUrl?: string; description?: string }
  ): Promise<ExchangeListing> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/exchanges`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }));
    if (!r.ok) throw new Error('Error al publicar libro.');
    return r.json();
  },

  deleteListing: async (token: string, id: number): Promise<void> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/exchanges/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }));
    if (!r.ok) throw new Error('Error al eliminar publicación.');
  },

  getMyListings: async (token: string): Promise<MyListing[]> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/exchanges/my`, { headers: authHeaders(token) }));
    if (!r.ok) throw new Error('Error al cargar tus publicaciones.');
    return r.json();
  },

  requestExchange: async (token: string, listingId: number): Promise<void> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/exchanges/${listingId}/request`, {
      method: 'POST',
      headers: authHeaders(token),
    }));
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.message ?? 'Error al solicitar intercambio.');
    }
  },

  respondToRequest: async (
    token: string,
    requestId: number,
    status: 'accepted' | 'rejected'
  ): Promise<void> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/exchanges/requests/${requestId}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    }));
    if (!r.ok) throw new Error('Error al responder solicitud.');
  },

  getAdminListings: async (token: string): Promise<ExchangeListing[]> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/exchanges/admin`, { headers: authHeaders(token) }));
    if (!r.ok) throw new Error('Error al cargar publicaciones.');
    return r.json();
  },
};

export interface BookRequest {
  id: number;
  bookId: number;
  type: 'compra' | 'intercambio';
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  title?: string;
  author?: string;
  coverUrl?: string | null;
  requesterId?: number;
  requesterUsername?: string;
}

export interface BookRequestMessage {
  id: number;
  requestId: number;
  senderId: number;
  senderUsername: string;
  message: string;
  createdAt: string;
}

export interface Club {
  id: number;
  nombre: string;
  descripcion?: string | null;
  ubicacion?: string | null;
  lat?: number | null;
  lng?: number | null;
  creadorId: number;
  creadorUsername: string;
  fechaCreacion: string;
  miembros: number;
  miRol?: 'miembro' | 'admin' | null;
  currentBookTitle?: string | null;
  currentBookAuthor?: string | null;
  currentBookCoverUrl?: string | null;
  distanceKm?: number;
}

export interface ClubMeeting {
  id: number;
  clubId: number;
  titulo: string;
  descripcion?: string | null;
  fecha: string;
  ubicacion?: string | null;
  createdAt: string;
}

export interface ClubPost {
  id: number;
  clubId: number;
  autorId: number;
  autorUsername: string;
  contenido: string;
  createdAt: string;
}

export interface ClubDetail extends Club {
  meetings: ClubMeeting[];
  posts: ClubPost[];
}

export const clubsAPI = {
  getClubs: async (token: string | null): Promise<Club[]> => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = await handleResponse(await fetch(`${API_BASE_URL}/clubs`, { headers }));
    if (!r.ok) throw new Error('Error al cargar clubes.');
    return r.json();
  },

  createClub: async (
    token: string,
    payload: { nombre: string; descripcion?: string; ubicacion?: string; lat?: number | null; lng?: number | null }
  ): Promise<Club> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/clubs`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }));
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.message ?? 'Error al crear el club.');
    }
    return r.json();
  },

  joinClub: async (token: string, clubId: number): Promise<void> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/clubs/${clubId}/join`, {
      method: 'POST',
      headers: authHeaders(token),
    }));
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.message ?? 'Error al unirse al club.');
    }
  },

  leaveClub: async (token: string, clubId: number): Promise<void> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/clubs/${clubId}/leave`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }));
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.message ?? 'Error al salir del club.');
    }
  },

  getClubDetail: async (token: string, clubId: number): Promise<ClubDetail> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/clubs/${clubId}`, { headers: authHeaders(token) }));
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.message ?? 'Error al cargar detalle del club.');
    }
    return r.json();
  },

  setCurrentBook: async (
    token: string,
    clubId: number,
    payload: { title: string | null; author: string | null; coverUrl?: string | null }
  ): Promise<void> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/clubs/${clubId}/current-book`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }));
    if (!r.ok) throw new Error('Error al actualizar el libro actual.');
  },

  addMeeting: async (
    token: string,
    clubId: number,
    payload: { titulo: string; fecha: string; ubicacion?: string; descripcion?: string }
  ): Promise<ClubMeeting> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/clubs/${clubId}/meetings`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }));
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.message ?? 'Error al agregar reunión.');
    }
    return r.json();
  },

  deleteMeeting: async (token: string, clubId: number, meetingId: number): Promise<void> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/clubs/${clubId}/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }));
    if (!r.ok) throw new Error('Error al eliminar reunión.');
  },

  createPost: async (token: string, clubId: number, contenido: string): Promise<ClubPost> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/clubs/${clubId}/posts`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ contenido }),
    }));
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.message ?? 'Error al publicar mensaje.');
    }
    return r.json();
  },

  deletePost: async (token: string, clubId: number, postId: number): Promise<void> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/clubs/${clubId}/posts/${postId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }));
    if (!r.ok) throw new Error('Error al eliminar mensaje.');
  },

  getNearbyClubs: async (lat: number, lng: number, radius: number, token: string | null): Promise<Club[]> => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = await handleResponse(await fetch(
      `${API_BASE_URL}/clubs/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
      { headers }
    ));
    if (!r.ok) throw new Error('Error al buscar clubes cercanos.');
    return r.json();
  },

  setClubLocation: async (
    token: string,
    clubId: number,
    payload: { lat: number | null; lng: number | null; ubicacion?: string }
  ): Promise<void> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/clubs/${clubId}/location`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }));
    if (!r.ok) throw new Error('Error al actualizar la ubicación.');
  },
};

export const bookRequestsAPI = {
  request: async (token: string, bookId: string): Promise<BookRequest> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/books/${bookId}/request`, {
      method: 'POST',
      headers: authHeaders(token),
    }));
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.message ?? 'Error al enviar solicitud.');
    }
    return r.json();
  },

  getMyRequests: async (token: string): Promise<BookRequest[]> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/books/my-requests`, {
      headers: authHeaders(token),
    }));
    if (!r.ok) throw new Error('Error al cargar solicitudes.');
    return r.json();
  },

  getAdminRequests: async (token: string): Promise<BookRequest[]> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/books/requests`, {
      headers: authHeaders(token),
    }));
    if (!r.ok) throw new Error('Error al cargar solicitudes.');
    return r.json();
  },

  respond: async (token: string, reqId: number, status: 'accepted' | 'rejected'): Promise<void> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/books/requests/${reqId}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    }));
    if (!r.ok) throw new Error('Error al responder solicitud.');
  },

  getMessages: async (token: string, reqId: number): Promise<BookRequestMessage[]> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/books/requests/${reqId}/messages`, {
      headers: authHeaders(token),
    }));
    if (!r.ok) throw new Error('Error al cargar mensajes.');
    return r.json();
  },

  sendMessage: async (token: string, reqId: number, message: string): Promise<BookRequestMessage> => {
    const r = await handleResponse(await fetch(`${API_BASE_URL}/books/requests/${reqId}/messages`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ message }),
    }));
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error((body as any).message ?? 'Error al enviar mensaje.');
    }
    return r.json();
  },
};
