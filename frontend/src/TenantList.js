import React, { useEffect, useState } from 'react';
import formatCurrency from './formatCurrency';
import balanceTone from './balance';

// The value accessor is what lets one comparator serve every column: balance
// arrives from the API as a string, so without Number() it would sort
// lexicographically and put "1000" before "900".
const COLUMNS = [
    { key: 'id', label: 'ID', value: t => t.id },
    { key: 'pms_tenant_id', label: 'PMS ID', value: t => t.pms_tenant_id },
    { key: 'name', label: 'Name', value: t => t.name },
    { key: 'unit', label: 'Unit', value: t => t.unit },
    { key: 'balance', label: 'Balance', value: t => Number(t.balance) },
];

// localeCompare rather than < for text, so case and accents order properly.
const compare = (a, b) => (typeof a === 'string' ? a.localeCompare(b) : a - b);

const FILTERS = [
    { key: 'all', label: 'All', match: () => true },
    { key: 'owes', label: 'Owes', match: (value) => value > 0 },
    { key: 'credit', label: 'In Credit', match: (value) => value < 0 },
    { key: 'settled', label: 'Settled', match: (value) => value === 0 },
];

function TenantList({ onSelectTenant, activeFilter, onFilterChange, sort, onSortChange }) {
    const [tenants, setTenants] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/tenants/')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => setTenants(data))
            .catch(error => {
                console.error("Error fetching tenants:", error);
                setError(error);
            })
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) {
        return (
            <div className="tenant-list">
                <div className="spinner" role="status" aria-label="Loading tenants" />
            </div>
        );
    }

    if (error) {
        return <div>Error loading tenants: {error.message}</div>;
    }

    // Filtered here rather than server-side: the endpoint already returns
    // every tenant, so this needs no request and no API change.
    const activeMatch = FILTERS.find(f => f.key === activeFilter).match;
    const visibleTenants = tenants.filter(t => activeMatch(Number(t.balance)));

    // Derived, not stored, so filter and sort compose without either going
    // stale. The spread is deliberate: Array.prototype.sort mutates in place.
    // id breaks ties so equal values keep a deterministic order.
    const sortColumn = COLUMNS.find(c => c.key === sort.key);
    const sortedTenants = [...visibleTenants].sort((a, b) => {
        const left = sortColumn.value(a);
        const right = sortColumn.value(b);
        // unit is nullable. Nulls are handled before the direction is applied
        // so they stay last either way, rather than flipping to the top on a
        // descending sort.
        if (left == null || right == null) {
            if (left == null && right == null) return a.id - b.id;
            return left == null ? 1 : -1;
        }
        const result = compare(left, right) || a.id - b.id;
        return sort.direction === 'asc' ? result : -result;
    });

    // A new column starts ascending; the same column flips direction.
    const toggleSort = (key) => {
        onSortChange(
            sort.key === key
                ? { key, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' }
        );
    };

    return (
        <div className="tenant-list">
            <h2>Tenants</h2>
            {/* Outside the empty check below, so filtering down to zero rows
                still leaves a way back to All. */}
            <div className="tenant-filters">
                {FILTERS.map(({ key, label, match }) => (
                    <button
                        key={key}
                        onClick={() => onFilterChange(key)}
                        className={key === activeFilter ? 'active' : ''}
                        aria-pressed={key === activeFilter}
                    >
                        {label} ({tenants.filter(t => match(Number(t.balance))).length})
                    </button>
                ))}
            </div>
            {sortedTenants.length === 0 ? (
                <p>No tenants found.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            {COLUMNS.map(({ key, label }) => (
                                <th
                                    key={key}
                                    aria-sort={
                                        sort.key === key
                                            ? `${sort.direction === 'asc' ? 'ascend' : 'descend'}ing`
                                            : 'none'
                                    }
                                >
                                    {/* A real button, so keyboard focus and
                                        Enter come for free. */}
                                    <button onClick={() => toggleSort(key)}>
                                        {label}
                                        {sort.key === key && (sort.direction === 'asc' ? ' ▲' : ' ▼')}
                                    </button>
                                </th>
                            ))}
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTenants.map(tenant => (
                            <tr key={tenant.id} className={balanceTone(tenant.balance)}>
                                <td>{tenant.id}</td>
                                <td>{tenant.pms_tenant_id}</td>
                                <td>{tenant.name}</td>
                                <td>{tenant.unit}</td>
                                <td>{formatCurrency(tenant.balance)}</td>
                                <td className="col-action">
                                    <button
                                        className="link-button"
                                        onClick={() => onSelectTenant(tenant)}
                                    >
                                        View Ledger
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default TenantList; 
