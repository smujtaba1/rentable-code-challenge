// A positive balance is money owed, which is who the manager chases. A
// negative one means the tenant is in credit, so it must not look like a
// debt. Shared by the tenant list and the ledger so both screens agree.
const balanceTone = (balance) => {
    const value = Number(balance);
    if (value > 0) return 'owes';
    if (value < 0) return 'in-credit';
    return '';
};

export default balanceTone;
