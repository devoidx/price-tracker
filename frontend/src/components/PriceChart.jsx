import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import { Box, Text } from '@chakra-ui/react'

const SOURCE_COLOURS = ['#319795', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6']

export default function PriceChart({ history, sources }) {
  if (!history || history.length === 0) return <Text fontSize="sm" color="gray.400">No price data yet</Text>

  const getLabel = (sourceId) => {
    if (!sources) return `Source ${sourceId}`
    const source = sources.find(s => s.id === parseInt(sourceId))
    return source ? source.label : sourceId
  }

  // Group history by source
  const bySource = {}
  history.forEach(h => {
    if (h.price === null) return
    if (!bySource[h.source_id]) bySource[h.source_id] = []
    bySource[h.source_id].push({
      time: new Date(h.scraped_at).getTime(),
      price: parseFloat(h.price),
      label: new Date(h.scraped_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    })
  })

  const sourceIds = Object.keys(bySource)
  if (sourceIds.length === 0) return <Text fontSize="sm" color="gray.400">No price data yet</Text>

  // Each source gets its own sorted data points — don't try to merge timelines
  // Instead build a combined dataset where each source contributes its own points
  // and we label by index across all sources combined
  const allPoints = []
  sourceIds.forEach(sourceId => {
    bySource[sourceId].forEach(point => {
      allPoints.push({ ...point, sourceId })
    })
  })
  allPoints.sort((a, b) => a.time - b.time)

  // Build chart data: one entry per unique timestamp, with a key per source
  const timeMap = {}
  allPoints.forEach(point => {
    const key = point.label
    if (!timeMap[key]) timeMap[key] = { time: key }
    timeMap[key][`source_${point.sourceId}`] = point.price
  })

  const data = Object.values(timeMap)

  const allPrices = allPoints.map(p => p.price)
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const padding = (maxPrice - minPrice) * 0.1 || 1

  return (
    <Box h="300px">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice - padding, maxPrice + padding]}
            tick={{ fontSize: 11 }}
            tickFormatter={v => `£${v.toFixed(2)}`}
            tickLine={false}
            width={70}
          />
	  <Tooltip
  formatter={(value, name) => [`£${Number(value).toFixed(2)}`, name]}
/>
//	  <Tooltip formatter={(value, name) => [`£${Number(value).toFixed(2)}`, getLabel(name.replace('source_', '')) ]} />
          <Legend />
          {sourceIds.map((sourceId, i) => (
            <Line
              key={sourceId}
              type="monotone"
              dataKey={`source_${sourceId}`}
              name={getLabel(sourceId)}
              stroke={SOURCE_COLOURS[i % SOURCE_COLOURS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls={true}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}
