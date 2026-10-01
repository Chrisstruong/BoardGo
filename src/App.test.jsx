import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

function emptyResponse() {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  });
}

describe('transaction date filters', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    vi.stubGlobal('fetch', vi.fn(emptyResponse));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows an inline error and blocks an invalid range request', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText('Start date'), '2026-09-20');
    await user.type(screen.getByLabelText('End date'), '2026-09-10');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Start date must be on or before end date.',
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('calls the API with the selected valid range and keeps it in the URL', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText('Start date'), '2026-09-01');
    await user.type(screen.getByLabelText('End date'), '2026-09-30');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        '/api/transactions?startDate=2026-09-01&endDate=2026-09-30',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
    expect(window.location.search).toBe('?startDate=2026-09-01&endDate=2026-09-30');
  });

  it('supports an open-ended range', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText('Start date'), '2026-09-01');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        '/api/transactions?startDate=2026-09-01',
        expect.any(Object),
      ),
    );
  });

  it('clears URL params and requests all transactions', async () => {
    window.history.replaceState(
      null,
      '',
      '/?startDate=2026-09-01&endDate=2026-09-30',
    );
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/transactions?startDate=2026-09-01&endDate=2026-09-30',
        expect.any(Object),
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith('/api/transactions', expect.any(Object)),
    );
    expect(window.location.search).toBe('');
    expect(screen.getByLabelText('Start date')).toHaveValue('');
    expect(screen.getByLabelText('End date')).toHaveValue('');
  });

  it('clears only date params when another shared filter is active', async () => {
    window.history.replaceState(
      null,
      '',
      '/?startDate=2026-09-01&category=food&q=lunch',
    );
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        '/api/transactions?category=food&q=lunch',
        expect.any(Object),
      ),
    );
    expect(window.location.search).toBe('?category=food&q=lunch');
  });

  it('shows the range-specific empty state', async () => {
    window.history.replaceState(null, '', '/?endDate=2026-09-30');
    render(<App />);

    expect(await screen.findByText('No transactions in this range')).toBeVisible();
  });
});
