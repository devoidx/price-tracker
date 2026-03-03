import { Link, useNavigate } from 'react-router-dom'
import { Box, Flex, Button, Text, HStack } from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'
import { LogOut, LayoutDashboard, Shield, User } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Box bg="brand.600" px={6} position="sticky" top={0} zIndex={100}>
      <Flex h="60px" align="center" justify="space-between">
      <Box as={Link} to="/" display="flex" alignItems="center" gap={3} textDecoration="none">
      <img src="/price_tracker_240x54.png" alt="PriceTracker" style={{ height: '54px', width: '240px', borderRadius: '6px' }} />
    </Box>
    <HStack spacing={3}>
      <Button as={Link} to="/" variant="ghost" color="white" _hover={{ bg: 'brand.700' }} size="sm" leftIcon={<LayoutDashboard size={14} />}>
        Dashboard
      </Button>
      {user?.is_admin && (
        <Button as={Link} to="/admin" variant="ghost" color="white" _hover={{ bg: 'brand.700' }} size="sm" leftIcon={<Shield size={14} />}>
          Admin
        </Button>
      )}
        <Button as={Link} to="/profile" variant="ghost" color="white" _hover={{ bg: 'brand.700' }} size="sm" leftIcon={<User size={14} />}>
          Profile
        </Button>
      <Button variant="ghost" color="white" _hover={{ bg: 'brand.700' }} size="sm" leftIcon={<LogOut size={14} />} onClick={handleLogout}>
        Logout
      </Button>
    </HStack>
  </Flex>
</Box>
  )
}
