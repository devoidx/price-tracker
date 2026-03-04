import { useNavigate } from 'react-router-dom'
import { Box, Badge, Text, Heading } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { getPriceHistory } from '../api'

export default function ProductCard({ product, nextRun }) {
  const navigate = useNavigate()

  const { data: history = [] } = useQuery({
    queryKey: ['history', product.id],
    queryFn: () => getPriceHistory(product.id).then(r => r.data),
    refetchInterval: 60000
  })

  const latestPrice = history.filter(h => h.price !== null).slice(-1)[0] || null

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
      <Text fontSize="xs" color="gray.400" noOfLines={1} mb={4}>{product.url}</Text>
      {latestPrice ? (
        <>
          <Text fontSize="2xl" fontWeight={700} color="brand.500">
            £{Number(latestPrice.price).toFixed(2)}
          </Text>
          <Text fontSize="xs" color="gray.400" mt={1}>
            Last checked {new Date(latestPrice.scraped_at).toLocaleString()}
          </Text>
        </>
      ) : (
        <Text fontSize="sm" color="gray.400">No price data yet</Text>
      )}
      <Badge mt={3} colorScheme="purple" variant="subtle" fontSize="xs">
        Every {product.interval_minutes < 60 ? `${product.interval_minutes}m` : `${product.interval_minutes / 60}h`}
      </Badge>
      <Box borderTop="1px" borderColor="gray.100" mt={3} pt={3}>
        <Text fontSize="xs" color="gray.400">
          {nextRun
            ? `Next check: ${new Date(nextRun).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
            : product.active ? 'Scheduling...' : 'Paused'}
        </Text>
      </Box>
    </Box>
  )
}
