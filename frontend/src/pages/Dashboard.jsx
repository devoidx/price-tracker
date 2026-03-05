import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Button, Grid, Heading, Text, Spinner, HStack, Select, Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import { getProducts, getNextRunTimes, getPriceHistory } from '../api'
import ProductCard from '../components/ProductCard'
import AddProductModal from '../components/AddProductModal'
import { Plus, Search } from 'lucide-react'

function useAllHistories(products) {
  const results = useQuery({
    queryKey: ['allHistories', products.map(p => p.id).join(',')],
    queryFn: async () => {
      const entries = await Promise.all(
        products.map(p => getPriceHistory(p.id).then(r => ({ id: p.id, history: r.data })))
      )
      return Object.fromEntries(entries.map(e => [e.id, e.history]))
    },
    enabled: products.length > 0,
    refetchInterval: 60000
  })
  return results.data || {}
}

function getLatestPrice(history) {
  const valid = history.filter(h => h.price !== null)
  if (!valid.length) return null
  const bySource = {}
  valid.forEach(h => {
    if (!bySource[h.source_id] || new Date(h.scraped_at) > new Date(bySource[h.source_id].scraped_at)) {
      bySource[h.source_id] = h
    }
  })
  const prices = Object.values(bySource).map(h => parseFloat(h.price))
  return Math.min(...prices)
}

function getLastScraped(history) {
  if (!history.length) return null
  return new Date(Math.max(...history.map(h => new Date(h.scraped_at))))
}

function getBiggestDrop(history) {
  const valid = history.filter(h => h.price !== null).map(h => parseFloat(h.price))
  if (valid.length < 2) return 0
  const max = Math.max(...valid)
  const latest = valid[valid.length - 1]
  return max - latest
}

export default function Dashboard() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [sortBy, setSortBy] = useState('name')
  const [search, setSearch] = useState('')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts().then(r => r.data),
    refetchInterval: 30000
  })

  const { data: nextRunTimes = {} } = useQuery({
    queryKey: ['nextRunTimes'],
    queryFn: () => getNextRunTimes().then(r => r.data),
    refetchInterval: 60000
  })

  const allHistories = useAllHistories(products)

  const sorted = useMemo(() => {
    let list = [...products]

    if (search.trim()) {
      list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'price_asc': {
          const pa = getLatestPrice(allHistories[a.id] || []) ?? Infinity
          const pb = getLatestPrice(allHistories[b.id] || []) ?? Infinity
          return pa - pb
        }
        case 'price_desc': {
          const pa = getLatestPrice(allHistories[a.id] || []) ?? -Infinity
          const pb = getLatestPrice(allHistories[b.id] || []) ?? -Infinity
          return pb - pa
        }
        case 'last_scraped': {
          const da = getLastScraped(allHistories[a.id] || []) ?? new Date(0)
          const db = getLastScraped(allHistories[b.id] || []) ?? new Date(0)
          return db - da
        }
        case 'biggest_drop': {
          const da = getBiggestDrop(allHistories[a.id] || [])
          const db = getBiggestDrop(allHistories[b.id] || [])
          return db - da
        }
        default:
          return 0
      }
    })

    return list
  }, [products, sortBy, search, allHistories])

  if (isLoading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minH="50vh">
      <Spinner color="brand.500" size="lg" />
    </Box>
  )

  return (
    <Box maxW="1100px" mx="auto" px={6} py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg">Dashboard</Heading>
        <Button colorScheme="brand" leftIcon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
          Track product
        </Button>
      </Box>

      {products.length > 0 && (
        <HStack mb={6} spacing={3}>
          <InputGroup maxW="280px">
            <InputLeftElement pointerEvents="none">
              <Search size={14} color="gray" />
            </InputLeftElement>
            <Input
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              focusBorderColor="brand.500"
              size="sm"
              bg="white"
            />
          </InputGroup>
          <Select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            size="sm"
            maxW="220px"
            bg="white"
            focusBorderColor="brand.500"
          >
            <option value="name">Sort: Name (A–Z)</option>
            <option value="price_asc">Sort: Price (low to high)</option>
            <option value="price_desc">Sort: Price (high to low)</option>
            <option value="last_scraped">Sort: Recently scraped</option>
            <option value="biggest_drop">Sort: Biggest price drop</option>
          </Select>
        </HStack>
      )}

      {products.length === 0 ? (
        <Box textAlign="center" py={20}>
          <Text fontSize="xl" fontWeight={600} mb={2}>No products tracked yet</Text>
          <Text color="gray.400" mb={6}>Add a product URL to start tracking its price</Text>
          <Button colorScheme="brand" leftIcon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
            Track your first product
          </Button>
        </Box>
      ) : sorted.length === 0 ? (
        <Box textAlign="center" py={20}>
          <Text color="gray.400">No products match your search</Text>
        </Box>
      ) : (
        <Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={5}>
          {sorted.map(p => (
            <ProductCard key={p.id} product={p} nextRun={nextRunTimes[p.id]} />
          ))}
        </Grid>
      )}

      {showAdd && (
        <AddProductModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            queryClient.invalidateQueries(['products'])
            queryClient.invalidateQueries(['nextRunTimes'])
            setShowAdd(false)
          }}
        />
      )}
    </Box>
  )
}
