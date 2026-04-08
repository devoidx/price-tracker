import { useNavigate } from 'react-router-dom'
import { Box, Text, Heading, HStack, IconButton } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { getPriceHistory } from '../api'
import { TrendingDown, TrendingUp, Tag } from 'lucide-react'

const CURRENCY_SYMBOLS = {
  GBP: '£', USD: '$', EUR: '€', JPY: '¥',
  CAD: 'CA$', AUD: 'A$', CHF: 'Fr',
  SEK: 'kr', NOK: 'kr', DKK: 'kr'
}

export default function ProductCard({ product, nextRun, onCategorise }) {
  const navigate = useNavigate()

  const { data: history = [] } = useQuery({
    queryKey: ['history', product.id],
    queryFn: () => getPriceHistory(product.id).then(r => r.data),
    refetchInterval: 60000
  })

  const validHistory = history.filter(h => h.price !== null)

  // Get latest price per source, then take the lowest
  const bySource = {}
  validHistory.forEach(h => {
    if (!bySource[h.source_id] || new Date(h.scraped_at) > new Date(bySource[h.source_id].scraped_at)) {
      bySource[h.source_id] = h
    }
  })
  const latestPrices = Object.values(bySource)
  const lowestCurrent = latestPrices.length > 0
    ? latestPrices.reduce((a, b) => {
      const aPrice = parseFloat(a.converted_price || a.price)
      const bPrice = parseFloat(b.converted_price || b.price)
      return aPrice < bPrice ? a : b
    })
    : null

  // Display price — use converted if available
  const displayPrice = lowestCurrent
    ? (lowestCurrent.converted_price || lowestCurrent.price)
    : null
  const displayCurrency = lowestCurrent?.user_currency || 'GBP'
  const currencySymbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency

  // Week-over-week price change
  let priceChange = null
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  if (lowestCurrent) {
    const curr = parseFloat(lowestCurrent.converted_price || lowestCurrent.price)
    const sortedHistory = [...validHistory].sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at))
    const weekOldHistory = sortedHistory.filter(h => new Date(h.scraped_at) <= oneWeekAgo)
    const referenceHistory = weekOldHistory.length > 0 ? weekOldHistory : sortedHistory.slice(0, Math.ceil(sortedHistory.length / 3))

    if (referenceHistory.length > 0) {
      const weekOldPrices = {}
      referenceHistory.forEach(h => {
        if (!weekOldPrices[h.source_id]) {
          weekOldPrices[h.source_id] = parseFloat(h.converted_price || h.price)
        }
      })
      const weekOldLowest = Math.min(...Object.values(weekOldPrices))
      const pct = ((curr - weekOldLowest) / weekOldLowest) * 100
      if (Math.abs(pct) >= 0.1) {
        priceChange = { pct, increased: curr > weekOldLowest }
      }
    }
  }

  const sourceCount = product.sources?.length || 0

  return (
    <Box
      bg="#b2f5ea" _dark={{ bg: "teal.800" }} borderRadius="xl" p={6} boxShadow="sm" cursor="pointer"
      transition="all 0.15s" _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
      onClick={() => navigate(`/products/${product.id}`)}
    >
      <Box display="flex" alignItems="center" gap={2} mb={1}>
        <Box w={2} h={2} borderRadius="full" bg={product.active ? 'green.400' : 'gray.300'} />
        <Heading size="sm" noOfLines={1}>{product.name}</Heading>
      </Box>
      <Text fontSize="xs" color="gray.500" mb={4}>
        {sourceCount} source{sourceCount !== 1 ? 's' : ''}
      </Text>

      {product.categories?.length > 0 && (
        <HStack spacing={1} mb={3} flexWrap="wrap">
          {product.categories.map(cat => (
            <Badge key={cat.id} colorScheme={cat.color} fontSize="xs" variant="subtle">{cat.name}</Badge>
          ))}
        </HStack>
      )}

      {lowestCurrent ? (
        <>
          <HStack align="baseline" spacing={2}>
            <Text fontSize="2xl" fontWeight={700} color="brand.500">
              {currencySymbol}{Number(displayPrice).toFixed(2)}
            </Text>
            {priceChange && (
              <HStack spacing={1} color={priceChange.increased ? 'red.500' : 'green.500'}>
                {priceChange.increased ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                <Text fontSize="xs" fontWeight={600}>
                  {priceChange.increased ? '+' : ''}{priceChange.pct.toFixed(1)}%
                </Text>
              </HStack>
            )}
          </HStack>
          <Text fontSize="xs" color="gray.400" mt={1}>
            {latestPrices.length > 1 ? 'Lowest current price' : 'Current price'}
            {priceChange && (
              <Text as="span" color="gray.400"> · vs earlier</Text>
            )}
          </Text>
        </>
      ) : (
        <Text fontSize="sm" color="gray.400">No price data yet</Text>
      )}

      {product.categories?.length > 0 && (
        <HStack spacing={1} mb={3} flexWrap="wrap">
          {product.categories.map(cat => (
            <Badge key={cat.id} colorScheme={cat.color} fontSize="xs" variant="subtle">{cat.name}</Badge>
          ))}
        </HStack>
      )}

      <Box borderTop="1px" borderColor="gray.200" mt={4} pt={3}>
        <HStack justify="space-between">
          <Text fontSize="xs" color="gray.400">
            {nextRun
              ? `Next check: ${new Date(nextRun).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
              : sourceCount === 0 ? 'No sources added' : 'Scheduling...'}
          </Text>
          {onCategorise && (
            <IconButton
              size="xs"
              variant="ghost"
              colorScheme="gray"
              icon={<Tag size={11} />}
              onClick={e => { e.stopPropagation(); onCategorise() }}
              aria-label="Manage categories"
            />
          )}
        </HStack>
      </Box>
    </Box>
  )
}