import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, FormControl, FormLabel, Input, Textarea, Select, VStack, Alert, AlertIcon } from '@chakra-ui/react'
import { sendMessage, getMessageUsers } from '../api'

export default function ComposeModal({ isOpen, onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ recipient_id: '', subject: '', body: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { data: users = [] } = useQuery({
    queryKey: ['messageUsers'],
    queryFn: () => getMessageUsers().then(r => r.data),
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.recipient_id) { setError('Please select a recipient'); return }
    if (!form.body.trim()) { setError('Message body is required'); return }
    setLoading(true)
    try {
      await sendMessage({
        recipient_id: parseInt(form.recipient_id),
        subject: form.subject.trim() || undefined,
        body: form.body.trim(),
      })
      setSuccess(true)
      queryClient.invalidateQueries(['messages'])
      setTimeout(onClose, 800)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent borderRadius="xl">
        <ModalHeader>New message</ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <VStack spacing={4}>
              {error && <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>}
              {success && <Alert status="success" borderRadius="md"><AlertIcon />Message sent</Alert>}
              <FormControl isRequired>
                <FormLabel fontSize="sm">To</FormLabel>
                <Select
                  placeholder="Select recipient"
                  value={form.recipient_id}
                  onChange={e => setForm({ ...form, recipient_id: e.target.value })}
                  focusBorderColor="brand.500"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Subject</FormLabel>
                <Input
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  placeholder="Optional"
                  focusBorderColor="brand.500"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Message</FormLabel>
                <Textarea
                  value={form.body}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                  rows={5}
                  focusBorderColor="brand.500"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" colorScheme="brand" isLoading={loading}>Send</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
