import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Button, Heading, Text, HStack, Stat, StatLabel, StatNumber, StatHelpText, Grid, Alert, AlertIcon, Icon, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, FormControl, FormLabel, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react'
import { getProducts, getPriceHistory, triggerScrape, deleteProduct, updateProduct } from '../api'
import PriceChart from '../components/PriceChart'
import AlertsPanel from '../components/AlertsPanel'
import SourcesPanel from '../components/SourcesPanel'
import { useAuth } from '../context/AuthContext'
import { Trash2, ArrowLeft, AlertCircle, Pencil, RefreshCw } from 'lucide-react'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [scraping, setScraping] = useState(false)
  const [scrapeMsg, setScrapeMsg] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState('')
  const [showScrapeConfirm, setShowScrapeConfirm] = useState(false)
  const { user } = useAuth()

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

  const handleEditSave = async () => {
    await updateProduct(id, { name: editName })
    queryClient.invalidateQueries(['products'])
    setShowEdit(false)
  }

  const validHistory = history.filter(h => h.price !== null)

  // Get latest price per source then take the lowest
  const bySource = {}
  validHistory.forEach(h => {
    if (!bySource[h.source_id] || new Date(h.scraped_at) > new Date(bySource[h.source_id].scraped_at)) {
      bySource[h.source_id] = h
    }
  })
  const latestPrices = Object.values(bySource)
  const latest = latestPrices.length > 0
    ? latestPrices.reduce((a, b) => parseFloat(a.price) < parseFloat(b.price) ? a : b) : null
  const errors = history.filter(h => h.error)
  const lowestEntry = validHistory.length > 1 ? validHistory.reduce((a, b) => parseFloat(a.price) < parseFloat(b.price) ? a : b) : null
  const highestEntry = validHistory.length > 1 ? validHistory.reduce((a, b) => parseFloat(a.price) > parseFloat(b.price) ? a : b) : null
  const sources = product?.sources || []

  if (!product) return <Text p={8} color="gray.400">Loading...</Text>

  return (
    <Box maxW="1100px" mx="auto" px={6} py={8}>
      <Button variant="ghost" leftIcon={<ArrowLeft size={15} />} mb={6} onClick={() => navigate('/')} size="sm">Back</Button>

      <Box bg="white" borderRadius="xl" p={6} boxShadow="sm" mb={5}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={4} mb={6}>
	  <Box>
             <Heading size="md" mb={1}>{product.name}</Heading>
             <Text fontSize="xs" color="gray.400">
               {sources.length} source{sources.length !== 1 ? 's' : ''}
               {user?.is_super_admin && <Text as="span" color="gray.300"> · product id: {product.id}</Text>}
             </Text>
           </Box>
          <HStack>
            <Button size="sm" variant="outline" colorScheme="brand" leftIcon={<Pencil size={13} />} onClick={() => { setEditName(product.name); setShowEdit(true) }}>
              Rename
            </Button>
            <Button size="sm" variant="outline" colorScheme="brand" leftIcon={<RefreshCw size={13} />} onClick={() => setShowScrapeConfirm(true)} isLoading={scraping}>
              Scrape all
            </Button>
            <Button size="sm" colorScheme="red" leftIcon={<Trash2 size={13} />} onClick={handleDelete}>
              Delete
            </Button>
          </HStack>
        </Box>

        {scrapeMsg && <Alert status="info" borderRadius="md" mb={4}><AlertIcon />{scrapeMsg}</Alert>}

        <Grid templateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={6}>
          <Stat>
            <StatLabel fontSize="xs" color="gray.400">CURRENT LOW</StatLabel>
            <StatNumber fontSize="2xl" color="brand.500">
              {latest ? `£${Number(latest.price).toFixed(2)}` : '—'}
            </StatNumber>
          </Stat>
          {lowestEntry && (
            <Stat>
              <StatLabel fontSize="xs" color="gray.400">ALL-TIME LOW</StatLabel>
              <StatNumber fontSize="2xl" color="green.500">£{parseFloat(lowestEntry.price).toFixed(2)}</StatNumber>
              <StatHelpText fontSize="xs">{new Date(lowestEntry.scraped_at).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}</StatHelpText>
            </Stat>
          )}
          {highestEntry && (
            <Stat>
              <StatLabel fontSize="xs" color="gray.400">ALL-TIME HIGH</StatLabel>
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
        <PriceChart history={history} sources={sources} />
      </Box>

      <Box mb={5}>
	<SourcesPanel product={product} isSuperAdmin={user?.is_super_admin} />
      </Box>

      {errors.length > 0 && (
        <Box bg="white" borderRadius="xl" p={6} boxShadow="sm" mb={5}>
          <HStack mb={4}>
            <Icon as={AlertCircle} color="red.400" />
            <Heading size="sm">Recent errors</Heading>
          </HStack>
          <Table size="sm">
            <Thead>
              <Tr><Th>Time</Th><Th>Source</Th><Th>Error</Th></Tr>
            </Thead>
            <Tbody>
              {errors.slice(-10).reverse().map(e => (
                <Tr key={e.id}>
                  <Td fontSize="xs" color="gray.400" whiteSpace="nowrap">{new Date(e.scraped_at).toLocaleString()}</Td>
                  <Td fontSize="xs" fontWeight={500}>{sources.find(s => s.id === e.source_id)?.label || `Source ${e.source_id}`}</Td>
                  <Td fontSize="sm" color="red.400">{e.error}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <Box mb={5}>
        <AlertsPanel productId={parseInt(id)} />
      </Box>

      {/* Scrape confirm modal */}
      <Modal isOpen={showScrapeConfirm} onClose={() => setShowScrapeConfirm(false)}>
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>Scrape all sources?</ModalHeader>
          <ModalBody>
            <Text fontSize="sm" color="gray.600">
              This will immediately scrape all {sources.length} source{sources.length !== 1 ? 's' : ''} for <strong>{product.name}</strong>.
            </Text>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={() => setShowScrapeConfirm(false)}>Cancel</Button>
            <Button colorScheme="brand" isLoading={scraping} onClick={() => { setShowScrapeConfirm(false); handleScrape() }}>
              Scrape now
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Rename modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)}>
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>Rename product</ModalHeader>
          <ModalBody>
            <FormControl>
              <FormLabel fontSize="sm">Product name</FormLabel>
              <Input value={editName} onChange={e => setEditName(e.target.value)} focusBorderColor="brand.500" autoFocus />
            </FormControl>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button colorScheme="brand" onClick={handleEditSave}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}
