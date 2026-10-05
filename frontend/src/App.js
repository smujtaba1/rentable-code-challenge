import React, { useState } from 'react';
import './App.css';
import TenantList from './TenantList';
import TenantLedger from './TenantLedger';

function App() {
  // Which tenant's ledger is open, or null for the list. A view swap rather
  // than a route, since no router is installed.
  const [selectedTenant, setSelectedTenant] = useState(null);
  // Held here rather than in TenantList, which unmounts while a ledger is
  // open and would otherwise reset the filter on the way back.
  const [activeFilter, setActiveFilter] = useState('all');

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
          <TenantList
            onSelectTenant={setSelectedTenant}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        )}
      </main>
    </div>
  );
}

export default App;
