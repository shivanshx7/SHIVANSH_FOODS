import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ToBill = () => {
  // Database States
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Selected Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState(''); // Stores the 'customer' name string
  const [newBalanceInput, setNewBalanceInput] = useState('');

  // Cart / Bill State
  const [cart, setCart] = useState([]);
  const [currentProductSelection, setCurrentProductSelection] = useState('');
  const [currentQtyInput, setCurrentQtyInput] = useState(1);

  // Fetch initial data from Supabase
  useEffect(() => {
    async function fetchDatabaseData() {
      try {
        setLoading(true);
        
        // 1. Fetch from 'Stock' table (renamed from products)
        const { data: prodData, error: prodErr } = await supabase
          .from('Stock') 
          .select('*')
          .order('productName', { ascending: true });
        if (prodErr) throw prodErr;
        setProducts(prodData || []);
        if (prodData?.length > 0) setCurrentProductSelection(prodData[0].productName);

        // 2. Fetch from 'Customers' table 
        const { data: custData, error: custErr } = await supabase
          .from('Customers')
          .select('*')
          .order('customer', { ascending: true });
        if (custErr) throw custErr;
        setCustomers(custData || []);
        if (custData?.length > 0) setSelectedCustomerId(custData[0].customer);

      } catch (err) {
        console.error("Fetch Error: ", err.message);
        setStatusMessage(`❌ Error fetching data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchDatabaseData();
  }, []);

  // Find targeted customer and product objects based on exact column names
  const currentCustomer = customers.find(c => c.customer === selectedCustomerId);
  const selectedProductObj = products.find(p => p.productName === currentProductSelection);

  // --- CART OPERATIONS ---
  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!selectedProductObj) return;

    if (currentQtyInput > selectedProductObj.qty) {
      alert(`Not enough stock! Only ${selectedProductObj.qty} left.`);
      return;
    }

    // Check if item is already in cart
    const existingCartItem = cart.find(item => item.productName === selectedProductObj.productName);

    if (existingCartItem) {
      const combinedQty = existingCartItem.qty + currentQtyInput;
      if (combinedQty > selectedProductObj.qty) {
        alert(`Combined quantity exceeds available stock.`);
        return;
      }
      setCart(cart.map(item => 
        item.productName === selectedProductObj.productName 
          ? { ...item, qty: combinedQty, totalRowAmount: combinedQty * item.rate }
          : item
      ));
    } else {
      // Add as a new line item
      setCart([...cart, {
        productName: selectedProductObj.productName,
        rate: selectedProductObj.rate,
        qty: currentQtyInput,
        totalRowAmount: currentQtyInput * selectedProductObj.rate
      }]);
    }
    setCurrentQtyInput(1); // Reset quantity field
  };

  const handleRemoveFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Grand Total Calculation
  const grandTotal = cart.reduce((sum, item) => sum + item.totalRowAmount, 0);

  // --- SUBMIT TRANSACTIONS ---

  // 1. Just Register/Override a New Balance Manually
  const handleUpdateBalanceOnly = async () => {
    if (!currentCustomer || !newBalanceInput) return;
    try {
      setSubmitting(true);
      const parsedBalance = parseFloat(newBalanceInput);
      const computedStatus = parsedBalance === 0 ? 'clear' : 'unpaid';

      const { error } = await supabase
        .from('Customers')
        .update({ 
          balance: parsedBalance,
          status: computedStatus 
        })
        .eq('customer', selectedCustomerId); // Match on 'customer' name column

      if (error) throw error;

      setCustomers(customers.map(c => 
        c.customer === selectedCustomerId ? { ...c, balance: parsedBalance, status: computedStatus } : c
      ));
      setNewBalanceInput('');
      setStatusMessage('✅ Balance manually adjusted successfully!');
    } catch (err) {
      setStatusMessage(`❌ Balance Update Failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Process Final Bill (Updates Stock Table Items & Modifies Customer Table Balance/Status)
  const handleCheckoutBill = async () => {
    if (!currentCustomer) {
      alert("Please select a customer first.");
      return;
    }
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage('Processing checkout inside database transactions...');

      // Loop over cart items to deduct stock in your 'Stock' table sequentially
      for (const item of cart) {
        const originalProduct = products.find(p => p.productName === item.productName);
        const updatedQty = originalProduct.qty - item.qty;
        const updatedTotalValuation = updatedQty * originalProduct.rate;

        const { error: stockUpdateErr } = await supabase
          .from('Stock')
          .update({
            qty: updatedQty,
            amount: updatedTotalValuation
          })
          .eq('productName', item.productName);

        if (stockUpdateErr) throw stockUpdateErr;
      }

      // Update Customers Table (New Balance = Old Balance + Current Invoice Grand Total)
      const updatedCustomerBalance = (currentCustomer.balance || 0) + grandTotal;
      const computedStatus = updatedCustomerBalance === 0 ? 'clear' : 'unpaid';

      const { error: custUpdateErr } = await supabase
        .from('Customers')
        .update({ 
          balance: updatedCustomerBalance,
          status: computedStatus
        })
        .eq('customer', selectedCustomerId);

      if (custUpdateErr) throw custUpdateErr;

      // Sync React Local State directly so frontend values match DB values instantly without lag
      setProducts(prevProducts => prevProducts.map(p => {
        const cartItem = cart.find(item => item.productName === p.productName);
        if (cartItem) {
          const nQty = p.qty - cartItem.qty;
          return { ...p, qty: nQty, amount: nQty * p.rate };
        }
        return p;
      }));

      setCustomers(prevCust => prevCust.map(c => 
        c.customer === selectedCustomerId ? { ...c, balance: updatedCustomerBalance, status: computedStatus } : c
      ));

      setCart([]); // Reset Cart
      setStatusMessage('🎉 Invoice Closed! Stock reduced & Customer account updated.');
    } catch (err) {
      setStatusMessage(`❌ Transaction processing halted: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading POS Billing Dashboard...</p>;

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto', fontFamily: 'Arial, sans-serif', padding: '0 15px' }}>
      <h2>POS Billing & Ledger (Stock & Customers Sync)</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        
        {/* LEFT COLUMN: CUSTOMER DATA */}
        <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '6px', border: '1px solid #ddd' }}>
          <h3>👤 Customer Ledger Lookup</h3>
          <label style={{ display: 'block', marginBottom: '6px' }}>Select Client Account:</label>
          <select 
            value={selectedCustomerId} 
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '12px' }}
          >
            {customers.map(c => (
              <option key={c.customer} value={c.customer}>
                {c.customer} ({c.place})
              </option>
            ))}
          </select>

          {currentCustomer && (
            <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', borderLeft: '4px solid #007bff' }}>
              <p><strong>Region/Place:</strong> {currentCustomer.place}</p>
              <p><strong>Outstanding Balance:</strong> <span style={{ color: currentCustomer.balance > 0 ? 'red' : 'green', fontWeight: 'bold' }}>₹{currentCustomer.balance}</span></p>
              <p><strong>Status:</strong> <span style={{ textTransform: 'uppercase', fontSize: '12px', padding: '2px 6px', borderRadius: '3px', color: '#fff', background: currentCustomer.status === 'clear' ? '#28a745' : '#dc3545' }}>{currentCustomer.status}</span></p>
            </div>
          )}

          {/* Registering balance changes directly */}
          <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #ccc' }}>
            <h4>Override Balance Manually</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="number" 
                placeholder="Set new ledger balance..." 
                value={newBalanceInput} 
                onChange={(e) => setNewBalanceInput(e.target.value)}
                style={{ flex: 1, padding: '6px' }}
              />
              <button onClick={handleUpdateBalanceOnly} disabled={submitting} style={{ padding: '6px 12px', background: '#333', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Update
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: STOCK ITEM SELECTOR */}
        <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '6px', border: '1px solid #ddd' }}>
          <h3>📦 Pull From Stock</h3>
          <form onSubmit={handleAddToCart}>
            <label style={{ display: 'block', marginBottom: '6px' }}>Product Profile:</label>
            <select 
              value={currentProductSelection} 
              onChange={(e) => setCurrentProductSelection(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '12px' }}
            >
              {products.map(p => (
                <option key={p.productName} value={p.productName} disabled={p.qty <= 0}>
                  {p.productName} ({p.qty} items left @ ₹{p.rate})
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px' }}>Quantity Selection:</label>
                <input 
                  type="number" 
                  min="1" 
                  max={selectedProductObj?.qty || 1}
                  value={currentQtyInput} 
                  onChange={(e) => setCurrentQtyInput(parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                />
              </div>
              <button type="submit" style={{ padding: '8px 16px', background: '#28a745', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', height: '33px' }}>
                Add Row
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* INVOICE ENTRY LIST SHEET */}
      <div style={{ border: '1px solid #ccc', borderRadius: '6px', overflow: 'hidden' }}>
        <h3 style={{ background: '#333', color: '#fff', margin: 0, padding: '12px' }}>📝 Live Billing Invoice</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#eee', borderBottom: '2px solid #ccc' }}>
              <th style={{ padding: '10px' }}>Product Item</th>
              <th style={{ padding: '10px' }}>Rate</th>
              <th style={{ padding: '10px' }}>Qty</th>
              <th style={{ padding: '10px' }}>Total Price</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {cart.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#777' }}>No items added to the bill yet.</td>
              </tr>
            ) : (
              cart.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{item.productName}</td>
                  <td style={{ padding: '10px' }}>₹{item.rate}</td>
                  <td style={{ padding: '10px' }}>{item.qty}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>₹{item.totalRowAmount}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button onClick={() => handleRemoveFromCart(index)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer' }}>Remove</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* SUMMARY GRAND TOTAL BLOCK */}
        <div style={{ padding: '15px', background: '#f1f1f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0 }}>Grand Total Amount: <span style={{ fontSize: '20px', color: '#28a745' }}>₹{grandTotal}</span></h4>
            {currentCustomer && (
              <span style={{ fontSize: '12px', color: '#666' }}>
                Post-Bill Balance projection for {currentCustomer.customerName}: ₹{(currentCustomer.balance || 0) + grandTotal}
              </span>
            )}
          </div>
          <button 
            onClick={handleCheckoutBill} 
            disabled={submitting || cart.length === 0} 
            style={{ padding: '10px 20px', background: '#007bff', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', borderRadius: '4px' }}
          >
            {submitting ? 'Updating Database tables...' : 'Submit Bill & Update Accounts'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{ marginTop: '15px', padding: '10px', textAlign: 'center', fontWeight: 'bold', background: '#e9e9e9', borderRadius: '4px' }}>
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default ToBill;