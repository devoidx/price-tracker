import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import { Box, Text } from '@chakra-ui/react'

const SOURCE_COLOURS = ['#319795', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6']

const formatTick = (timestamp) => {
  const d = new Date(timestamp)
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const formatTooltipLabel = (timestamp) => {
  return new Date(timestamp).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function PriceChart({ history, sources }) {
  if (!history || history.length === 0) return <Text fontSize="sm" color="gray.400">No price data yet</Text>

  const getLabel = (sourceId) => {
    if (!sources) return sourceId
    const source = sources.find(s => s.id === parseInt(sourceId))
    return source ? source.label : sourceId
  }

  // Group valid history by source
  const bySource = {}
  history.forEach(h => {
    if (h.price === null) return
    if (!bySource[h.source_id]) bySource[h.source_id] = []
    bySource[h.source_id].push({
      time: new Date(h.scraped_at).getTime(),
      price: parseFloat(h.price)
    })
  })

  const sourceIds = Object.keys(bySource)
  if (sourceIds.length === 0) return <Text fontSize="sm" color="gray.400">No price data yet</Text>

  // Build unified dataset with numeric timestamps as the x axis key
  const timeMap = {}
  sourceIds.forEach(sourceId => {
    bySource[sourceId].forEach(point => {
      if (!timeMap[point.time]) timeMap[point.time] = { time: point.time }
      timeMap[point.time][`source_${sourceId}`] = point.price
    })
  })

  const data = Object.values(timeMap).sort((a, b) => a.time - b.time)

  const allPrices = Object.values(bySource).flatMap(pts => pts.map(p => p.price))
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const padding = (maxPrice - minPrice) * 0.1 || 1

  const allTimes = data.map(d => d.time)
  const minTime = Math.min(...allTimes)
  const maxTime = Math.max(...allTimes)

  return (
    <Box h="300px">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={[minTime, maxTime]}
            tickFormatter={formatTick}
            tick={{ fontSize: 11 }}
            tickLine={false}
            tickCount={6}
          />
          <YAxis
            domain={[minPrice - padding, maxPrice + padding]}
            tick={{ fontSize: 11 }}
            tickFormatter={v => `£${v.toFixed(2)}`}
            tickLine={false}
            width={70}
          />
          <Tooltip
            labelFormatter={formatTooltipLabel}
            formatter={(value, name) => [`£${Number(value).toFixed(2)}`, getLabel(name.replace('source_', ''))]}
          />
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
