import React, { useState, useEffect } from 'react'
// Fixed: Adjusted the path to step out of the "pages" folder to find supabaseClient
import { supabase } from '../supabaseClient'
import { data } from 'react-router-dom'

const Stock = () => { 
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        
        // Fetching data from your Supabase table named 'products'
        const { data, error: supabaseError } = await supabase
          .from('Stock') 
          .select('*')      
          .order('productName', { ascending: true }) 
          

        if (supabaseError) throw supabaseError

        setProducts(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
    console.log(products)
  }, [])

  if (loading) return <div className="stockFlow"><p>Loading inventory...</p></div>
  if (error) return <div className="stockFlow" style={{ color: 'red' }}><p>Error: {error}</p></div>

  return (
    <div>
        {/* Table Header */}
        <div className='stockCat stockFlow'>
          <p>PRODUCT NAME</p>
          <p>MRP</p>
          <p>QTY</p>
          <p>RATE</p>
          <p>DISC.</p> 
          <p>AMOUNT</p>
        </div>
        
        {/* Table Rows */}
        <div className='stockProd'>
          {products.map((x) => (
            // Fixed: Ensuring a unique key, falling back to an index if productName isn't unique
            <div className='stockFlow' key={x.id || x.productName}> 
              <p>{x.productName}</p> 
              <p>{x.mrp}</p> 
              <p>{x.qty}</p>
              <p>{x.rate}</p>
              <p>{x.disc}</p>
              <p>{x.amount}</p>
            </div>
          ))}
        </div>
    </div>
  )
}

export default Stock