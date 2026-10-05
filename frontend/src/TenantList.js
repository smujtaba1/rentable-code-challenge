import React, { useEffect, useState } from 'react';
import formatCurrency from './formatCurrency';
import balanceTone from './balance';

const FILTERS = [
    { key: 'all', label: 'All', match: () => true },
    { key: 'owes', label: 'Owes', match: (value) => value > 0 },
    { key: 'credit', label: 'In Credit', match: (value) => value < 0 },
    { key: 'settled', label: 'Settled', match: (value) => value === 0 },
];

function TenantList({ onSelectTenant, activeFilter, onFilterChange }) {
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
            {visibleTenants.length === 0 ? (
                <p>No tenants found.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>PMS ID</th>
                            <th>Name</th>
                            <th>Unit</th>
                            <th>Balance</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleTenants.map(tenant => (
                            <tr key={tenant.id} className={balanceTone(tenant.balance)}>
                                <td>{tenant.id}</td>
                                <td>{tenant.pms_tenant_id}</td>
                                <td>{tenant.name}</td>
                                <td>{tenant.unit}</td>
                                <td>{formatCurrency(tenant.balance)}</td>
                                <td><button onClick={() => onSelectTenant(tenant)}>View Ledger</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default TenantList; 
