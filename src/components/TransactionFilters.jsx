import { useEffect, useRef, useState } from 'react';

const SEARCH_DEBOUNCE_MS = 300;

export default function TransactionFilters({
  filters,
  categories,
  onChange,
  onApply,
  onClear,
  onCategoryChange,
  onSearchChange,
}) {
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState(filters.q);
  const debounceRef = useRef(null);

  useEffect(() => {
    setSearchText(filters.q);
  }, [filters.q]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

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

  function handleSearchChange(event) {
    const value = event.target.value;
    setSearchText(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(value), SEARCH_DEBOUNCE_MS);
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

      <div className="category-search-fields">
        <label>
          Category
          <select
            value={filters.category}
            onChange={(event) => onCategoryChange(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Search
          <input
            type="search"
            name="q"
            value={searchText}
            onChange={handleSearchChange}
            placeholder="Search by vendor or description"
          />
        </label>
      </div>
    </form>
  );
}
