import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; 

const ToBill = () => {
  // Database States
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Selected Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState(''); 
  const [newBalanceInput, setNewBalanceInput] = useState('');

  // Cart / Bill State
  const [cart, setCart] = useState([]);
  const [currentProductSelection, setCurrentProductSelection] = useState('');
  const [currentQtyInput, setCurrentQtyInput] = useState(1);

  // New Item Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdMrp, setNewProdMrp] = useState('');
  const [newProdRate, setNewProdRate] = useState('');
  const [newProdQty, setNewProdQty] = useState('');
  const [newProdDisc, setNewProdDisc] = useState(0);

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPlace, setNewCustPlace] = useState('');
  const [newCustBalance, setNewCustBalance] = useState('');

  // Fetch initial data from Supabase
  useEffect(() => {
    async function fetchDatabaseData() {
      try {
        setLoading(true);
        
        const { data: prodData, error: prodErr } = await supabase
          .from('Stock') 
          .select('*')
          .order('productName', { ascending: true });
        if (prodErr) throw prodErr;
        setProducts(prodData || []);
        if (prodData?.length > 0) setCurrentProductSelection(prodData[0].productName);

        const { data: custData, error: custErr } = await supabase
          .from('Customers')
          .select('*')
          .order('customer', { ascending: true });
        if (custErr) throw custErr;
        setCustomers(custData || []);
        if (custData?.length > 0) setSelectedCustomerId(custData[0].customer);

      } catch (err) {
        console.error("Fetch Error: ", err.message);
        setStatusMessage(`Error fetching data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchDatabaseData();
  }, []);

  const currentCustomer = customers.find(c => c.customer === selectedCustomerId);
  const selectedProductObj = products.find(p => p.productName === currentProductSelection);

  const generatePDFInvoice = () => {
    if (cart.length === 0) return alert("Cannot generate an empty invoice!");

    try {
      const doc = new jsPDF();
      const invoiceNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const currentDate = new Date().toLocaleDateString();

      // 1. Invoice Header Styling
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(229, 62, 62); // Premium Red theme
      doc.text("SHIVANSH FOODS", 14, 20);

      // 2. Meta Details Info (Right Aligned)
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90, 115, 122); // var(--text-muted) equivalent color
      doc.text(`Invoice No: ${invoiceNumber}`, 140, 16);
      doc.text(`Date: ${currentDate}`, 140, 22);

      // Divider Line
      doc.setDrawColor(224, 242, 241); // var(--border-light) equivalent color
      doc.line(14, 28, 196, 28);

      // 3. Customer Bill-To Info
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(26, 42, 48); // var(--text-dark) equivalent color
      doc.text("BILLED TO:", 14, 38);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Customer Name: ${currentCustomer ? currentCustomer.customer : 'Walk-in Client'}`, 14, 45);
      doc.text(`Region/Place: ${currentCustomer ? currentCustomer.place : 'N/A'}`, 14, 51);
      // 👈 Swapped raw ₹ with safe text string 'Rs.' to block standard PDF internal crash
      doc.text(`Previous Ledger Outstanding: Rs. ${currentCustomer ? currentCustomer.balance : 0}`, 14, 57);

      // 4. Transform Cart Array Data into Matrix
      const tableHeaders = [["Sl.", "Product Item Description", "Rate (Rs.)", "Qty", "Total Price (Rs.)"]];
      const tableRows = cart.map((item, index) => [
        index + 1,
        item.productName,
        `${item.rate}`,
        item.qty,
        `${item.totalRowAmount}`
      ]);

      // 5. Inject Clean Autotable Data View 
      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 65,
        theme: 'striped',
        headStyles: { fillColor: [229, 62, 62], fontSize: 10, halign: 'left' }, // Filled with red
        styles: { fontSize: 9, font: 'helvetica' },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 95 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20 },
          4: { cellWidth: 35 }
        }
      });

      // 6. Compute Bottom Summary Footer Metrics safely
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 150;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 131, 143); // Deep Aqua
      doc.text(`Current Bill Subtotal: Rs. ${grandTotal}`, 130, finalY);
      
      const projectBal = (currentCustomer?.balance || 0) + grandTotal;
      doc.setFontSize(10);
      doc.setTextColor(90, 115, 122);
      doc.text(`Projected Account Balance: Rs. ${projectBal}`, 130, finalY + 6);

      // 7. Fire Browser Download
      doc.save(`Invoice_${invoiceNumber}.pdf`);
    } catch (pdfError) {
      console.error("PDF Generation failed:", pdfError);
      alert(`Could not generate PDF: ${pdfError.message}`);
    }
  };

  // --- ADD NEW PRODUCT TO DATABASE OPERATION ---
  const handleAddNewProduct = async (e) => {
    e.preventDefault();
    if (!newProdName || !newProdMrp || !newProdRate || !newProdQty) {
      alert("Please fill in all required product fields.");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage('Registering new product...');

      const mrpNum = parseFloat(newProdMrp);
      const rateNum = parseFloat(newProdRate);
      const qtyNum = parseInt(newProdQty);
      const discNum = parseFloat(newProdDisc || 0);
      const amountNum = qtyNum * rateNum;

      const newProductPayload = {
        productName: newProdName,
        mrp: mrpNum,
        rate: rateNum,
        qty: qtyNum,
        disc: discNum,
        amount: amountNum
      };

      const { data, error } = await supabase
        .from('Stock')
        .insert([newProductPayload])
        .select();

      if (error) throw error;

      const addedProduct = data[0];
      setProducts(prev => [...prev, addedProduct].sort((a, b) => a.productName.localeCompare(b.productName)));
      
      setNewProdName('');
      setNewProdMrp('');
      setNewProdRate('');
      setNewProdQty('');
      setNewProdDisc(0);
      
      setStatusMessage(`✨ Successfully added "${addedProduct.productName}" to inventory!`);
    } catch (err) {
      setStatusMessage(` Failed to create item: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // --- ADD NEW CUSTOMER TO DATABASE OPERATION ---
  const handleAddNewCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName || !newCustPlace) {
      alert("Please fill in all required customer fields.");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage('Registering new customer...');

      const balanceNum = parseFloat(newCustBalance) || 0;
      const statusStr = balanceNum === 0 ? 'clear' : 'unpaid';

      const newCustomerPayload = {
        customer: newCustName,
        place: newCustPlace,
        balance: balanceNum,
        status: statusStr
      };

      const { data, error } = await supabase
        .from('Customers')
        .insert([newCustomerPayload])
        .select();

      if (error) throw error;

      const addedCustomer = data[0];
      setCustomers(prev => [...prev, addedCustomer].sort((a, b) => a.customer.localeCompare(b.customer)));
      
      // Auto-select the newly added customer
      setSelectedCustomerId(addedCustomer.customer);

      setNewCustName('');
      setNewCustPlace('');
      setNewCustBalance('');
      
      setStatusMessage(`✨ Successfully added customer "${addedCustomer.customer}"!`);
    } catch (err) {
      setStatusMessage(` Failed to create customer: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // --- CART OPERATIONS ---
  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!selectedProductObj) return;

    if (currentQtyInput > selectedProductObj.qty) {
      alert(`Not enough stock! Only ${selectedProductObj.qty} left.`);
      return;
    }

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
      setCart([...cart, {
        productName: selectedProductObj.productName,
        rate: selectedProductObj.rate,
        qty: currentQtyInput,
        totalRowAmount: currentQtyInput * selectedProductObj.rate
      }]);
    }
    setCurrentQtyInput(1);
  };

  const handleRemoveFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const grandTotal = cart.reduce((sum, item) => sum + item.totalRowAmount, 0);

  // --- SUBMIT BILL TRANSACTIONS ---
  const handleUpdateBalanceOnly = async () => {
    if (!currentCustomer || !newBalanceInput) return;
    try {
      setSubmitting(true);
      const parsedBalance = parseFloat(newBalanceInput);
      const computedStatus = parsedBalance === 0 ? 'clear' : 'unpaid';

      const { error } = await supabase
        .from('Customers')
        .update({ balance: parsedBalance, status: computedStatus })
        .eq('customer', selectedCustomerId);

      if (error) throw error;

      setCustomers(customers.map(c => 
        c.customer === selectedCustomerId ? { ...c, balance: parsedBalance, status: computedStatus } : c
      ));
      setNewBalanceInput('');
      setStatusMessage('Balance manually adjusted successfully!');
    } catch (err) {
      setStatusMessage(`Balance Update Failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckoutBill = async () => {
    if (!currentCustomer) return alert("Please select a customer first.");
    if (cart.length === 0) return alert("Your cart is empty!");

    try {
      setSubmitting(true);
      setStatusMessage('Processing checkout inside database transactions...');

      for (const item of cart) {
        const originalProduct = products.find(p => p.productName === item.productName);
        const updatedQty = originalProduct.qty - item.qty;
        const updatedTotalValuation = updatedQty * originalProduct.rate;

        const { error: stockUpdateErr } = await supabase
          .from('Stock')
          .update({ qty: updatedQty, amount: updatedTotalValuation })
          .eq('productName', item.productName);

        if (stockUpdateErr) throw stockUpdateErr;
      }

      const updatedCustomerBalance = (currentCustomer.balance || 0) + grandTotal;
      const computedStatus = updatedCustomerBalance === 0 ? 'clear' : 'unpaid';

      const { error: custUpdateErr } = await supabase
        .from('Customers')
        .update({ balance: updatedCustomerBalance, status: computedStatus })
        .eq('customer', selectedCustomerId);

      if (custUpdateErr) throw custUpdateErr;

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

      setCart([]);
      setStatusMessage('Invoice Closed! Stock reduced & Customer account updated.');
    } catch (err) {
      setStatusMessage(`Transaction processing halted: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--aqua-dark)' }}>
        <p style={{ fontWeight: '500', fontSize: '16px' }}>Loading POS Billing Dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="page-header">
        <h2 className="heading-gradient-aqua">POS Billing</h2>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        {/* CARD 1: CUSTOMER DATA */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: 'var(--text-dark)', fontWeight: '700', fontFamily: 'Plus Jakarta Sans' }}>Customer Ledger </h3>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Select Client Account:</label>
            <select 
              value={selectedCustomerId} 
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="premium-select"
              style={{ marginBottom: '15px' }}
            >
              {customers.map(c => (
                <option key={c.customer} value={c.customer}>
                  {c.customer} ({c.place})
                </option>
              ))}
            </select>
 
            {currentCustomer && (
              <div style={{ background: 'var(--bg-accent)', padding: '14px', borderRadius: '8px', borderLeft: '3px solid var(--aqua)', fontSize: '13px', lineHeight: '1.6' }}>
                <p style={{ margin: '0 0 6px 0', color: 'var(--text-muted)' }}><strong>Region/Place:</strong> <span style={{ color: 'var(--text-dark)', fontWeight: '500' }}>{currentCustomer.place}</span></p>
                <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)' }}><strong>Outstanding Balance:</strong> <span style={{ color: currentCustomer.balance > 0 ? 'var(--red)' : 'var(--text-dark)', fontWeight: '700' }}>Rs. {currentCustomer.balance}</span></p>
                <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                  <strong>Status:</strong>
                  <span style={{ 
                    textTransform: 'uppercase', 
                    fontSize: '10px', 
                    fontWeight: '700', 
                    padding: '3px 8px', 
                    borderRadius: '12px', 
                    color: currentCustomer.status === 'clear' ? '#059669' : '#e11d48',
                    background: currentCustomer.status === 'clear' ? '#ecfdf5' : '#fff1f2',
                    border: `1px solid ${currentCustomer.status === 'clear' ? '#a7f3d0' : '#fda4af'}`
                  }}>
                    {currentCustomer.status}
                  </span>
                </p>
              </div>
            )}
          </div>
 
          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed var(--border-light)' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-dark)', fontWeight: '600' }}>Override Balance Manually</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="number" 
                placeholder="Set new balance..." 
                value={newBalanceInput} 
                onChange={(e) => setNewBalanceInput(e.target.value)}
                className="premium-input"
                style={{ flex: 1, padding: '8px' }}
              />
              <button 
                onClick={handleUpdateBalanceOnly} 
                disabled={submitting} 
                className="premium-btn-aqua"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Update
              </button>
            </div>
          </div>
        </div>
 
        {/* CARD 2: PULL FROM EXISTING STOCK */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: 'var(--text-dark)', fontWeight: '700', fontFamily: 'Plus Jakarta Sans' }}>Add Item to Invoice</h3>
            <form onSubmit={handleAddToCart}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Product Profile:</label>
              <select 
                value={currentProductSelection} 
                onChange={(e) => setCurrentProductSelection(e.target.value)}
                className="premium-select"
                style={{ marginBottom: '15px' }}
              >
                {products.map(p => (
                  <option key={p.productName} value={p.productName} disabled={p.qty <= 0}>
                    {p.productName} ({p.qty} left @ Rs.{p.rate})
                  </option>
                ))}
              </select>
 
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Quantity Selection:</label>
                <input 
                  type="number" 
                  min="1" 
                  max={selectedProductObj?.qty || 1}
                  value={currentQtyInput} 
                  onChange={(e) => setCurrentQtyInput(parseInt(e.target.value) || 1)}
                  className="premium-input"
                />
              </div>
              <button 
                type="submit" 
                className="premium-btn-aqua" 
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
              >
                Add Item Row
              </button>
            </form>
          </div>
        </div>
 
        {/* CARD 3: ADD NEW PRODUCT TO STOCK */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: 'var(--text-dark)', fontWeight: '700', fontFamily: 'Plus Jakarta Sans' }}>Register New Catalog</h3>
            <form onSubmit={handleAddNewProduct} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <input 
                  type="text" 
                  placeholder="Product Name" 
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="premium-input"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="number" 
                  placeholder="MRP" 
                  value={newProdMrp}
                  onChange={(e) => setNewProdMrp(e.target.value)}
                  className="premium-input"
                  style={{ flex: 1 }}
                />
                <input 
                  type="number" 
                  placeholder="Rate" 
                  value={newProdRate}
                  onChange={(e) => setNewProdRate(e.target.value)}
                  className="premium-input"
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="number" 
                  placeholder="Initial Qty" 
                  value={newProdQty}
                  onChange={(e) => setNewProdQty(e.target.value)}
                  className="premium-input"
                  style={{ flex: 1 }}
                />
                <input 
                  type="number" 
                  placeholder="Disc %" 
                  value={newProdDisc}
                  onChange={(e) => setNewProdDisc(e.target.value)}
                  className="premium-input"
                  style={{ flex: 1 }}
                />
              </div>
              <button 
                type="submit" 
                disabled={submitting} 
                className="premium-btn-red" 
                style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: '10px' }}
              >
                {submitting ? 'Saving...' : 'Save New Product to DB'}
              </button>
            </form>
          </div>
        </div>

        {/* CARD 4: REGISTER NEW CUSTOMER */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: 'var(--text-dark)', fontWeight: '700', fontFamily: 'Plus Jakarta Sans' }}>Register New Customer</h3>
            <form onSubmit={handleAddNewCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <input 
                  type="text" 
                  placeholder="Customer Name" 
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="premium-input"
                  required
                />
              </div>
              <div>
                <input 
                  type="text" 
                  placeholder="Region / Place" 
                  value={newCustPlace}
                  onChange={(e) => setNewCustPlace(e.target.value)}
                  className="premium-input"
                  required
                />
              </div>
              <div>
                <input 
                  type="number" 
                  placeholder="Initial Balance" 
                  value={newCustBalance}
                  onChange={(e) => setNewCustBalance(e.target.value)}
                  className="premium-input"
                />
              </div>
              <button 
                type="submit" 
                disabled={submitting} 
                className="premium-btn-aqua" 
                style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: '10px' }}
              >
                {submitting ? 'Saving...' : 'Save New Customer to DB'}
              </button>
            </form>
          </div>
        </div>
 
      </div>

      {/* LIVE INVOICE PREVIEW SHEET */}
      <div className="premium-table-container" style={{ marginBottom: '20px' }}>
        <div style={{ background: 'var(--bg-accent)', padding: '14px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-dark)', fontWeight: '600' }}>Live Billing Invoice</h3>
        </div>
        <table className="premium-table">
          <thead>
            <tr>
              <th style={{ padding: '14px 18px' }}>Product Item</th>
              <th style={{ padding: '14px 18px', width: '150px' }}>Rate</th>
              <th style={{ padding: '14px 18px', width: '150px' }}>Qty</th>
              <th style={{ padding: '14px 18px', width: '180px' }}>Total Price</th>
              <th style={{ padding: '14px 18px', width: '120px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {cart.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No items added to the bill yet.
                </td>
              </tr>
            ) : (
              cart.map((item, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: '500' }}>{item.productName}</td>
                  <td>Rs. {item.rate}</td>
                  <td>{item.qty} units</td>
                  <td style={{ fontWeight: '700', color: 'var(--aqua-dark)' }}>Rs. {item.totalRowAmount}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      onClick={() => handleRemoveFromCart(index)} 
                      className="premium-btn-red"
                      style={{ padding: '6px 12px', fontSize: '12px', minHeight: 'auto' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {/* SUMMARY ACTION TOOLBAR BLOCK */}
        <div style={{ padding: '20px 24px', background: 'var(--bg-pure)', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)' }}>
          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: 'var(--text-muted)', fontWeight: '600' }}>
              Grand Total Amount: <span style={{ color: 'var(--text-dark)', fontSize: '24px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans', marginLeft: '8px' }}>Rs. {grandTotal}</span>
            </h4>
            {currentCustomer && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
                Post-Bill Balance projection for {currentCustomer.customer}: <strong style={{ color: 'var(--text-dark)' }}>Rs. {(currentCustomer.balance || 0) + grandTotal}</strong>
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={generatePDFInvoice} 
              disabled={cart.length === 0}
              className="premium-btn-aqua"
              style={{ 
                padding: '12px 20px', 
                fontSize: '14px', 
                opacity: cart.length === 0 ? 0.5 : 1,
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Download PDF Bill
            </button>
 
            <button 
              onClick={handleCheckoutBill} 
              disabled={submitting || cart.length === 0} 
              className="premium-btn-red"
              style={{ 
                padding: '12px 20px', 
                fontSize: '14px',
                opacity: cart.length === 0 || submitting ? 0.5 : 1,
                cursor: cart.length === 0 || submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Updating Database...' : 'Submit Bill'}
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="premium-card" style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: 'var(--aqua-dark)', borderLeft: '4px solid var(--aqua)' }}>
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default ToBill;