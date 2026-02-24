import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProducts, getPriceHistory, triggerScrape, deleteProduct } from '../api'
import PriceChart from '../components/PriceChart'
import { RefreshCw, Trash2, ArrowLeft, AlertCircle } from 'lucide-react'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [scraping, setScraping] = useState(false)
  const [scrapeMsg, setScrapeMsg] = useState('')

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => getProducts().then(r => r.data) })
  const product = products.find(p => p.id === parseInt(id))

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['history', id],
    queryFn: () => getPriceHistory(id).then(r => r.data),
    refetchInterval: 30000
  })

  const handleScrape = async () => {
    setScraping(true)
    setScrapeMsg('')
    try {
      await triggerScrape(id)
      setScrapeMsg('Scrape started — results will appear shortly')
      setTimeout(() => { refetchHistory(); setScrapeMsg('') }, 8000)
    } catch {
      setScrapeMsg('Failed to trigger scrape')
    } finally {
      setScraping(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this product and all its price history?')) return
    await deleteProduct(id)
    queryClient.invalidateQueries(['products'])
    navigate('/')
  }

  const validHistory = history.filter(h => h.price !== null)
  const latest = validHistory[validHistory.length - 1]
  const errors = history.filter(h => h.error)

  if (!product) return <div className="loading">Loading...</div>

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" style={{marginBottom:'1rem'}} onClick={() => navigate('/')}>
        <ArrowLeft size={15} /> Back
      </button>

      <div className="card" style={{marginBottom:'1.25rem'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem'}}>
          <div>
            <h1 style={{fontSize:'1.4rem', marginBottom:'0.25rem'}}>{product.name}</h1>
            <a href={product.url} target="_blank" rel="noreferrer" style={{color:'#888', fontSize:'0.82rem', wordBreak:'break-all'}}>{product.url}</a>
          </div>
          <div style={{display:'flex', gap:'0.75rem'}}>
            <button className="btn btn-ghost btn-sm" onClick={handleScrape} disabled={scraping}>
              <RefreshCw size={14} /> {scraping ? 'Scraping...' : 'Scrape now'}
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        {scrapeMsg && <div style={{marginTop:'1rem', color:'#6366f1', fontSize:'0.875rem'}}>{scrapeMsg}</div>}

        <div style={{display:'flex', gap:'2rem', marginTop:'1.5rem', flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:'0.75rem', color:'#aaa', marginBottom:'0.2rem'}}>CURRENT PRICE</div>
            <div style={{fontSize:'2rem', fontWeight:700, color:'#6366f1'}}>
              {latest ? `£${Number(latest.price).toFixed(2)}` : '—'}
            </div>
          </div>
          {validHistory.length > 1 && (
            <>
              <div>
                <div style={{fontSize:'0.75rem', color:'#aaa', marginBottom:'0.2rem'}}>LOWEST</div>
                <div style={{fontSize:'2rem', fontWeight:700, color:'#22c55e'}}>
                  £{Math.min(...validHistory.map(h => h.price)).toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{fontSize:'0.75rem', color:'#aaa', marginBottom:'0.2rem'}}>HIGHEST</div>
                <div style={{fontSize:'2rem', fontWeight:700, color:'#ef4444'}}>
                  £{Math.max(...validHistory.map(h => h.price)).toFixed(2)}
                </div>
              </div>
            </>
          )}
          <div>
            <div style={{fontSize:'0.75rem', color:'#aaa', marginBottom:'0.2rem'}}>DATA POINTS</div>
            <div style={{fontSize:'2rem', fontWeight:700}}>{validHistory.length}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:'1.25rem'}}>
        <h2 style={{marginBottom:'1.25rem', fontSize:'1rem', fontWeight:600}}>Price history</h2>
        <PriceChart history={history} />
      </div>

      {errors.length > 0 && (
        <div className="card">
          <h2 style={{marginBottom:'1rem', fontSize:'1rem', fontWeight:600, display:'flex', alignItems:'center', gap:'0.5rem'}}>
            <AlertCircle size={16} color="#ef4444" /> Recent errors
          </h2>
          <table className="table">
            <thead><tr><th>Time</th><th>Error</th></tr></thead>
            <tbody>
              {errors.slice(-5).reverse().map(e => (
                <tr key={e.id}>
                  <td style={{whiteSpace:'nowrap', color:'#888', fontSize:'0.8rem'}}>{new Date(e.scraped_at).toLocaleString()}</td>
                  <td style={{color:'#ef4444', fontSize:'0.85rem'}}>{e.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
