import React, { useEffect, useState } from 'react';

// The API serializes balance as a string, so it needs coercing before any
// comparison or formatting.
const formatCurrency = (balance) =>
    Number(balance).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// A positive balance is money owed, which is who the manager chases. A
// negative one is the tenant in credit, so it must not look like a debt.
const balanceClass = (balance) => {
    const value = Number(balance);
    if (value > 0) return 'owes';
    if (value < 0) return 'in-credit';
    return '';
};

function TenantList() {
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

    return (
        <div className="tenant-list">
            <h2>Tenants</h2>
            {tenants.length === 0 ? (
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
                        {tenants.map(tenant => (
                            <tr key={tenant.id} className={balanceClass(tenant.balance)}>
                                <td>{tenant.id}</td>
                                <td>{tenant.pms_tenant_id}</td>
                                <td>{tenant.name}</td>
                                <td>{tenant.unit}</td>
                                <td>{formatCurrency(tenant.balance)}</td>
                                <td><button>View Ledger</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default TenantList; 
