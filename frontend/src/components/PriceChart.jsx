import { useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import { Box, Text, HStack, Button } from '@chakra-ui/react'

const SOURCE_COLOURS = ['#319795', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6']

const CURRENCY_SYMBOLS = {
  GBP: '£', USD: '$', EUR: '€', JPY: '¥',
  CAD: 'CA$', AUD: 'A$', CHF: 'Fr',
  SEK: 'kr', NOK: 'kr', DKK: 'kr'
}

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'All', days: null },
]

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

export default function PriceChart({ history, sources, userCurrency = 'GBP' }) {
  const [range, setRange] = useState(null) // null = all time

  if (!history || history.length === 0) return <Text fontSize="sm" color="gray.400">No price data yet</Text>

  const userSym = CURRENCY_SYMBOLS[userCurrency] || userCurrency

  const getLabel = (sourceId) => {
    if (!sources) return sourceId
    const source = sources.find(s => s.id === parseInt(sourceId))
    return source ? source.label : sourceId
  }

  // Filter by date range
  const cutoff = range ? new Date(Date.now() - range * 24 * 60 * 60 * 1000) : null
  const filteredHistory = cutoff
    ? history.filter(h => new Date(h.scraped_at) >= cutoff)
    : history

  // Group valid history by source using converted price if available
  const bySource = {}
  filteredHistory.forEach(h => {
    if (h.price === null) return
    if (!bySource[h.source_id]) bySource[h.source_id] = []
    const displayPrice = h.converted_price || h.price
    bySource[h.source_id].push({
      time: new Date(h.scraped_at).getTime(),
      price: parseFloat(displayPrice),
      originalPrice: parseFloat(h.price),
      currency: h.currency,
      convertedPrice: h.converted_price ? parseFloat(h.converted_price) : null,
    })
  })

  const sourceIds = Object.keys(bySource)
  if (sourceIds.length === 0) return (
    <Box>
      <RangeSelector range={range} setRange={setRange} />
      <Text fontSize="sm" color="gray.400" mt={4}>No price data for this period</Text>
    </Box>
  )

  const timeMap = {}
  sourceIds.forEach(sourceId => {
    bySource[sourceId].forEach(point => {
      if (!timeMap[point.time]) timeMap[point.time] = { time: point.time }
      timeMap[point.time][`source_${sourceId}`] = point.price
      timeMap[point.time][`meta_${sourceId}`] = {
        originalPrice: point.originalPrice,
        currency: point.currency,
        convertedPrice: point.convertedPrice,
      }
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
    <Box>
      <HStack justify="flex-end" mb={3} spacing={1}>
        {RANGES.map(r => (
          <Button
            key={r.label}
            size="xs"
            variant={range === r.days ? 'solid' : 'outline'}
            colorScheme="brand"
            onClick={() => setRange(r.days)}
          >
            {r.label}
          </Button>
        ))}
      </HStack>
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
              tickFormatter={v => `${userSym}${v.toFixed(2)}`}
              tickLine={false}
              width={70}
            />
            <Tooltip
              labelFormatter={formatTooltipLabel}
              formatter={(value, name, props) => {
                const sourceId = name.replace('source_', '')
                const label = getLabel(sourceId)
                const meta = props.payload[`meta_${sourceId}`]
                if (meta && meta.convertedPrice && meta.currency !== userCurrency) {
                  const origSym = CURRENCY_SYMBOLS[meta.currency] || meta.currency
                  return [`${userSym}${Number(value).toFixed(2)} (${origSym}${Number(meta.originalPrice).toFixed(2)})`, label]
                }
                return [`${userSym}${Number(value).toFixed(2)}`, label]
              }}
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
    </Box>
  )
}