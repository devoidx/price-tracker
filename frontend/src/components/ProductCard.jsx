import { useNavigate } from 'react-router-dom'

export default function ProductCard({ product, latestPrice }) {
  const navigate = useNavigate()

  return (
    <div className="card product-card" onClick={() => navigate(`/products/${product.id}`)}>
      <div style={{display:'flex', alignItems:'center', marginBottom:'0.5rem'}}>
        <span className={`status-dot ${product.active ? 'active' : 'inactive'}`} />
        <h3>{product.name}</h3>
      </div>
      <div className="url">{product.url}</div>
      {latestPrice ? (
        <>
          <div className="price-badge">£{Number(latestPrice.price).toFixed(2)}</div>
          <div className="price-meta">
            Last checked {new Date(latestPrice.scraped_at).toLocaleString()}
          </div>
        </>
      ) : (
        <div className="no-data">No price data yet — scrape pending</div>
      )}
      <div style={{marginTop:'0.75rem', fontSize:'0.75rem', color:'#bbb'}}>
        Checks every {product.interval_minutes < 60
          ? `${product.interval_minutes}m`
          : `${product.interval_minutes / 60}h`}
      </div>
    </div>
  )
}
