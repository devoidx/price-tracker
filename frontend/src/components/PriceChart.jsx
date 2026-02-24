import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function PriceChart({ history }) {
  const data = history
    .filter(h => h.price !== null)
    .map(h => ({
      date: new Date(h.scraped_at).toLocaleDateString('en-GB', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }),
      price: parseFloat(h.price),
    }))

  if (data.length === 0) {
    return <div className="no-data" style={{padding:'2rem', textAlign:'center'}}>No price data to display yet</div>
  }

  const prices = data.map(d => d.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const padding = (max - min) * 0.1 || 1

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis
          domain={[min - padding, max + padding]}
          tickFormatter={v => `£${v.toFixed(2)}`}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip formatter={v => [`£${v.toFixed(2)}`, 'Price']} />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 3, fill: '#6366f1' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
