import { useState } from 'react'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, FormControl, FormLabel, FormHelperText, Input, Select, VStack, Alert, AlertIcon } from '@chakra-ui/react'
import { updateProduct } from '../api'

export default function EditProductModal({ product, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: product.name,
    url: product.url,
    selector: product.selector || '',
    interval_minutes: product.interval_minutes,
    active: product.active,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await updateProduct(product.id, {
        ...form,
        selector: form.selector || null,
        interval_minutes: parseInt(form.interval_minutes),
      })
      onUpdated()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent borderRadius="xl">
        <ModalHeader>Edit product</ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <VStack spacing={4}>
              {error && <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>}
              <FormControl isRequired>
                <FormLabel fontSize="sm">Name</FormLabel>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} focusBorderColor="brand.500" autoFocus />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">URL</FormLabel>
                <Input value={form.url} onChange={e => setForm({...form, url: e.target.value})} focusBorderColor="brand.500" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">CSS Selector</FormLabel>
                <Input placeholder=".a-price .a-offscreen" value={form.selector} onChange={e => setForm({...form, selector: e.target.value})} focusBorderColor="brand.500" />
                <FormHelperText>Optional — leave blank to auto-detect</FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Check every</FormLabel>
                <Select value={form.interval_minutes} onChange={e => setForm({...form, interval_minutes: e.target.value})} focusBorderColor="brand.500">
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={360}>6 hours</option>
                  <option value={720}>12 hours</option>
                  <option value={1440}>24 hours</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Status</FormLabel>
                <Select value={form.active} onChange={e => setForm({...form, active: e.target.value === 'true'})} focusBorderColor="brand.500">
                  <option value="true">Active</option>
                  <option value="false">Paused</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" colorScheme="brand" isLoading={loading} loadingText="Saving...">
              Save changes
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
