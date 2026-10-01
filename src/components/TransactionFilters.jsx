import { useState } from 'react';

export default function TransactionFilters({ filters, onChange, onApply, onClear }) {
  const [error, setError] = useState('');

  function updateDate(field, value) {
    setError('');
    onChange({ ...filters, [field]: value });
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      setError('Start date must be on or before end date.');
      return;
    }

    setError('');
    onApply();
  }

  function handleClear() {
    setError('');
    onClear();
  }

  return (
    <form className="transaction-filters" onSubmit={handleSubmit} noValidate>
      <div className="date-fields">
        <label>
          Start date
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={(event) => updateDate('startDate', event.target.value)}
            aria-describedby={error ? 'date-range-error' : undefined}
            aria-invalid={Boolean(error)}
          />
        </label>

        <label>
          End date
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={(event) => updateDate('endDate', event.target.value)}
            aria-describedby={error ? 'date-range-error' : undefined}
            aria-invalid={Boolean(error)}
          />
        </label>
      </div>

      {error && (
        <p className="filter-error" id="date-range-error" role="alert">
          {error}
        </p>
      )}

      <div className="filter-actions">
        <button type="submit">Apply</button>
        <button type="button" className="secondary" onClick={handleClear}>
          Clear
        </button>
      </div>
    </form>
  );
}
