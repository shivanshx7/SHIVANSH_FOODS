import { useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import ToBill from './pages/ToBill'
import Stock from './pages/Stock'
import Order from './pages/Order'

function App() {
  const [toShow, setToShow] = useState(0)

  return (
    <div id="body">
      <Sidebar className="sidebar" setToShow={setToShow} toShow={toShow}/>
      <div className='show'>
        {toShow === 0 && <Dashboard />}
        {toShow === 1 && <Stock />} 
        {toShow === 2 && <ToBill />}
        {toShow === 3 && <Order />}
      </div>
    </div>
  )
}

export default App