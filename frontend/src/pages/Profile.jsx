import { useState } from 'react'
import { Box, Button, FormControl, FormLabel, FormHelperText, Input, VStack, Heading, Text, Select, Alert, AlertIcon, Divider, HStack, Badge, Tabs, TabList, Tab, TabPanels, TabPanel } from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'
import { changePassword, updateProfile, getCurrencies, updateCurrency } from '../api'
import { useQuery } from '@tanstack/react-query'
import { useColorMode } from '@chakra-ui/react'
import { updateColorMode } from '../api'

export default function Profile() {
  const { user, setUser } = useAuth()
  const { colorMode, toggleColorMode } = useColorMode()
  const [colorModeLoading, setColorModeLoading] = useState(false)

  const [email, setEmail] = useState(user.email)
  const [emailMsg, setEmailMsg] = useState(null)
  const [emailLoading, setEmailLoading] = useState(false)

  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [passwordMsg, setPasswordMsg] = useState(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [currencyMsg, setCurrencyMsg] = useState(null)
  const [currencyLoading, setCurrencyLoading] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState(user.default_currency || 'GBP')

  const handleColorModeToggle = async () => {
    setColorModeLoading(true)
    const newMode = colorMode === 'light' ? 'dark' : 'light'
    toggleColorMode()
    try {
      await updateColorMode({ color_mode: newMode })
      setUser({ ...user, color_mode: newMode })
    } catch (err) {
      toggleColorMode() // revert on error
    } finally {
      setColorModeLoading(false)
    }
  }

  const { data: currencies = {} } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => getCurrencies().then(r => r.data)
  })

  const handleCurrencyUpdate = async () => {
    setCurrencyLoading(true)
    setCurrencyMsg(null)
    try {
      await updateCurrency({ default_currency: selectedCurrency })
      setUser({ ...user, default_currency: selectedCurrency })
      setCurrencyMsg({ type: 'success', text: 'Currency updated successfully' })
    } catch (err) {
      setCurrencyMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update currency' })
    } finally {
      setCurrencyLoading(false)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setEmailLoading(true)
    setEmailMsg(null)
    try {
      const res = await updateProfile({ email })
      setUser({ ...user, email: res.data.email })
      setEmailMsg({ type: 'success', text: 'Email updated successfully' })
    } catch (err) {
      setEmailMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update email' })
    } finally {
      setEmailLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordMsg(null)
    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' })
      return
    }
    if (passwords.new_password.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters' })
      return
    }
    setPasswordLoading(true)
    try {
      await changePassword({ current_password: passwords.current_password, new_password: passwords.new_password })
      setPasswords({ current_password: '', new_password: '', confirm_password: '' })
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' })
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to change password' })
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <Box maxW="700px" mx="auto" px={6} py={8}>
      <Heading size="lg" mb={8}>My Profile</Heading>

      {/* Account info */}
      <Box bg="white" _dark={{ bg: "gray.800" }} borderRadius="xl" p={6} boxShadow="sm" mb={5}>
        <Heading size="sm" mb={4}>Account</Heading>
        <HStack mb={4}>
          <Text fontSize="sm" color="gray.500" w="120px">Username</Text>
          <Text fontSize="sm" fontWeight={500}>{user.username}</Text>
          {user.is_super_admin && <Badge colorScheme="purple" ml={2}>Super admin</Badge>}
          {user.is_admin && !user.is_super_admin && <Badge colorScheme="blue" ml={2}>Admin</Badge>}
        </HStack>
        <HStack>
          <Text fontSize="sm" color="gray.500" w="120px">Member since</Text>
          <Text fontSize="sm">{new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </HStack>
      </Box>

      {/* Tabs */}
      <Box bg="white" _dark={{ bg: "gray.800" }} borderRadius="xl" boxShadow="sm" overflow="hidden">
        <Tabs colorScheme="brand" px={2}>
          <TabList borderBottomColor="gray.100">
            <Tab fontSize="sm">Currency</Tab>
            <Tab fontSize="sm">Appearance</Tab>
            <Tab fontSize="sm">Email</Tab>
            <Tab fontSize="sm">Password</Tab>
          </TabList>

          <TabPanels>

            {/* Currency tab */}
            <TabPanel>
              <Text fontSize="sm" color="gray.500" mb={4}>
                Prices will be converted to your preferred currency where exchange rates are available.
              </Text>
              {currencyMsg && (
                <Alert status={currencyMsg.type} borderRadius="md" mb={4}>
                  <AlertIcon />{currencyMsg.text}
                </Alert>
              )}
              <FormControl>
                <FormLabel fontSize="sm">Default currency</FormLabel>
                <Select
                  value={selectedCurrency}
                  onChange={e => setSelectedCurrency(e.target.value)}
                  focusBorderColor="brand.500"
                  maxW="300px"
                >
                  {Object.entries(currencies).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </Select>
              </FormControl>
              <Button mt={4} colorScheme="brand" isLoading={currencyLoading} onClick={handleCurrencyUpdate}>
                Save currency
              </Button>
            </TabPanel>
            <TabPanel>
              <Text fontSize="sm" color="gray.500" mb={6}>
                Choose your preferred colour scheme. This setting is saved to your account and applies across all devices.
              </Text>
              <HStack spacing={4}>
                <Button
                  onClick={handleColorModeToggle}
                  isLoading={colorModeLoading}
                  colorScheme="brand"
                  variant={colorMode === 'light' ? 'solid' : 'outline'}
                >
                  ☀️ Light
                </Button>
                <Button
                  onClick={handleColorModeToggle}
                  isLoading={colorModeLoading}
                  colorScheme="brand"
                  variant={colorMode === 'dark' ? 'solid' : 'outline'}
                  color={colorMode === 'dark' ? 'white' : 'brand.500'}
                  _dark={{ color: colorMode === 'dark' ? 'white' : 'brand.200' }}
                >
                  🌙 Dark
                </Button>
              </HStack>
            </TabPanel>
            {/* Email tab */}
            <TabPanel>
              <Text fontSize="sm" color="gray.500" mb={4}>
                This is where price alert notifications will be sent.
              </Text>
              {emailMsg && (
                <Alert status={emailMsg.type} borderRadius="md" mb={4}>
                  <AlertIcon />{emailMsg.text}
                </Alert>
              )}
              <form onSubmit={handleProfileUpdate}>
                <VStack spacing={4} align="stretch">
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">Email address</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      focusBorderColor="brand.500"
                    />
                  </FormControl>
                  <Button type="submit" colorScheme="brand" alignSelf="flex-start" isLoading={emailLoading}>
                    Save email
                  </Button>
                </VStack>
              </form>
            </TabPanel>

            {/* Password tab */}
            <TabPanel>
              {passwordMsg && (
                <Alert status={passwordMsg.type} borderRadius="md" mb={4}>
                  <AlertIcon />{passwordMsg.text}
                </Alert>
              )}
              <form onSubmit={handlePasswordChange}>
                <VStack spacing={4} align="stretch">
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">Current password</FormLabel>
                    <Input
                      type="password"
                      value={passwords.current_password}
                      onChange={e => setPasswords({ ...passwords, current_password: e.target.value })}
                      focusBorderColor="brand.500"
                    />
                  </FormControl>
                  <Divider />
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">New password</FormLabel>
                    <Input
                      type="password"
                      value={passwords.new_password}
                      onChange={e => setPasswords({ ...passwords, new_password: e.target.value })}
                      focusBorderColor="brand.500"
                    />
                    <FormHelperText fontSize="xs">Minimum 8 characters</FormHelperText>
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">Confirm new password</FormLabel>
                    <Input
                      type="password"
                      value={passwords.confirm_password}
                      onChange={e => setPasswords({ ...passwords, confirm_password: e.target.value })}
                      focusBorderColor="brand.500"
                    />
                  </FormControl>
                  <Button type="submit" colorScheme="brand" alignSelf="flex-start" isLoading={passwordLoading}>
                    Change password
                  </Button>
                </VStack>
              </form>
            </TabPanel>

          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  )
}

