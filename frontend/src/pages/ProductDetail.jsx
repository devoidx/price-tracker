import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Button, Heading, Text, HStack, Stat, StatLabel, StatNumber, StatHelpText, Grid, Badge, Alert, AlertIcon, Table, Thead, Tbody, Tr, Th, Td, Icon } from '@chakra-ui/react'
import { getProducts, getPriceHistory, triggerScrape, deleteProduct } from '../api'
import PriceChart from '../components/PriceChart'
import EditProductModal from '../components/EditProductModal'
import { RefreshCw, Trash2, ArrowLeft, AlertCircle, Pencil } from 'lucide-react'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [scraping, setScraping] = useState(false)
  const [scrapeMsg, setScrapeMsg] = useState('')
  const [showEdit, setShowEdit] = useState(false)

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => getProducts().then(r => r.data) })
  const product = products.find(p => p.id === parseInt(id))

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['history', id],
    queryFn: () => getPriceHistory(id).then(r => r.data),
    refetchInterval: 30000
  })

  const handleScrape = async () => {
    setScraping(true)
    setScrapeMsg('')
    try {
      await triggerScrape(id)
      setScrapeMsg('Scrape started — results will appear shortly')
      setTimeout(() => { refetchHistory(); setScrapeMsg('') }, 8000)
    } catch {
      setScrapeMsg('Failed to trigger scrape')
    } finally {
      setScraping(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this product and all its price history?')) return
    await deleteProduct(id)
    queryClient.invalidateQueries(['products'])
    navigate('/')
  }

  const validHistory = history.filter(h => h.price !== null)
  const latest = validHistory[validHistory.length - 1]
  const errors = history.filter(h => h.error)
  const lowestEntry = validHistory.length > 1 ? validHistory.reduce((a, b) => parseFloat(a.price) < parseFloat(b.price) ? a : b) : null
  const highestEntry = validHistory.length > 1 ? validHistory.reduce((a, b) => parseFloat(a.price) > parseFloat(b.price) ? a : b) : null

  if (!product) return <Text p={8} color="gray.400">Loading...</Text>

  return (
    <Box maxW="1100px" mx="auto" px={6} py={8}>
      <Button variant="ghost" leftIcon={<ArrowLeft size={15} />} mb={6} onClick={() => navigate('/')} size="sm">
        Back
      </Button>

      <Box bg="white" borderRadius="xl" p={6} boxShadow="sm" mb={5}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={4} mb={6}>
          <Box>
            <Heading size="md" mb={1}>{product.name}</Heading>
            <Text as="a" href={product.url} target="_blank" rel="noreferrer" fontSize="xs" color="gray.400" wordBreak="break-all">
              {product.url}
            </Text>
          </Box>
          <HStack>
            <Button size="sm" variant="outline" colorScheme="brand" leftIcon={<Pencil size={13} />} onClick={() => setShowEdit(true)}>
              Edit
            </Button>
            <Button size="sm" variant="outline" colorScheme="brand" leftIcon={<RefreshCw size={13} />} onClick={handleScrape} isLoading={scraping} loadingText="Scraping...">
              Scrape now
            </Button>
            <Button size="sm" colorScheme="red" leftIcon={<Trash2 size={13} />} onClick={handleDelete}>
              Delete
            </Button>
          </HStack>
        </Box>

        {scrapeMsg && <Alert status="info" borderRadius="md" mb={4}><AlertIcon />{scrapeMsg}</Alert>}

        <Grid templateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={6}>
          <Stat>
            <StatLabel fontSize="xs" color="gray.400">CURRENT PRICE</StatLabel>
            <StatNumber fontSize="2xl" color="brand.500">
              {latest ? `£${Number(latest.price).toFixed(2)}` : '—'}
            </StatNumber>
          </Stat>
          {lowestEntry && (
            <Stat>
              <StatLabel fontSize="xs" color="gray.400">LOWEST</StatLabel>
              <StatNumber fontSize="2xl" color="green.500">£{parseFloat(lowestEntry.price).toFixed(2)}</StatNumber>
              <StatHelpText fontSize="xs">{new Date(lowestEntry.scraped_at).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}</StatHelpText>
            </Stat>
          )}
          {highestEntry && (
            <Stat>
              <StatLabel fontSize="xs" color="gray.400">HIGHEST</StatLabel>
              <StatNumber fontSize="2xl" color="red.400">£{parseFloat(highestEntry.price).toFixed(2)}</StatNumber>
              <StatHelpText fontSize="xs">{new Date(highestEntry.scraped_at).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}</StatHelpText>
            </Stat>
          )}
          <Stat>
            <StatLabel fontSize="xs" color="gray.400">DATA POINTS</StatLabel>
            <StatNumber fontSize="2xl">{validHistory.length}</StatNumber>
          </Stat>
        </Grid>
      </Box>

      <Box bg="white" borderRadius="xl" p={6} boxShadow="sm" mb={5}>
        <Heading size="sm" mb={5}>Price history</Heading>
        <PriceChart history={history} />
      </Box>

      {errors.length > 0 && (
        <Box bg="white" borderRadius="xl" p={6} boxShadow="sm">
          <HStack mb={4}>
            <Icon as={AlertCircle} color="red.400" />
            <Heading size="sm">Recent errors</Heading>
          </HStack>
          <Table size="sm">
            <Thead><Tr><Th>Time</Th><Th>Error</Th></Tr></Thead>
            <Tbody>
              {errors.slice(-5).reverse().map(e => (
                <Tr key={e.id}>
                  <Td fontSize="xs" color="gray.400" whiteSpace="nowrap">{new Date(e.scraped_at).toLocaleString()}</Td>
                  <Td fontSize="sm" color="red.400">{e.error}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      {showEdit && (
        <EditProductModal
          product={product}
          onClose={() => setShowEdit(false)}
          onUpdated={() => { queryClient.invalidateQueries(['products']); setShowEdit(false) }}
        />
      )}
    </Box>
  )
}
