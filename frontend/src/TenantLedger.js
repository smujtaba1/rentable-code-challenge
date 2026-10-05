import React, { useEffect, useState } from 'react';
import formatCurrency from './formatCurrency';

// The tenant is passed in rather than refetched: the row that was clicked
// already holds its name, unit and balance.
function TenantLedger({ tenant, onBack }) {
    const [transactions, setTransactions] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/tenants/${tenant.id}/transactions/`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => setTransactions(data))
            .catch(error => {
                console.error("Error fetching ledger:", error);
                setError(error);
            })
            .finally(() => setIsLoading(false));
    }, [tenant.id]);

    return (
        <div className="tenant-ledger">
            <button onClick={onBack}>&larr; Back to Tenants</button>
            <h2>{tenant.name}</h2>
            <p>
                Unit {tenant.unit} &middot; Balance {formatCurrency(tenant.balance)}
            </p>
            {isLoading ? (
                <div className="spinner" role="status" aria-label="Loading ledger" />
            ) : error ? (
                <p>Error loading ledger: {error.message}</p>
            ) : transactions.length === 0 ? (
                <p>No transactions for this tenant.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Type</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(transaction => (
                            <tr key={transaction.id}>
                                <td>{transaction.date}</td>
                                <td>{transaction.description}</td>
                                <td>{transaction.type}</td>
                                <td>{formatCurrency(transaction.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default TenantLedger;
