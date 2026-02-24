import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Button, Grid, Heading, Text, VStack, Icon } from '@chakra-ui/react'
import { getProducts, getPriceHistory } from '../api'
import { useAuth } from '../context/AuthContext'
import ProductCard from '../components/ProductCard'
import AddProductModal from '../components/AddProductModal'
import { Plus, Package } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts().then(r => r.data)
  })

  const { data: latestPrices = {} } = useQuery({
    queryKey: ['latestPrices', products.map(p => p.id)],
    queryFn: async () => {
      const results = {}
      await Promise.all(products.map(async p => {
        const res = await getPriceHistory(p.id)
        const history = res.data.filter(h => h.price !== null)
        if (history.length > 0) results[p.id] = history[history.length - 1]
      }))
      return results
    },
    enabled: products.length > 0
  })

  return (
    <Box maxW="1100px" mx="auto" px={6} py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={8}>
        <Box>
          <Heading size="lg" mb={1}>Dashboard</Heading>
          <Text color="gray.500" fontSize="sm">Welcome back, {user.username}</Text>
        </Box>
        <Button colorScheme="brand" leftIcon={<Plus size={16} />} onClick={() => setShowModal(true)}>
          Track product
        </Button>
      </Box>

      {isLoading ? (
        <Text color="gray.400">Loading...</Text>
      ) : products.length === 0 ? (
        <Box bg="white" borderRadius="xl" p={12} textAlign="center" boxShadow="sm">
          <VStack spacing={4}>
            <Icon as={Package} boxSize={12} color="gray.300" />
            <Heading size="md" color="gray.500">No products tracked yet</Heading>
            <Text color="gray.400" fontSize="sm">Add your first product to start tracking prices</Text>
            <Button colorScheme="brand" leftIcon={<Plus size={16} />} onClick={() => setShowModal(true)}>
              Track your first product
            </Button>
          </VStack>
        </Box>
      ) : (
        <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={5}>
          {products.map(p => (
            <ProductCard key={p.id} product={p} latestPrice={latestPrices[p.id]} />
          ))}
        </Grid>
      )}

      {showModal && (
        <AddProductModal
          onClose={() => setShowModal(false)}
          onAdded={() => { queryClient.invalidateQueries(['products']); setShowModal(false) }}
        />
      )}
    </Box>
  )
}
