import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProducts, getNextRunTimes, getPriceHistory } from '../api'
import ProductCard from '../components/ProductCard'
import AddProductModal from '../components/AddProductModal'
import { Box, Button, Grid, Heading, Text, Spinner, HStack, Input, InputGroup, InputLeftElement, Menu, MenuButton, MenuList, MenuItem, Alert, AlertIcon, InputLeftAddon } from '@chakra-ui/react'
import { Plus, Search, ChevronDown, Tag } from 'lucide-react'
import { getCategories } from '../api'
import CategoryModal from '../components/CategoryModal'
import ProductCategoryModal from '../components/ProductCategoryModal'

const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'price_asc', label: 'Price (low to high)' },
  { value: 'price_desc', label: 'Price (high to low)' },
  { value: 'last_scraped', label: 'Recently scraped' },
  { value: 'biggest_drop', label: 'Biggest price drop' },
]

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
  const [maxPrice, setMaxPrice] = useState('')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [categorisingProduct, setCategorisingProduct] = useState(null)

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

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories().then(r => r.data)
  })

  const allHistories = useAllHistories(products)

  const sorted = useMemo(() => {
    let list = [...products]

    if (search.trim()) {
      list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    }

    // Filter by selected categories
    if (selectedCategories.length > 0) {
      list = list.filter(p =>
        selectedCategories.every(catId =>
          p.categories?.some(c => c.id === catId)
        )
      )
    }

    // Filter by max price
    if (maxPrice !== '') {
      const max = parseFloat(maxPrice)
      if (!isNaN(max)) {
        list = list.filter(p => {
          const history = allHistories[p.id] || []
          const validHistory = history.filter(h => h.price !== null)
          const bySource = {}
          validHistory.forEach(h => {
            if (!bySource[h.source_id] || new Date(h.scraped_at) > new Date(bySource[h.source_id].scraped_at)) {
              bySource[h.source_id] = h
            }
          })
          const latestPrices = Object.values(bySource)
          if (latestPrices.length === 0) return false
          const lowest = latestPrices.reduce((a, b) => {
            const aPrice = parseFloat(a.converted_price || a.price)
            const bPrice = parseFloat(b.converted_price || b.price)
            return aPrice < bPrice ? a : b
          })
          const lowestPrice = parseFloat(lowest.converted_price || lowest.price)
          return lowestPrice <= max
        })
      }
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
  }, [products, sortBy, search, maxPrice, allHistories])

  if (isLoading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minH="50vh">
      <Spinner color="brand.500" size="lg" />
    </Box>
  )

  return (
    <Box maxW="1100px" mx="auto" px={6} py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg">Dashboard</Heading>
        <HStack>
          <Button size="sm" variant="outline" colorScheme="brand" leftIcon={<Tag size={14} />} onClick={() => setShowCategoryModal(true)}>
            Categories
          </Button>
          <Button colorScheme="brand" leftIcon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
            Track product
          </Button>
        </HStack>
      </Box>

      {products.length > 0 && (
        <HStack mb={6} spacing={3} flexWrap="wrap">
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
              bg="white" _dark={{ bg: "gray.800", color: "white" }}
            />
          </InputGroup>
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDown size={14} />}
              size="sm"
              variant="outline"
              fontWeight="normal"
            >
              Sort: {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
            </MenuButton>
            <MenuList fontSize="sm">
              {SORT_OPTIONS.map(o => (
                <MenuItem key={o.value} onClick={() => setSortBy(o.value)} fontWeight={sortBy === o.value ? 600 : 400} color={sortBy === o.value ? 'brand.500' : undefined}>
                  {o.label}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
          <InputGroup maxW="180px" size="sm">
            <InputLeftAddon fontSize="xs" px={2}>Max</InputLeftAddon>
            <Input
              type="number"
              placeholder="Price limit"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              focusBorderColor="brand.500"
              bg="white" _dark={{ bg: "gray.800", color: "white" }}
            />
          </InputGroup>
          {maxPrice !== '' && (
            <Button size="sm" variant="ghost" colorScheme="gray" onClick={() => setMaxPrice('')}>
              Clear
            </Button>
          )}
        </HStack>
      )}

      {categories.length > 0 && (
        <HStack spacing={2} flexWrap="wrap">
          {categories.map(cat => (
            <Badge
              key={cat.id}
              colorScheme={cat.color}
              variant={selectedCategories.includes(cat.id) ? 'solid' : 'outline'}
              cursor="pointer"
              px={3}
              py={1}
              fontSize="xs"
              borderRadius="full"
              onClick={() => setSelectedCategories(prev =>
                prev.includes(cat.id)
                  ? prev.filter(id => id !== cat.id)
                  : [...prev, cat.id]
              )}
            >
              {cat.name}
            </Badge>
          ))}
          {selectedCategories.length > 0 && (
            <Badge variant="ghost" cursor="pointer" onClick={() => setSelectedCategories([])} fontSize="xs" color="gray.400">
              Clear
            </Badge>
          )}
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
        <>
          <Alert status="info" borderRadius="lg" mb={5} fontSize="sm">
            <AlertIcon />
            Prices shown are the listed retail price only and do not include delivery costs or any import taxes that may apply when ordering from outside your country.
          </Alert>
          <Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={5}>
            {sorted.map(p => (
              <ProductCard key={p.id} product={p} nextRun={nextRunTimes[p.id]} onCategorise={() => setCategorisingProduct(p)} />
            ))}
          </Grid>
        </>
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
      <CategoryModal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} />
      {categorisingProduct && (
        <ProductCategoryModal
          product={categorisingProduct}
          isOpen={!!categorisingProduct}
          onClose={() => setCategorisingProduct(null)}
        />
      )}
    </Box>

  )
}
