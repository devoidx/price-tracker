import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, VStack, HStack, Input, Select, Text, Badge, IconButton, Alert, AlertIcon, FormControl, FormLabel } from '@chakra-ui/react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api'
import { Pencil, Trash2, Plus } from 'lucide-react'

const COLORS = [
  { label: 'Teal', value: 'teal' },
  { label: 'Blue', value: 'blue' },
  { label: 'Purple', value: 'purple' },
  { label: 'Green', value: 'green' },
  { label: 'Orange', value: 'orange' },
  { label: 'Red', value: 'red' },
  { label: 'Pink', value: 'pink' },
  { label: 'Gray', value: 'gray' },
]

export default function CategoryModal({ isOpen, onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: '', color: 'teal' })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories().then(r => r.data)
  })

  const handleSave = async () => {
    if (!form.name.trim()) return
    setLoading(true)
    setError('')
    try {
      if (editingId) {
        await updateCategory(editingId, form)
      } else {
        await createCategory(form)
      }
      queryClient.invalidateQueries(['categories'])
      queryClient.invalidateQueries(['products'])
      setForm({ name: '', color: 'teal' })
      setEditingId(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save category')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (cat) => {
    setEditingId(cat.id)
    setForm({ name: cat.name, color: cat.color })
    setError('')
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? Products will not be deleted.')) return
    await deleteCategory(id)
    queryClient.invalidateQueries(['categories'])
    queryClient.invalidateQueries(['products'])
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm({ name: '', color: 'teal' })
    setError('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent borderRadius="xl">
        <ModalHeader>Manage categories</ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {error && <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>}

            {/* Existing categories */}
            {categories.length > 0 && (
              <VStack spacing={2} align="stretch">
                {categories.map(cat => (
                  <HStack key={cat.id} justify="space-between" p={2} bg="gray.50" _dark={{ bg: 'gray.700' }} borderRadius="md">
                    <Badge colorScheme={cat.color} fontSize="sm" px={3} py={1}>{cat.name}</Badge>
                    <HStack spacing={1}>
                      <IconButton size="xs" variant="ghost" colorScheme="brand" icon={<Pencil size={11} />} onClick={() => handleEdit(cat)} aria-label="Edit" />
                      <IconButton size="xs" variant="ghost" colorScheme="red" icon={<Trash2 size={11} />} onClick={() => handleDelete(cat.id)} aria-label="Delete" />
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            )}

            {/* Add/edit form */}
            <VStack spacing={3} align="stretch" pt={2} borderTop="1px" borderColor="gray.100">
              <Text fontSize="sm" fontWeight={500}>{editingId ? 'Edit category' : 'Add category'}</Text>
              <HStack>
                <FormControl>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Category name"
                    focusBorderColor="brand.500"
                    size="sm"
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                  />
                </FormControl>
                <FormControl maxW="130px">
                  <Select
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    focusBorderColor="brand.500"
                    size="sm"
                  >
                    {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </Select>
                </FormControl>
              </HStack>
              <HStack>
                <Button size="sm" colorScheme="brand" leftIcon={<Plus size={13} />} isLoading={loading} onClick={handleSave}>
                  {editingId ? 'Save changes' : 'Add'}
                </Button>
                {editingId && <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>}
              </HStack>
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Done</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}