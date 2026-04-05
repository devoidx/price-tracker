import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Heading, Button, Text, HStack, VStack, Badge, IconButton, Icon } from '@chakra-ui/react'
import { Bell, Trash2, Plus, MailOpen } from 'lucide-react'
import { getMessages, markMessageRead, markAllRead, deleteMessage } from '../api'
import ComposeModal from '../components/ComposeModal'

function formatDate(ts) {
  return new Date(ts).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function Messages() {
  const queryClient = useQueryClient()
  const [composing, setComposing] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => getMessages().then(r => r.data),
    refetchInterval: 30000,
  })

  const handleExpand = async (msg) => {
    if (expanded === msg.id) {
      setExpanded(null)
      return
    }
    setExpanded(msg.id)
    if (!msg.is_read) {
      await markMessageRead(msg.id)
      queryClient.invalidateQueries(['messages'])
      queryClient.invalidateQueries(['unreadCount'])
    }
  }

  const handleDelete = async (id) => {
    await deleteMessage(id)
    if (expanded === id) setExpanded(null)
    queryClient.invalidateQueries(['messages'])
    queryClient.invalidateQueries(['unreadCount'])
  }

  const handleMarkAllRead = async () => {
    await markAllRead()
    queryClient.invalidateQueries(['messages'])
    queryClient.invalidateQueries(['unreadCount'])
  }

  const unreadCount = messages.filter(m => !m.is_read).length

  return (
    <Box maxW="800px" mx="auto" px={6} py={8}>
      <HStack justify="space-between" mb={8}>
        <HStack spacing={3}>
          <Heading size="lg">Messages</Heading>
          {unreadCount > 0 && (
            <Badge colorScheme="brand" borderRadius="full" fontSize="sm" px={2}>{unreadCount} unread</Badge>
          )}
        </HStack>
        <HStack spacing={2}>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" colorScheme="brand" leftIcon={<MailOpen size={13} />} onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
          <Button size="sm" colorScheme="brand" leftIcon={<Plus size={13} />} onClick={() => setComposing(true)}>
            Compose
          </Button>
        </HStack>
      </HStack>

      {messages.length === 0 ? (
        <Box bg="white" _dark={{ bg: "gray.800" }} borderRadius="xl" p={8} boxShadow="sm" textAlign="center">
          <Text color="gray.400">No messages yet</Text>
        </Box>
      ) : (
        <VStack spacing={2} align="stretch">
          {messages.map(msg => (
            <Box key={msg.id}>
              <Box
                bg="white"
                _dark={{ bg: "gray.800" }}
                borderRadius="xl"
                boxShadow="sm"
                borderLeft={msg.is_read ? undefined : "3px solid"}
                borderLeftColor={msg.is_read ? undefined : "brand.500"}
                overflow="hidden"
              >
                <HStack
                  px={5}
                  py={4}
                  cursor="pointer"
                  _hover={{ bg: "gray.50" }}
                  _dark={{ _hover: { bg: "gray.700" } }}
                  onClick={() => handleExpand(msg)}
                  justify="space-between"
                >
                  <HStack spacing={3} flex={1} minW={0}>
                    {msg.message_type === 'system' ? (
                      <Icon as={Bell} color="brand.500" flexShrink={0} />
                    ) : (
                      <Box
                        w="8px" h="8px" borderRadius="full"
                        bg={msg.is_read ? "gray.300" : "brand.500"}
                        flexShrink={0}
                      />
                    )}
                    <Box minW={0}>
                      <HStack spacing={2} mb={0.5}>
                        <Text fontSize="sm" fontWeight={msg.is_read ? 400 : 600} noOfLines={1}>
                          {msg.message_type === 'system' ? 'System' : msg.sender_username}
                        </Text>
                        {msg.message_type === 'system' && (
                          <Badge colorScheme="purple" fontSize="xs" variant="subtle">system</Badge>
                        )}
                      </HStack>
                      {msg.subject && (
                        <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }} noOfLines={1}>
                          {msg.subject}
                        </Text>
                      )}
                    </Box>
                  </HStack>
                  <HStack spacing={3} flexShrink={0}>
                    <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">{formatDate(msg.created_at)}</Text>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      icon={<Trash2 size={13} />}
                      aria-label="Delete"
                      onClick={e => { e.stopPropagation(); handleDelete(msg.id) }}
                    />
                  </HStack>
                </HStack>

                {expanded === msg.id && (
                  <Box px={5} pb={4} pt={1} borderTop="1px solid" borderTopColor="gray.100" _dark={{ borderTopColor: "gray.700" }}>
                    <Text fontSize="sm" whiteSpace="pre-wrap">{msg.body}</Text>
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </VStack>
      )}

      {composing && <ComposeModal isOpen onClose={() => setComposing(false)} />}
    </Box>
  )
}
