import React from 'react'
import { NavLink } from 'react-router-dom'

const Sidebar = ({ className ,setToShow,toShow}) => {
  return (
    <div className={className}>
        <ul>
            <li onClick={()=>setToShow(0)} className={toShow===0?'active':''}>Dashboard</li>
            <li onClick={()=>setToShow(1)} className={toShow===1?'active':''}>Stock</li>
            <li onClick={()=>setToShow(2)} className={toShow===2?'active':''}>Billing</li>
            <li onClick={()=>setToShow(3)} className={toShow===3?'active':''}>Order</li>
        </ul>
    </div>

  )
}

export default Sidebar