import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import ExchangeTab from '../ExchangeTab';

const mocks = vi.hoisted(() => ({
  getListings: vi.fn().mockResolvedValue([]),
  getMyListings: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../../utils/api', () => ({
  exchangeAPI: {
    getListings: mocks.getListings,
    getMyListings: mocks.getMyListings,
    createListing: vi.fn(),
    deleteListing: vi.fn(),
    respondToRequest: vi.fn(),
    requestExchange: vi.fn(),
  },
}));

describe('ExchangeTab', () => {
  it('se renderiza y carga las publicaciones', async () => {
    const { container } = render(<ExchangeTab token="tok" currentUserId={1} />);
    await waitFor(() => expect(mocks.getListings).toHaveBeenCalledWith('tok'));
    expect(container.firstElementChild).not.toBeNull();
  });
});
