import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Heading, Button, Badge, Table, Thead, Tbody, Tr, Th, Td, HStack, Text } from '@chakra-ui/react'
import { getAdminUsers, getAdminProducts, deactivateUser } from '../api'
import { UserX } from 'lucide-react'

export default function Admin() {
  const queryClient = useQueryClient()

  const { data: users = [] } = useQuery({ queryKey: ['adminUsers'], queryFn: () => getAdminUsers().then(r => r.data) })
  const { data: products = [] } = useQuery({ queryKey: ['adminProducts'], queryFn: () => getAdminProducts().then(r => r.data) })

  const handleDeactivate = async (userId, username) => {
    if (!confirm(`Deactivate user ${username}?`)) return
    await deactivateUser(userId)
    queryClient.invalidateQueries(['adminUsers'])
  }

  return (
    <Box maxW="1100px" mx="auto" px={6} py={8}>
      <Heading size="lg" mb={8}>Admin panel</Heading>

      <Box bg="white" borderRadius="xl" p={6} boxShadow="sm" mb={5}>
        <Heading size="sm" mb={4}>Users ({users.length})</Heading>
        <Table size="sm">
          <Thead><Tr><Th>Username</Th><Th>Email</Th><Th>Admin</Th><Th>Status</Th><Th>Joined</Th><Th></Th></Tr></Thead>
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
                  {u.active && !u.is_admin && (
                    <Button size="xs" colorScheme="red" leftIcon={<UserX size={12} />} onClick={() => handleDeactivate(u.id, u.username)}>
                      Deactivate
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Box bg="white" borderRadius="xl" p={6} boxShadow="sm">
        <Heading size="sm" mb={4}>All tracked products ({products.length})</Heading>
        <Table size="sm">
          <Thead><Tr><Th>Name</Th><Th>URL</Th><Th>Interval</Th><Th>Status</Th></Tr></Thead>
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
    </Box>
  )
}
