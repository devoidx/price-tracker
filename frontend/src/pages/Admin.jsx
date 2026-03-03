import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Heading, Button, Badge, Table, Thead, Tbody, Tr, Th, Td, HStack, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, FormControl, FormLabel, Input, Switch, VStack, Alert, AlertIcon } from '@chakra-ui/react'
import { getAdminUsers, getAdminProducts, deactivateUser, adminUpdateUser } from '../api'
import { UserX, Pencil } from 'lucide-react'

export default function Admin() {
  const queryClient = useQueryClient()
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const { data: users = [] } = useQuery({ queryKey: ['adminUsers'], queryFn: () => getAdminUsers().then(r => r.data) })
  const { data: products = [] } = useQuery({ queryKey: ['adminProducts'], queryFn: () => getAdminProducts().then(r => r.data) })

  const handleDeactivate = async (userId, username) => {
    if (!confirm(`Deactivate user ${username}?`)) return
    await deactivateUser(userId)
    queryClient.invalidateQueries(['adminUsers'])
  }

  const openEdit = (user) => {
    setEditingUser(user)
    setEditForm({ username: user.username, email: user.email, is_admin: user.is_admin, active: user.active })
    setEditError('')
  }

  const handleEditSave = async () => {
    setEditLoading(true)
    setEditError('')
    try {
      await adminUpdateUser(editingUser.id, editForm)
      queryClient.invalidateQueries(['adminUsers'])
      setEditingUser(null)
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update user')
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <Box maxW="1100px" mx="auto" px={6} py={8}>
      <Heading size="lg" mb={8}>Admin panel</Heading>

      <Box bg="white" borderRadius="xl" p={6} boxShadow="sm" mb={5}>
        <Heading size="sm" mb={4}>Users ({users.length})</Heading>
        <Table size="sm">
          <Thead>
            <Tr><Th>Username</Th><Th>Email</Th><Th>Admin</Th><Th>Status</Th><Th>Joined</Th><Th></Th></Tr>
          </Thead>
          <Tbody>
            {users.map(u => (
              <Tr key={u.id}>
                <Td fontWeight={500}>{u.username}</Td>
                <Td color="gray.500">{u.email}</Td>
                <Td>{u.is_admin ? '✅' : '—'}</Td>
                <Td>
                  <Badge colorScheme={u.active ? 'green' : 'gray'}>{u.active ? 'Active' : 'Inactive'}</Badge>
                </Td>
                <Td fontSize="xs" color="gray.400">{new Date(u.created_at).toLocaleDateString()}</Td>
                <Td>
                  <HStack spacing={2}>
                    <Button size="xs" colorScheme="brand" variant="outline" leftIcon={<Pencil size={11} />} onClick={() => openEdit(u)}>
                      Edit
                    </Button>
                    {u.active && !u.is_admin && (
                      <Button size="xs" colorScheme="red" leftIcon={<UserX size={11} />} onClick={() => handleDeactivate(u.id, u.username)}>
                        Deactivate
                      </Button>
                    )}
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Box bg="white" borderRadius="xl" p={6} boxShadow="sm">
        <Heading size="sm" mb={4}>All tracked products ({products.length})</Heading>
        <Table size="sm">
          <Thead>
            <Tr><Th>Name</Th><Th>URL</Th><Th>Interval</Th><Th>Status</Th></Tr>
          </Thead>
          <Tbody>
            {products.map(p => (
              <Tr key={p.id}>
                <Td fontWeight={500}>{p.name}</Td>
                <Td fontSize="xs" color="gray.400" maxW="300px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">{p.url}</Td>
                <Td><Badge colorScheme="purple" variant="subtle">{p.interval_minutes < 60 ? `${p.interval_minutes}m` : `${p.interval_minutes/60}h`}</Badge></Td>
                <Td><Badge colorScheme={p.active ? 'green' : 'gray'}>{p.active ? 'Active' : 'Paused'}</Badge></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Edit user modal */}
      {editingUser && (
        <Modal isOpen onClose={() => setEditingUser(null)}>
          <ModalOverlay />
          <ModalContent borderRadius="xl">
            <ModalHeader>Edit user — {editingUser.username}</ModalHeader>
            <ModalBody>
              <VStack spacing={4}>
                {editError && <Alert status="error" borderRadius="md"><AlertIcon />{editError}</Alert>}
                <FormControl>
                  <FormLabel fontSize="sm">Username</FormLabel>
                  <Input value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} focusBorderColor="brand.500" />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Email</FormLabel>
                  <Input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} focusBorderColor="brand.500" />
                </FormControl>
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel fontSize="sm" mb={0}>Admin access</FormLabel>
                  <Switch isChecked={editForm.is_admin} onChange={e => setEditForm({...editForm, is_admin: e.target.checked})} colorScheme="brand" />
                </FormControl>
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel fontSize="sm" mb={0}>Active</FormLabel>
                  <Switch isChecked={editForm.active} onChange={e => setEditForm({...editForm, active: e.target.checked})} colorScheme="brand" />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter gap={3}>
              <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button colorScheme="brand" isLoading={editLoading} onClick={handleEditSave}>Save changes</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  )
}
