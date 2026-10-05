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

// Charged and paid use the raw amounts, so a concession reduces what was
// charged and a returned payment reduces what was paid. Their difference is
// the balance, which means the three figures visibly reconcile on screen.
const summarise = (rows) => {
    let charged = 0;
    let paid = 0;
    rows.forEach(row => {
        const amount = Number(row.amount);
        if (row.type === 'charge') {
            charged += amount;
        } else {
            paid += amount;
        }
    });
    return { charged, paid, balance: charged - paid };
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

    const totals = summarise(transactions);

    return (
        <div className="tenant-ledger">
            <button onClick={onBack}>&larr; Back to Tenants</button>
            <h2>{tenant.name}</h2>
            <p>Unit {tenant.unit}</p>
            {isLoading ? (
                <div className="spinner" role="status" aria-label="Loading ledger" />
            ) : error ? (
                <p>Error loading ledger: {error.message}</p>
            ) : transactions.length === 0 ? (
                <p>No transactions for this tenant.</p>
            ) : (
                <>
                    <div className="ledger-summary">
                        <div>
                            <span>Total Charged</span>
                            <strong>{formatCurrency(totals.charged)}</strong>
                        </div>
                        <div>
                            <span>Total Paid</span>
                            <strong>{formatCurrency(totals.paid)}</strong>
                        </div>
                        <div>
                            <span>Balance</span>
                            <strong>{formatCurrency(totals.balance)}</strong>
                        </div>
                    </div>
                    {/* A plain link: the server sets Content-Disposition, so
                        the browser handles the download itself. */}
                    <a
                        className="csv-link"
                        href={`/api/tenants/${tenant.id}/transactions/csv/`}
                    >
                        Download CSV
                    </a>
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
                </>
            )}
        </div>
    );
}

export default TenantLedger;
