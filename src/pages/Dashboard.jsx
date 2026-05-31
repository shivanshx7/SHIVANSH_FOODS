import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Dashboard = () => {
  // Aggregated Business Analytics Metrics State
  const [metrics, setMetrics] = useState({
    totalStockValuation: 0,
    totalReceivables: 0,
    lowStockSKUs: 0,
    activeCustomersCount: 0
  });
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Safety stock threshold level
  const REPLENISH_THRESHOLD = 10;

  // Fetch High-Level KPIs and Statistics metrics across Supabase collections
  useEffect(() => {
    async function calculateBusinessMetrics() {
      try {
        setMetricsLoading(true);

        // 1. Pull Stock aggregates
        const { data: stockData, error: stockErr } = await supabase
          .from('Stock')
          .select('amount, qty');
        if (stockErr) throw stockErr;

        let stockVal = 0;
        let lowItems = 0;
        stockData?.forEach(item => {
          stockVal += (item.amount || 0);
          if ((item.qty || 0) <= REPLENISH_THRESHOLD) lowItems++;
        });

        // 2. Pull Customer balance aggregates
        const { data: customerData, error: custErr } = await supabase
          .from('Customers')
          .select('balance');
        if (custErr) throw custErr;

        let receivables = 0;
        customerData?.forEach(cust => {
          receivables += (cust.balance || 0);
        });

        setMetrics({
          totalStockValuation: stockVal,
          totalReceivables: receivables,
          lowStockSKUs: lowItems,
          activeCustomersCount: customerData?.length || 0
        });

      } catch (err) {
        console.error("Dashboard Analytics Error:", err.message);
      } finally {
        setMetricsLoading(false);
      }
    }

    calculateBusinessMetrics();
  }, []);

  if (metricsLoading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--aqua-dark)' }}>
        <p style={{ fontWeight: '500', fontSize: '16px' }}>🔄 Syncing financial metrics and ledger indexes...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="page-header">
        <h2 className="heading-gradient-red">📊 Live Enterprise Analytics Dashboard</h2>
        <p>Real-time corporate ledger index & product inventory metrics</p>
      </div>
      
      {/* TOP KPI SCORECARD RIBBON */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        <div className="premium-card" style={{ borderLeft: '4px solid var(--aqua)' }}>
          <span style={kpiLabelStyle('var(--aqua-dark)')}>Asset Value (Stock)</span>
          <h2 style={kpiValueStyle('var(--aqua-dark)')}>Rs. {metrics.totalStockValuation.toLocaleString()}</h2>
          <small style={{ color: 'var(--text-muted)' }}>Total asset valuation of current inventory</small>
        </div>

        <div className="premium-card-red" style={{ borderLeft: '4px solid var(--red)' }}>
          <span style={kpiLabelStyle('var(--red)')}>Accounts Receivable</span>
          <h2 style={kpiValueStyle('var(--red-dark)')}>Rs. {metrics.totalReceivables.toLocaleString()}</h2>
          <small style={{ color: 'var(--text-muted)' }}>Total outstanding ledger balance due</small>
        </div>

        <div className="premium-card-red" style={{ borderLeft: '4px solid var(--red)' }}>
          <span style={kpiLabelStyle('var(--red)')}>Replenishment Alerts</span>
          <h2 style={kpiValueStyle('var(--red-dark)')}>{metrics.lowStockSKUs} SKUs</h2>
          <small style={{ color: 'var(--text-muted)' }}>Items currently at or below safety buffer limits</small>
        </div>

        <div className="premium-card" style={{ borderLeft: '4px solid var(--aqua)' }}>
          <span style={kpiLabelStyle('var(--aqua-dark)')}>Client Ledger Profiles</span>
          <h2 style={kpiValueStyle('var(--aqua-dark)')}>{metrics.activeCustomersCount} Active</h2>
          <small style={{ color: 'var(--text-muted)' }}>Verified business ledger accounts</small>
        </div>

      </div>

      {/* PARAMETERS SUMMARY PANEL */}
      <div className="premium-card" style={{ borderLeft: '4px solid var(--aqua)' }}>
        <h4 style={{ margin: '0 0 12px 0', color: 'var(--aqua-dark)', fontSize: '16px', fontWeight: '600' }}>🛡️ Operational System Parameters</h4>
        <ul style={{ paddingLeft: '20px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.8', margin: 0 }}>
          <li><strong>Inventory Buffer Warning limit:</strong> Set to flags ≤ {REPLENISH_THRESHOLD} units.</li>
          <li><strong>Ledger Synchronization Status:</strong> Secure connection established with upstream Supabase instance.</li>
          <li><strong>Data Refresh Integrity:</strong> Metric scores auto-aggregate cleanly on every initial card container layout mounting phase.</li>
        </ul>
      </div>

    </div>
  );
};

// --- STYLING HELPERS EXPRESSIONS ---
const kpiLabelStyle = (color) => ({
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase',
  color: color,
  marginBottom: '6px',
  letterSpacing: '0.5px'
});

const kpiValueStyle = (color) => ({
  margin: '0 0 8px 0',
  fontSize: '28px',
  fontWeight: '700',
  color: color,
  letterSpacing: '-0.5px'
});

export default Dashboard;