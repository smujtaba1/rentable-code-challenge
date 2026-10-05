// The API serializes decimals as strings, so they need coercing before any
// comparison or formatting. Shared by the tenant list and the ledger.
const formatCurrency = (value) =>
    Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default formatCurrency;
