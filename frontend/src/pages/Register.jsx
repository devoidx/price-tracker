import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Box, Button, FormControl, FormLabel, Input, VStack, Heading, Text, Alert, AlertIcon } from '@chakra-ui/react'
import { register, login, getMe } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await register(form)
      const res = await login(form.username, form.password)
      localStorage.setItem('token', res.data.access_token)
      const me = await getMe()
      setUser(me.data)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box minH="100vh" bg="linear-gradient(135deg, #319795 0%, #838b2ac 100%)" display="flex" alignItems="center" justifyContent="center">
      <Box bg="white" _dark={{ bg: "gray.800" }} borderRadius="2xl" p={10} w="100%" maxW="420px" boxShadow="2xl">
        <VStack spacing={6} align="stretch">
          <Box>
            <Heading size="lg" mb={1}>Create account</Heading>
            <Text color="gray.500" fontSize="sm">Start tracking prices today</Text>
          </Box>
          {error && <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Username</FormLabel>
                <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} autoFocus focusBorderColor="brand.500" />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Email</FormLabel>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} focusBorderColor="brand.500" />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Password</FormLabel>
                <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} focusBorderColor="brand.500" />
              </FormControl>
              <Button type="submit" colorScheme="brand" width="100%" isLoading={loading} loadingText="Creating account...">
                Create account
              </Button>
            </VStack>
          </form>
          <Text textAlign="center" fontSize="sm" color="gray.500">
            Already have an account?{' '}
            <Text as={Link} to="/login" color="brand.500" fontWeight={600}>Sign in</Text>
          </Text>
        </VStack>
      </Box>
    </Box>
  )
}
