import { useEffect, useState } from 'react';
import TransactionFilters from './components/TransactionFilters.jsx';

const EMPTY_FILTERS = {
  startDate: '',
  endDate: '',
  category: '',
  q: '',
};

function filtersFromUrl() {
  const params = new URLSearchParams(window.location.search);

  return Object.fromEntries(
    Object.keys(EMPTY_FILTERS).map((key) => [key, params.get(key) ?? '']),
  );
}

function paramsFromFilters(filters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    const normalizedValue = typeof value === 'string' ? value.trim() : value;
    if (normalizedValue) params.set(key, normalizedValue);
  });

  return params;
}

function replaceUrl(filters) {
  const query = paramsFromFilters(filters).toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

export default function App() {
  const initialFilters = filtersFromUrl();
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    const query = paramsFromFilters(appliedFilters).toString();
    const endpoint = `/api/transactions${query ? `?${query}` : ''}`;

    setStatus('loading');
    fetch(endpoint, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load transactions.');
        return response.json();
      })
      .then((data) => {
        setTransactions(Array.isArray(data) ? data : (data.transactions ?? []));
        setStatus('success');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setStatus('error');
      });

    return () => controller.abort();
  }, [appliedFilters]);

  function applyFilters() {
    replaceUrl(filters);
    setAppliedFilters({ ...filters });
  }

  function clearDateFilters() {
    const clearedFilters = { ...filters, startDate: '', endDate: '' };
    setFilters(clearedFilters);
    replaceUrl(clearedFilters);
    setAppliedFilters(clearedFilters);
  }

  const hasDateRange = Boolean(appliedFilters.startDate || appliedFilters.endDate);

  return (
    <main className="page-shell">
      <header>
        <p className="eyebrow">BoardGo</p>
        <h1>Transactions</h1>
        <p className="subtitle">Review your activity and narrow it down by date.</p>
      </header>

      <section aria-labelledby="transaction-list-heading" className="transaction-panel">
        <TransactionFilters
          filters={filters}
          onChange={setFilters}
          onApply={applyFilters}
          onClear={clearDateFilters}
        />

        <div className="list-heading">
          <h2 id="transaction-list-heading">Transaction history</h2>
        </div>

        {status === 'loading' && <p role="status">Loading transactions…</p>}
        {status === 'error' && <p role="alert">Unable to load transactions.</p>}
        {status === 'success' && transactions.length === 0 && (
          <p className="empty-state">
            {hasDateRange ? 'No transactions in this range' : 'No transactions yet'}
          </p>
        )}
        {status === 'success' && transactions.length > 0 && (
          <ul className="transaction-list">
            {transactions.map((transaction, index) => (
              <li key={transaction.id ?? index}>
                <div>
                  <strong>{transaction.description ?? transaction.vendor ?? 'Transaction'}</strong>
                  <span>{transaction.date}</span>
                </div>
                {transaction.amount != null && <span>{transaction.amount}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
