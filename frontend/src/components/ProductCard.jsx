import { useNavigate } from 'react-router-dom'
import { Box, Badge, Text, Heading, HStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { getPriceHistory } from '../api'

export default function ProductCard({ product, nextRun }) {
  const navigate = useNavigate()

  const { data: history = [] } = useQuery({
    queryKey: ['history', product.id],
    queryFn: () => getPriceHistory(product.id).then(r => r.data),
    refetchInterval: 60000
  })

  const validHistory = history.filter(h => h.price !== null)
  const latestBySource = {}
  validHistory.forEach(h => {
    if (!latestBySource[h.source_id] || new Date(h.scraped_at) > new Date(latestBySource[h.source_id].scraped_at)) {
      latestBySource[h.source_id] = h
    }
  })
  const latestPrices = Object.values(latestBySource)
  const lowestCurrent = latestPrices.length > 0 ? latestPrices.reduce((a, b) => parseFloat(a.price) < parseFloat(b.price) ? a : b) : null
  const sourceCount = product.sources?.length || 0

  return (
    <Box
      bg="#b2f5ea" borderRadius="xl" p={6} boxShadow="sm" cursor="pointer"
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
      {lowestCurrent ? (
        <>
          <Text fontSize="2xl" fontWeight={700} color="brand.500">
            £{Number(lowestCurrent.price).toFixed(2)}
          </Text>
          <Text fontSize="xs" color="gray.400" mt={1}>
            {latestPrices.length > 1 ? 'Lowest current price' : 'Current price'}
          </Text>
        </>
      ) : (
        <Text fontSize="sm" color="gray.400">No price data yet</Text>
      )}
      <Box borderTop="1px" borderColor="gray.200" mt={4} pt={3}>
        <Text fontSize="xs" color="gray.400">
          {nextRun
            ? `Next check: ${new Date(nextRun).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
            : sourceCount === 0 ? 'No sources added' : 'Scheduling...'}
        </Text>
      </Box>
    </Box>
  )
}
