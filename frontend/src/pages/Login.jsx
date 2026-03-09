import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Box, Button, FormControl, FormLabel, Input, Heading, Text, Alert, AlertIcon, VStack } from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'
import { login, getMe } from '../api'

export default function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get('session') === 'expired'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await login(username, password)
      localStorage.setItem('token', res.data.access_token)
      const me = await getMe()
      setUser(me.data)
      navigate('/')
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="brand.50" px={4}>
      <Box bg="white" borderRadius="2xl" boxShadow="lg" p={8} w="full" maxW="400px">
        {sessionExpired && (
          <Alert status="warning" borderRadius="md" mb={4}>
            <AlertIcon />
            Your session has expired — please log in again
          </Alert>
        )}
        <Heading size="lg" mb={2}>Welcome back</Heading>
        <Text color="gray.500" fontSize="sm" mb={6}>Sign in to your account</Text>
        {error && (
          <Alert status="error" borderRadius="md" mb={4}>
            <AlertIcon />{error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Username</FormLabel>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                focusBorderColor="brand.500"
                autoFocus
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                focusBorderColor="brand.500"
              />
            </FormControl>
            <Button type="submit" colorScheme="brand" w="full" isLoading={loading}>
              Sign in
            </Button>
          </VStack>
        </form>
        <Text fontSize="sm" color="gray.500" mt={4} textAlign="center">
          Don't have an account?{' '}
          <Text as={Link} to="/register" color="brand.500" fontWeight={500}>Register</Text>
        </Text>
      </Box>
    </Box>
  )
}
