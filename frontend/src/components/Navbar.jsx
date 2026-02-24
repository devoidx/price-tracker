import { Link, useNavigate } from 'react-router-dom'
import { Box, Flex, Button, Text, HStack } from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'
import { LogOut, LayoutDashboard, Shield } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Box bg="white" borderBottom="1px" borderColor="gray.200" px={6} position="sticky" top={0} zIndex={100}>
      <Flex h="60px" align="center" justify="space-between">
        <Text as={Link} to="/" fontWeight={700} fontSize="lg" color="brand.500" textDecoration="none">
          📈 PriceTracker
        </Text>
        <HStack spacing={3}>
          <Button as={Link} to="/" variant="outline" colorScheme="brand" size="sm" leftIcon={<LayoutDashboard size={14} />}>
            Dashboard
          </Button>
          {user?.is_admin && (
            <Button as={Link} to="/admin" variant="outline" colorScheme="brand" size="sm" leftIcon={<Shield size={14} />}>
              Admin
            </Button>
          )}
          <Button variant="outline" colorScheme="brand" size="sm" leftIcon={<LogOut size={14} />} onClick={handleLogout}>
            Logout
          </Button>
        </HStack>
      </Flex>
    </Box>
  )
}
