import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Button, Heading, HStack, Text, Badge, VStack, Input, Select, FormControl, FormLabel, FormHelperText, Switch, Alert, AlertIcon, Table, Thead, Tbody, Tr, Th, Td, IconButton, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@chakra-ui/react'
import { getSources, addSource, updateSource, deleteSource, triggerSourceScrape, getNextRunTimes } from '../api'
import { Plus, Trash2, Pencil, RefreshCw } from 'lucide-react'

const INTERVALS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '6 hours', value: 360 },
  { label: '12 hours', value: 720 },
  { label: '24 hours', value: 1440 },
]

// Defined OUTSIDE SourcesPanel so it is never recreated on parent re-render
function SourceForm({ form, setForm, onSubmit, error, showActive }) {
  return (
    <form id="source-form" onSubmit={onSubmit}>
      <VStack spacing={4}>
        {error && <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>}
        <FormControl>
          <FormLabel fontSize="sm">Label</FormLabel>
          <Input
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder="e.g. Amazon — auto-generated from URL if blank"
            focusBorderColor="brand.500"
          />
          <FormHelperText fontSize="xs">Leave blank to auto-generate from the URL</FormHelperText>
        </FormControl>
        <FormControl isRequired>
          <FormLabel fontSize="sm">URL</FormLabel>
          <Input
            value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            placeholder="https://www.amazon.co.uk/..."
            focusBorderColor="brand.500"
          />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">CSS Selector <Text as="span" color="gray.400" fontWeight="normal">(optional)</Text></FormLabel>
          <Input
            value={form.selector}
            onChange={e => setForm(f => ({ ...f, selector: e.target.value }))}
            placeholder=".a-price .a-offscreen"
            focusBorderColor="brand.500"
            fontFamily="mono"
          />
          <FormHelperText fontSize="xs">Leave blank to auto-detect the price</FormHelperText>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Check interval</FormLabel>
          <Select
            value={form.interval_minutes}
            onChange={e => setForm(f => ({ ...f, interval_minutes: e.target.value }))}
            focusBorderColor="brand.500"
          >
            {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </Select>
        </FormControl>
        {showActive && (
          <FormControl display="flex" alignItems="center" justifyContent="space-between">
            <FormLabel fontSize="sm" mb={0}>Active</FormLabel>
            <Switch
              isChecked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              colorScheme="brand"
            />
          </FormControl>
        )}
      </VStack>
    </form>
  )
}

const defaultForm = { label: '', url: '', selector: '', interval_minutes: 60, active: true }

export default function SourcesPanel({ product }) {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editingSource, setEditingSource] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scrapingId, setScrapingId] = useState(null)

  const { data: sources = [] } = useQuery({
    queryKey: ['sources', product.id],
    queryFn: () => getSources(product.id).then(r => r.data)
  })

  const { data: nextRunTimes = {} } = useQuery({
    queryKey: ['nextRunTimes'],
    queryFn: () => getNextRunTimes().then(r => r.data),
    refetchInterval: 60000
  })

  const openAdd = () => {
    setForm(defaultForm)
    setError('')
    setShowAdd(true)
  }

  const openEdit = (source) => {
    setEditingSource(source)
    setForm({
      label: source.label,
      url: source.url,
      selector: source.selector || '',
      interval_minutes: source.interval_minutes,
      active: source.active
    })
    setError('')
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await addSource(product.id, {
        label: form.label || null,
        url: form.url,
        selector: form.selector || null,
        interval_minutes: parseInt(form.interval_minutes)
      })
      queryClient.invalidateQueries(['sources', product.id])
      queryClient.invalidateQueries(['nextRunTimes'])
      setShowAdd(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add source')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await updateSource(product.id, editingSource.id, {
        label: form.label || null,
        url: form.url,
        selector: form.selector || null,
        interval_minutes: parseInt(form.interval_minutes),
        active: form.active
      })
      queryClient.invalidateQueries(['sources', product.id])
      queryClient.invalidateQueries(['nextRunTimes'])
      setEditingSource(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update source')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (sourceId) => {
    if (!confirm('Delete this source and all its price history?')) return
    await deleteSource(product.id, sourceId)
    queryClient.invalidateQueries(['sources', product.id])
    queryClient.invalidateQueries(['nextRunTimes'])
  }

  const handleScrape = async (sourceId) => {
    setScrapingId(sourceId)
    try {
      await triggerSourceScrape(sourceId)
      setTimeout(() => {
        queryClient.invalidateQueries(['history', String(product.id)])
        setScrapingId(null)
      }, 8000)
    } catch {
      setScrapingId(null)
    }
  }
  return (
    <Box bg="white" borderRadius="xl" p={6} boxShadow="sm">
      <HStack justify="space-between" mb={4}>
        <Heading size="sm">Sources ({sources.length}/5)</Heading>
        {sources.length < 5 && (
          <Button size="sm" colorScheme="brand" leftIcon={<Plus size={13} />} onClick={openAdd}>
            Add source
          </Button>
        )}
      </HStack>

      {sources.length === 0 ? (
        <Text fontSize="sm" color="gray.400">No sources added yet — add a URL to start tracking prices</Text>
      ) : (
        <Table size="sm">
          <Thead>
            <Tr><Th>Label</Th><Th>URL</Th><Th>Interval</Th><Th>Status</Th><Th>Next check</Th><Th></Th></Tr>
          </Thead>
          <Tbody>
            {sources.map(s => (
              <Tr key={s.id}>
                <Td fontWeight={500}>{s.label}</Td>
                <Td fontSize="xs" color="gray.400" maxW="200px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  <Text as="a" href={s.url} target="_blank" rel="noreferrer">{s.url}</Text>
                </Td>
                <Td>
                  <Badge colorScheme="purple" variant="subtle" fontSize="xs">
                    {s.interval_minutes < 60 ? `${s.interval_minutes}m` : `${s.interval_minutes / 60}h`}
                  </Badge>
                </Td>
                <Td>
                  <Badge colorScheme={s.active ? 'green' : 'gray'} fontSize="xs">
                    {s.active ? 'Active' : 'Paused'}
                  </Badge>
                </Td>
                <Td fontSize="xs" color="gray.400">
                  {nextRunTimes[s.id]
                    ? new Date(nextRunTimes[s.id]).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : s.active ? '—' : 'Paused'}
                </Td>
                <Td>
                  <HStack spacing={1}>
                    <IconButton size="xs" variant="ghost" colorScheme="brand" icon={<RefreshCw size={12} />} isLoading={scrapingId === s.id} onClick={() => handleScrape(s.id)} aria-label="Scrape now" />
                    <IconButton size="xs" variant="ghost" colorScheme="brand" icon={<Pencil size={12} />} onClick={() => openEdit(s)} aria-label="Edit" />
                    <IconButton size="xs" variant="ghost" colorScheme="red" icon={<Trash2 size={12} />} onClick={() => handleDelete(s.id)} aria-label="Delete" />
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Add source modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="lg">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>Add source</ModalHeader>
          <ModalBody>
            <SourceForm form={form} setForm={setForm} onSubmit={handleAdd} error={error} showActive={false} />
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" form="source-form" colorScheme="brand" isLoading={loading}>Add source</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit source modal */}
      {editingSource && (
        <Modal isOpen onClose={() => setEditingSource(null)} size="lg">
          <ModalOverlay />
          <ModalContent borderRadius="xl">
            <ModalHeader>Edit source — {editingSource.label}</ModalHeader>
            <ModalBody>
              <SourceForm form={form} setForm={setForm} onSubmit={handleEdit} error={error} showActive={true} />
            </ModalBody>
            <ModalFooter gap={3}>
              <Button variant="ghost" onClick={() => setEditingSource(null)}>Cancel</Button>
              <Button type="submit" form="source-form" colorScheme="brand" isLoading={loading}>Save changes</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  )
}
