import React, { useEffect, useState } from 'react';
import formatCurrency, { formatSigned } from './formatCurrency';

// The balance after every entry, not just at the end. Reconciling means
// comparing two ledgers until the numbers stop matching, and a closing total
// only says that something diverged, not where.
const withRunningBalance = (rows) => {
    let running = 0;
    return rows.map(row => {
        // What this entry does to the balance. Not the same as the raw
        // amount: a negative payment is a returned payment, which adds.
        const effect = row.type === 'charge' ? Number(row.amount) : -Number(row.amount);
        running += effect;
        return { ...row, effect, running };
    });
};

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
                            <th className="amount">Amount</th>
                            <th className="amount">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {withRunningBalance(transactions).map(transaction => (
                            <tr key={transaction.id}>
                                <td>{transaction.date}</td>
                                <td>{transaction.description}</td>
                                <td>{transaction.type}</td>
                                {/* The signed effect, so the row states
                                    whether it adds or subtracts. */}
                                <td className="amount">{formatSigned(transaction.effect)}</td>
                                <td className="amount">{formatCurrency(transaction.running)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default TenantLedger;
