import React from 'react'

const Sidebar = ({ className, setToShow, toShow }) => {
  return (
    <div className={className}>
      <div className="sidebar-title-container">
        <h1 className="sidebar-brand-name" >Shivansh<span className='jj'> Foods</span></h1>
 
      </div>
      <ul>
        <li onClick={() => setToShow(0)} className={toShow === 0 ? 'active' : ''}>
          <span></span> Dashboard
        </li>
        <li onClick={() => setToShow(1)} className={toShow === 1 ? 'active' : ''}>
          <span></span> Stock Ledger
        </li>
        <li onClick={() => setToShow(2)} className={toShow === 2 ? 'active' : ''}>
          <span></span> POS Billing
        </li>
        <li onClick={() => setToShow(3)} className={toShow === 3 ? 'active' : ''}>
          <span></span> Replenishment
        </li>
      </ul>
    </div>
  )
}

export default Sidebar