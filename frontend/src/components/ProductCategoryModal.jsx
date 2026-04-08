import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, VStack, HStack, Badge, Text, Checkbox } from '@chakra-ui/react'
import { getCategories, setProductCategories } from '../api'
import { useState } from 'react'

export default function ProductCategoryModal({ product, isOpen, onClose }) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories().then(r => r.data)
  })

  const currentIds = new Set(product.categories?.map(c => c.id) || [])
  const [selected, setSelected] = useState(new Set(currentIds))

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await setProductCategories(product.id, { category_ids: [...selected] })
      queryClient.invalidateQueries(['products'])
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalOverlay />
      <ModalContent borderRadius="xl">
        <ModalHeader>Categories — {product.name}</ModalHeader>
        <ModalBody>
          {categories.length === 0 ? (
            <Text fontSize="sm" color="gray.400">No categories yet — create some from the dashboard.</Text>
          ) : (
            <VStack spacing={2} align="stretch">
              {categories.map(cat => (
                <HStack key={cat.id} justify="space-between" p={2} bg="gray.50" _dark={{ bg: 'gray.700' }} borderRadius="md" cursor="pointer" onClick={() => toggle(cat.id)}>
                  <Badge colorScheme={cat.color} fontSize="sm" px={3} py={1}>{cat.name}</Badge>
                  <Checkbox
                    isChecked={selected.has(cat.id)}
                    colorScheme="brand"
                    onChange={() => toggle(cat.id)}
                    onClick={e => e.stopPropagation()}
                  />
                </HStack>
              ))}
            </VStack>
          )}
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button colorScheme="brand" isLoading={loading} onClick={handleSave}>Save</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}