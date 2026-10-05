import React, { useState } from 'react';
import './App.css';
import TenantList from './TenantList';
import TenantLedger from './TenantLedger';

function App() {
  // Which tenant's ledger is open, or null for the list. A view swap rather
  // than a route, since no router is installed.
  const [selectedTenant, setSelectedTenant] = useState(null);

  return (
    <div className="App">
      <header className="App-header-minimal">
        <h1>Property Management Dashboard</h1>
      </header>
      <main className="App-main">
        {selectedTenant ? (
          <TenantLedger
            tenant={selectedTenant}
            onBack={() => setSelectedTenant(null)}
          />
        ) : (
          <TenantList onSelectTenant={setSelectedTenant} />
        )}
      </main>
    </div>
  );
}

export default App;
