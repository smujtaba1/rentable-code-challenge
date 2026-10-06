// The API serializes decimals as strings, so they need coercing before any
// comparison or formatting.
const formatCurrency = (value) =>
    Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// Always shows the sign, so a ledger row states outright whether it adds to
// or subtracts from the balance. exceptZero keeps 0.00 unsigned.
export const formatSigned = (value) =>
    Number(value).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        signDisplay: 'exceptZero',
    });

export default formatCurrency;
