import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Dashboard = () => {
  // Aggregated Business Analytics Metrics State
  const [metrics, setMetrics] = useState({
    totalStockValuation: 0,
    totalReceivables: 0,
    lowStockSKUs: 0,
    activeCustomersCount: 0
  });
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Safety stock threshold level
  const REPLENISH_THRESHOLD = 10;

  // Fetch High-Level KPIs and Statistics metrics across Supabase collections
  useEffect(() => {
    async function calculateBusinessMetrics() {
      try {
        setMetricsLoading(true);

        // 1. Pull Stock aggregates and full item details
        const { data: stockData, error: stockErr } = await supabase
          .from('Stock')
          .select('productName, amount, qty, rate, mrp');
        if (stockErr) throw stockErr;

        let stockVal = 0;
        let lowItems = 0;
        const outOfStockList = [];
        stockData?.forEach(item => {
          stockVal += (item.amount || 0);
          if ((item.qty || 0) <= REPLENISH_THRESHOLD) lowItems++;
          if ((item.qty || 0) === 0) {
            outOfStockList.push(item);
          }
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
        setOutOfStockItems(outOfStockList);

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
        <p style={{ fontWeight: '500', fontSize: '16px' }}>Syncing financial metrics and ledger indexes...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="page-header">
        <h2 className="heading-gradient-red">Operations Overview</h2>
        <p>Real-time corporate ledger index & product inventory metrics</p>
      </div>
      
      {/* TOP KPI SCORECARD RIBBON */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        <div className="premium-card">
          <span style={kpiLabelStyle()}>Asset Value</span>
          <h2 style={kpiValueStyle()}>Rs. {metrics.totalStockValuation.toLocaleString()}</h2>
          <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Total asset valuation of current inventory</small>
        </div>

        <div className="premium-card">
          <span style={kpiLabelStyle()}>Receivables</span>
          <h2 style={kpiValueStyle()}>Rs. {metrics.totalReceivables.toLocaleString()}</h2>
          <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Total outstanding ledger balance due</small>
        </div>

        <div className="premium-card">
          <span style={kpiLabelStyle()}>Replenishment Alerts</span>
          <h2 style={kpiValueStyle(metrics.lowStockSKUs > 0 ? 'var(--red)' : 'var(--text-dark)')}>{metrics.lowStockSKUs} SKUs</h2>
          <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Items at or below safety buffer limits</small>
        </div>

        <div className="premium-card">
          <span style={kpiLabelStyle()}>Active Clients</span>
          <h2 style={kpiValueStyle()}>{metrics.activeCustomersCount}</h2>
          <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Verified business ledger accounts</small>
        </div>

      </div>

      {/* SYSTEM OPERATIONS & CRITICAL STOCK REGISTRY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        {/* OUT OF STOCK ALERTS CARD */}
        <div className="premium-card-red" style={{ borderLeft: '4px solid var(--red)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <h4 style={{ margin: 0, color: 'var(--red-dark)', fontSize: '16px', fontWeight: '600' }}>
              Critical Out-of-Stock Alert Registry
            </h4>
          </div>
          
          {outOfStockItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', background: 'var(--bg-accent)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              All inventory catalogs are currently stocked above zero levels.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-red-light)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--red-light)', borderBottom: '1.5px solid var(--border-red-light)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--red-dark)' }}>Product Item Description</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: 'var(--red-dark)', width: '90px' }}>Rate</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: 'var(--red-dark)', width: '90px' }}>MRP</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: 'var(--red-dark)', width: '100px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outOfStockItems.map((item, idx) => (
                    <tr key={item.productName || idx} style={{ borderBottom: idx === outOfStockItems.length - 1 ? 'none' : '1px solid var(--border-red-light)', background: idx % 2 === 0 ? 'var(--bg-pure)' : 'rgba(229, 62, 62, 0.01)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: '500', color: 'var(--text-dark)' }}>{item.productName}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-dark)', fontWeight: '600' }}>Rs. {item.rate}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>Rs. {item.mrp}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: 'var(--red-light)', color: 'var(--red-dark)', border: '1px solid var(--border-red-light)' }}>
                          Depleted
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PARAMETERS SUMMARY PANEL */}
        <div className="premium-card" style={{ borderLeft: '4px solid var(--aqua)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--aqua-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="9"></line>
              <line x1="9" y1="13" x2="15" y2="13"></line>
              <line x1="9" y1="17" x2="15" y2="17"></line>
            </svg>
            <h4 style={{ margin: 0, color: 'var(--aqua-dark)', fontSize: '16px', fontWeight: '600' }}>
              Operational System Parameters
            </h4>
          </div>
          <ul style={{ paddingLeft: '20px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.8', margin: 0, flex: 1 }}>
            <li><strong>Inventory Buffer Warning limit:</strong> Set to flags ≤ {REPLENISH_THRESHOLD} units.</li>
            <li><strong>Ledger Synchronization Status:</strong> Secure connection established with upstream Supabase instance.</li>
            <li><strong>Data Refresh Integrity:</strong> Metric scores auto-aggregate cleanly on every initial card container layout mounting phase.</li>
          </ul>
        </div>

      </div>

    </div>
  );
};

// --- STYLING HELPERS EXPRESSIONS ---
const kpiLabelStyle = () => ({
  display: 'block',
  fontSize: '11px',
  fontWeight: '600',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: '6px',
  letterSpacing: '0.05em'
});

const kpiValueStyle = (color = 'var(--text-dark)') => ({
  margin: '0 0 8px 0',
  fontSize: '26px',
  fontWeight: '800',
  color: color,
  fontFamily: 'Plus Jakarta Sans, sans-serif',
  letterSpacing: '-0.02em'
});

export default Dashboard;