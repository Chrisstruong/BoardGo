import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

function mockFetch({ categories = [], transactions = [] } = {}) {
  return vi.fn((url) => {
    if (typeof url === 'string' && url.startsWith('/api/categories')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ categories }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ transactions }) });
  });
}

function transactionCalls() {
  return fetch.mock.calls.filter(([url]) => typeof url === 'string' && url.startsWith('/api/transactions'));
}

describe('transaction date filters', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    vi.stubGlobal('fetch', mockFetch());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows an inline error and blocks an invalid range request', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(transactionCalls()).toHaveLength(1));

    await user.type(screen.getByLabelText('Start date'), '2026-09-20');
    await user.type(screen.getByLabelText('End date'), '2026-09-10');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Start date must be on or before end date.',
    );
    expect(transactionCalls()).toHaveLength(1);
  });

  it('calls the API with the selected valid range and keeps it in the URL', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(transactionCalls()).toHaveLength(1));

    await user.type(screen.getByLabelText('Start date'), '2026-09-01');
    await user.type(screen.getByLabelText('End date'), '2026-09-30');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(transactionCalls().at(-1)).toEqual([
        '/api/transactions?startDate=2026-09-01&endDate=2026-09-30',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ]),
    );
    expect(window.location.search).toBe('?startDate=2026-09-01&endDate=2026-09-30');
  });

  it('supports an open-ended range', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(transactionCalls()).toHaveLength(1));

    await user.type(screen.getByLabelText('Start date'), '2026-09-01');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(transactionCalls().at(-1)[0]).toBe('/api/transactions?startDate=2026-09-01'),
    );
  });

  it('clears URL params and requests all transactions', async () => {
    window.history.replaceState(null, '', '/?startDate=2026-09-01&endDate=2026-09-30');
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() =>
      expect(transactionCalls().at(-1)[0]).toBe(
        '/api/transactions?startDate=2026-09-01&endDate=2026-09-30',
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => expect(transactionCalls().at(-1)[0]).toBe('/api/transactions'));
    expect(window.location.search).toBe('');
    expect(screen.getByLabelText('Start date')).toHaveValue('');
    expect(screen.getByLabelText('End date')).toHaveValue('');
  });

  it('clears only date params when another shared filter is active', async () => {
    window.history.replaceState(null, '', '/?startDate=2026-09-01&category=food&q=lunch');
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => expect(transactionCalls()).toHaveLength(1));
    await user.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() =>
      expect(transactionCalls().at(-1)[0]).toBe('/api/transactions?category=food&q=lunch'),
    );
    expect(window.location.search).toBe('?category=food&q=lunch');
  });

  it('shows the range-specific empty state', async () => {
    window.history.replaceState(null, '', '/?endDate=2026-09-30');
    render(<App />);

    expect(await screen.findByText('No transactions in this range')).toBeVisible();
  });
});

describe('transaction category and keyword filters', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('populates the category dropdown from GET /api/categories, defaulting to "All categories"', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        categories: [
          { id: 1, name: 'Food' },
          { id: 2, name: 'Rent' },
        ],
      }),
    );
    render(<App />);

    const select = await screen.findByLabelText('Category');
    await waitFor(() => expect(select).toHaveTextContent('Food'));
    expect(select).toHaveTextContent('Rent');
    expect(select.value).toBe('');
  });

  it('shows only "All categories" when the user has no categories', async () => {
    vi.stubGlobal('fetch', mockFetch({ categories: [] }));
    render(<App />);

    const select = await screen.findByLabelText('Category');
    await waitFor(() => expect(select.querySelectorAll('option')).toHaveLength(1));
  });

  it('selecting a category sends the category param', async () => {
    vi.stubGlobal('fetch', mockFetch({ categories: [{ id: 1, name: 'Food' }] }));
    const user = userEvent.setup();
    render(<App />);

    await screen.findByLabelText('Category');
    await waitFor(() => expect(transactionCalls()).toHaveLength(1));

    await user.selectOptions(screen.getByLabelText('Category'), '1');

    await waitFor(() => expect(transactionCalls().at(-1)[0]).toBe('/api/transactions?category=1'));
    expect(window.location.search).toBe('?category=1');
  });

  it('typing a keyword sends one debounced request with q', async () => {
    vi.stubGlobal('fetch', mockFetch());
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(transactionCalls()).toHaveLength(1));

    await user.type(screen.getByLabelText('Search'), 'lunch');
    expect(transactionCalls()).toHaveLength(1);

    await waitFor(
      () => expect(transactionCalls().at(-1)[0]).toBe('/api/transactions?q=lunch'),
      { timeout: 1000 },
    );
    expect(transactionCalls()).toHaveLength(2);
  });

  it('a keyword with only spaces is ignored', async () => {
    vi.stubGlobal('fetch', mockFetch());
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(transactionCalls()).toHaveLength(1));

    await user.type(screen.getByLabelText('Search'), '   ');

    await waitFor(() => expect(transactionCalls().at(-1)[0]).toBe('/api/transactions'), {
      timeout: 1000,
    });
  });

  it('combines date, category and keyword filters together', async () => {
    vi.stubGlobal('fetch', mockFetch({ categories: [{ id: 1, name: 'Food' }] }));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByLabelText('Category');
    await waitFor(() => expect(transactionCalls()).toHaveLength(1));

    await user.type(screen.getByLabelText('Start date'), '2026-09-01');
    await user.type(screen.getByLabelText('End date'), '2026-09-30');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(transactionCalls()).toHaveLength(2));

    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await waitFor(() => expect(transactionCalls()).toHaveLength(3));

    await user.type(screen.getByLabelText('Search'), 'bagel');
    await waitFor(() => expect(transactionCalls()).toHaveLength(4), { timeout: 1000 });

    expect(transactionCalls().at(-1)[0]).toBe(
      '/api/transactions?startDate=2026-09-01&endDate=2026-09-30&category=1&q=bagel',
    );
  });

  it('falls back to "All categories" when the selected category no longer exists', async () => {
    window.history.replaceState(null, '', '/?category=99');
    vi.stubGlobal('fetch', mockFetch({ categories: [{ id: 1, name: 'Food' }] }));
    render(<App />);

    await screen.findByLabelText('Category');
    await waitFor(() => expect(screen.getByLabelText('Category').value).toBe(''));
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('shows "No matching transactions" when a category/keyword filter has no results', async () => {
    window.history.replaceState(null, '', '/?q=zzz');
    vi.stubGlobal('fetch', mockFetch());
    render(<App />);

    expect(await screen.findByText('No matching transactions')).toBeVisible();
  });
});
