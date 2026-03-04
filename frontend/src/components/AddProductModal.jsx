import { useState } from 'react'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, FormControl, FormLabel, Input, VStack, Alert, AlertIcon } from '@chakra-ui/react'
import { createProduct } from '../api'

export default function AddProductModal({ onClose, onAdded }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createProduct({ name })
      onAdded()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose}>
      <ModalOverlay />
      <ModalContent borderRadius="xl">
        <ModalHeader>Add product</ModalHeader>
        <ModalBody>
          <form id="add-product-form" onSubmit={handleSubmit}>
            <VStack spacing={4}>
              {error && <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>}
              <FormControl isRequired>
                <FormLabel fontSize="sm">Product name</FormLabel>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. PS5 Controller"
                  focusBorderColor="brand.500"
                  autoFocus
                />
              </FormControl>
            </VStack>
          </form>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="add-product-form" colorScheme="brand" isLoading={loading}>
            Add product
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
