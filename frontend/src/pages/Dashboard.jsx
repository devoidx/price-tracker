import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProducts, getPriceHistory } from '../api'
import { useAuth } from '../context/AuthContext'
import ProductCard from '../components/ProductCard'
import AddProductModal from '../components/AddProductModal'
import { Plus } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts().then(r => r.data)
  })

  // Fetch latest price for each product
  const { data: latestPrices = {} } = useQuery({
    queryKey: ['latestPrices', products.map(p => p.id)],
    queryFn: async () => {
      const results = {}
      await Promise.all(products.map(async p => {
        const res = await getPriceHistory(p.id)
        const history = res.data.filter(h => h.price !== null)
        if (history.length > 0) results[p.id] = history[history.length - 1]
      }))
      return results
    },
    enabled: products.length > 0
  })

  const handleAdded = (product) => {
    queryClient.invalidateQueries(['products'])
  }

  return (
    <div className="page">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
        <div>
          <h1 className="page-title" style={{marginBottom:0}}>Dashboard</h1>
          <p style={{color:'#888', fontSize:'0.9rem'}}>Welcome back, {user.username}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Track product
        </button>
      </div>

      {isLoading ? (
        <div className="loading" style={{height:'200px'}}>Loading...</div>
      ) : products.length === 0 ? (
        <div className="card" style={{textAlign:'center', padding:'3rem', color:'#888'}}>
          <div style={{fontSize:'3rem', marginBottom:'1rem'}}>📦</div>
          <div style={{fontWeight:600, marginBottom:'0.5rem'}}>No products tracked yet</div>
          <div style={{fontSize:'0.9rem', marginBottom:'1.5rem'}}>Add your first product to start tracking prices</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Track your first product
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {products.map(p => (
            <ProductCard key={p.id} product={p} latestPrice={latestPrices[p.id]} />
          ))}
        </div>
      )}

      {showModal && <AddProductModal onClose={() => setShowModal(false)} onAdded={handleAdded} />}
    </div>
  )
}
