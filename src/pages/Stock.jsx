import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Stock = () => {
  // Database State
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  // --- 🔍 FILTER & SORTING STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // options: all, inStock, lowStock, outOfStock
  const [sortBy, setSortBy] = useState('nameAsc'); // options: nameAsc, nameDesc, qtyAsc, qtyDesc, valuationDesc
  const LOW_STOCK_THRESHOLD = 10; // Critical volume line

  // Fetch full inventory data from Supabase Stock Table
  useEffect(() => {
    async function fetchInventory() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('Stock')
          .select('*')
          .order('productName', { ascending: true });

        if (error) throw error;
        setStockItems(data || []);
      } catch (err) {
        console.error("Inventory Fetch Error:", err.message);
        setStatusMessage(`Error loading inventory: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchInventory();
  }, []);

  // --- 🎛️ FILTER AND SORTING LOGIC ---
  const filteredAndSortedItems = stockItems
    .filter((item) => {
      // 1. Text Search Filter
      const matchesSearch = item.productName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

      // 2. Stock Availability Filter
      let matchesStatus = true;
      if (statusFilter === 'inStock') {
        matchesStatus = item.qty > 0;
      } else if (statusFilter === 'lowStock') {
        matchesStatus = item.qty > 0 && item.qty <= LOW_STOCK_THRESHOLD;
      } else if (statusFilter === 'outOfStock') {
        matchesStatus = item.qty === 0 || item.qty === null;
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // 3. Multi-Option Sorter Engine
      if (sortBy === 'nameAsc') {
        return (a.productName || '').localeCompare(b.productName || '');
      }
      if (sortBy === 'nameDesc') {
        return (b.productName || '').localeCompare(a.productName || '');
      }
      if (sortBy === 'qtyAsc') {
        return (a.qty || 0) - (b.qty || 0);
      }
      if (sortBy === 'qtyDesc') {
        return (b.qty || 0) - (a.qty || 0);
      }
      if (sortBy === 'valuationDesc') {
        return (b.amount || 0) - (a.amount || 0);
      }
      return 0;
    });

  // --- 📈 AGGREGATE SUMMARY COUNTERS ---
  const totalItemsCount = stockItems.length;
  const outOfStockCount = stockItems.filter(i => (i.qty || 0) === 0).length;
  const lowStockCount = stockItems.filter(i => (i.qty || 0) > 0 && (i.qty || 0) <= LOW_STOCK_THRESHOLD).length;
  const totalInventoryValuation = stockItems.reduce((sum, i) => sum + (i.amount || 0), 0);

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--aqua-dark)' }}>
        <p style={{ fontWeight: '500', fontSize: '16px' }}>Loading Live Inventory Stock Ledger...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      
      {/* HEADER SECTION */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 className="heading-gradient-aqua">Stock Ledger</h2>
          <p>Real-time corporate ledger index & product inventory metrics</p>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Safety Threshold Level: <strong style={{ color: 'var(--red)' }}>≤ {LOW_STOCK_THRESHOLD} units</strong>
        </span>
      </div>

      {/* 📊 SUMMARY ANALYTICS WIDGETS COCKPIT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="premium-card">
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total SKUs Matrix</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '24px', color: 'var(--text-dark)', fontWeight: '800', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.02em' }}>{totalItemsCount} Products</h3>
        </div>
        <div className="premium-card">
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Low Stock Warnings</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '24px', color: lowStockCount > 0 ? 'var(--red)' : 'var(--text-dark)', fontWeight: '800', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.02em' }}>{lowStockCount} Items</h3>
        </div>
        <div className="premium-card">
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Out of Stock Outages</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '24px', color: outOfStockCount > 0 ? 'var(--red)' : 'var(--text-dark)', fontWeight: '800', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.02em' }}>{outOfStockCount} Items</h3>
        </div>
        <div className="premium-card">
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Asset Valuation</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '24px', color: 'var(--text-dark)', fontWeight: '800', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.02em' }}>Rs. {totalInventoryValuation.toLocaleString()}</h3>
        </div>
      </div>

      {/* 🎛️ CONTROLS FILTER PANEL TOOLBAR CARD */}
      <div className="premium-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', marginBottom: '30px' }}>
        
        {/* 1. TEXT SEARCH BOX */}
        <div style={{ flex: '1', minWidth: '250px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Search Item Catalog:</label>
          <input 
            type="text"
            placeholder="Type to find product description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="premium-input"
          />
        </div>

        {/* 2. STATUS SELECTOR */}
        <div style={{ width: '220px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Availability Track:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="premium-select"
          >
            <option value="all">All Products ({totalItemsCount})</option>
            <option value="inStock">In Stock ({totalItemsCount - outOfStockCount})</option>
            <option value="lowStock">Low Stock Warning ({lowStockCount})</option>
            <option value="outOfStock">Out of Stock ({outOfStockCount})</option>
          </select>
        </div>

        {/* 3. SORTING MECHANISM */}
        <div style={{ width: '240px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Sort Ledger By:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="premium-select"
          >
            <option value="nameAsc">Alphabetical (A ➔ Z)</option>
            <option value="nameDesc">Alphabetical (Z ➔ A)</option>
            <option value="qtyDesc">Stock Quantity (High ➔ Low)</option>
            <option value="qtyAsc">Stock Quantity (Low ➔ High)</option>
            <option value="valuationDesc">Valuation Amount (High ➔ Low)</option>
          </select>
        </div>

        {/* 4. CLEAR BUTTONS */}
        {(searchTerm || statusFilter !== 'all') && (
          <button 
            onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
            className="premium-btn-red"
            style={{ padding: '10px 16px', fontSize: '13px', alignSelf: 'flex-end' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* 📜 TABLE DATA LEDGER PREVIEW */}
      <div className="premium-table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th style={{ padding: '14px 18px' }}>Product Item Description</th>
              <th style={{ padding: '14px 18px', width: '120px' }}>MRP</th>
              <th style={{ padding: '14px 18px', width: '120px' }}>Rate</th>
              <th style={{ padding: '14px 18px', width: '120px' }}>Discount %</th>
              <th style={{ padding: '14px 18px', width: '160px', textAlign: 'center' }}>Remaining Qty</th>
              <th style={{ padding: '14px 18px', width: '160px', textAlign: 'right' }}>Total Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedItems.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No items in inventory matched your specified filter criteria.
                </td>
              </tr>
            ) : (
              filteredAndSortedItems.map((item, idx) => {
                // Determine row color code or alert states
                let qtyBadgeBg = 'var(--bg-accent)';
                let qtyBadgeTextColor = 'var(--text-dark)';
                let rowBgColor = idx % 2 === 0 ? 'var(--bg-pure)' : 'var(--bg-accent)';

                if ((item.qty || 0) === 0) {
                  qtyBadgeBg = 'var(--red-light)';
                  qtyBadgeTextColor = 'var(--red-dark)';
                  rowBgColor = 'rgba(225, 29, 72, 0.02)'; // soft rose highlight tint
                } else if ((item.qty || 0) <= LOW_STOCK_THRESHOLD) {
                  qtyBadgeBg = 'var(--aqua-light)';
                  qtyBadgeTextColor = 'var(--aqua-dark)';
                  rowBgColor = 'rgba(79, 70, 229, 0.02)'; // soft indigo highlight tint
                }

                return (
                  <tr key={item.productName || idx} style={{ background: rowBgColor }}>
                    <td style={{ fontWeight: '500', color: 'var(--text-dark)' }}>{item.productName}</td>
                    <td style={{ color: 'var(--text-muted)' }}>Rs. {item.mrp}</td>
                    <td style={{ color: 'var(--text-dark)', fontWeight: '600' }}>Rs. {item.rate}</td>
                    <td style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{item.disc || 0}%</td>
                    
                    {/* QUANTITY BADGE COLUMN */}
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: qtyBadgeBg, color: qtyBadgeTextColor, border: `1px solid ${qtyBadgeTextColor === 'var(--red-dark)' ? 'var(--border-red-light)' : 'var(--border-light)'}` }}>
                        {item.qty || 0} units
                        {item.qty === 0 ? ' (Out)' : item.qty <= LOW_STOCK_THRESHOLD ? ' (Low)' : ''}
                      </span>
                    </td>

                    {/* VALUATION AMOUNT COLUMN */}
                    <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--aqua-dark)' }}>
                      Rs. {(item.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {/* FOOTER COUNT BAR */}
        <div style={{ background: 'var(--bg-accent)', padding: '12px 18px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right', fontWeight: '500', borderTop: '1px solid var(--border-light)' }}>
          Showing {filteredAndSortedItems.length} of {totalItemsCount} registered inventory rows.
        </div>
      </div>

      {statusMessage && (
        <div className="premium-card-red" style={{ marginTop: '20px', padding: '12px', textAlign: 'center', fontWeight: '600', color: 'var(--red-dark)' }}>
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default Stock;