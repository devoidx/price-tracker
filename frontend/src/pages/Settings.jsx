import { useState, useEffect } from 'react'
import { Box, Heading, Text, Button, VStack, HStack, FormControl, FormLabel, FormHelperText, Input, Select, Switch, Alert, AlertIcon, Divider } from '@chakra-ui/react'
import { getSettings, updateSettings, testNotification, generateVapidKeys } from '../api'

export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState(null)
  const [generatingKeys, setGeneratingKeys] = useState(false)
  const [vapidMsg, setVapidMsg] = useState(null)

  useEffect(() => {
    getSettings().then(r => {
      setSettings(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }))

  const handleGenerateKeys = async () => {
  if (!confirm('This will replace any existing VAPID keys. All existing push subscriptions will stop working and users will need to re-enable push notifications. Continue?')) return
  setGeneratingKeys(true)
  setVapidMsg(null)
  try {
    const res = await generateVapidKeys()
    setSettings(s => ({ ...s, vapid_public_key: res.data.public_key }))
    setVapidMsg({ type: 'success', text: 'VAPID keys generated successfully' })
  } catch (err) {
    setVapidMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to generate keys' })
  } finally {
    setGeneratingKeys(false)
  }
}

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      await updateSettings(settings)
      setMsg({ type: 'success', text: 'Settings saved successfully' })
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setMsg(null)
    try {
      const res = await testNotification()
      setMsg({ type: 'success', text: res.data.message })
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Test notification failed' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <Text p={8} color="gray.400">Loading...</Text>

  return (
    <Box maxW="700px" mx="auto" px={6} py={8}>
      <Heading size="lg" mb={8}>Settings</Heading>

      {msg && (
        <Alert status={msg.type} borderRadius="md" mb={6}>
          <AlertIcon />{msg.text}
        </Alert>
      )}

      <Box bg="white" _dark={{ bg: 'gray.800' }} borderRadius="xl" p={6} boxShadow="sm" mb={5}>
  <Heading size="sm" mb={1}>Browser push notifications</Heading>
  <Text fontSize="sm" color="gray.500" mb={4}>
    VAPID keys enable browser push notifications. Generate keys once — regenerating will invalidate all existing subscriptions.
  </Text>
  {vapidMsg && (
    <Alert status={vapidMsg.type} borderRadius="md" mb={4}>
      <AlertIcon />{vapidMsg.text}
    </Alert>
  )}
  <VStack spacing={4} align="stretch">
    <FormControl>
      <FormLabel fontSize="sm">Contact email</FormLabel>
      <Input
        value={settings.vapid_email || ''}
        onChange={e => set('vapid_email', e.target.value)}
        placeholder="mailto:admin@example.com"
        focusBorderColor="brand.500"
        type="email"
      />
      <FormHelperText fontSize="xs">Required by the Web Push protocol — not shown to users</FormHelperText>
    </FormControl>
    {settings.vapid_public_key && (
      <FormControl>
        <FormLabel fontSize="sm">Public key</FormLabel>
        <Input value={settings.vapid_public_key} isReadOnly focusBorderColor="brand.500" fontFamily="mono" fontSize="xs" />
      </FormControl>
    )}
    <HStack>
      <Button colorScheme="brand" isLoading={generatingKeys} onClick={handleGenerateKeys}>
        {settings.vapid_public_key ? 'Regenerate keys' : 'Generate keys'}
      </Button>
      {settings.vapid_public_key && (
        <Button colorScheme="brand" isLoading={saving} onClick={handleSave}>
          Save email
        </Button>
      )}
    </HStack>
  </VStack>
</Box>

      <Box bg="white" _dark={{ bg: "gray.800" }} borderRadius="xl" p={6} boxShadow="sm" mb={5}>
        <Heading size="sm" mb={1}>Notifications</Heading>
        <Text fontSize="sm" color="gray.500" mb={4}>Configure how price alert emails are sent</Text>

        <FormControl mb={6}>
          <FormLabel fontSize="sm">Provider</FormLabel>
          <Select
            value={settings.notification_provider}
            onChange={e => set('notification_provider', e.target.value)}
            focusBorderColor="brand.500"
            maxW="200px"
          >
            <option value="smtp">SMTP</option>
            <option value="gmail">Gmail</option>
          </Select>
        </FormControl>

        {settings.notification_provider === 'gmail' && (
          <>
            <Divider mb={4} />
            <Heading size="xs" mb={4} color="gray.500">GMAIL CONFIGURATION</Heading>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel fontSize="sm">Gmail address</FormLabel>
                <Input
                  value={settings.gmail_address}
                  onChange={e => set('gmail_address', e.target.value)}
                  placeholder="your.address@gmail.com"
                  focusBorderColor="brand.500"
                  type="email"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">App password</FormLabel>
                <Input
                  value={settings.gmail_app_password}
                  onChange={e => set('gmail_app_password', e.target.value)}
                  placeholder="16-character app password"
                  focusBorderColor="brand.500"
                  type="password"
                />
                <FormHelperText fontSize="xs">
                  Generate at <Text as="a" href="https://myaccount.google.com/apppasswords" target="_blank" color="brand.500">myaccount.google.com/apppasswords</Text>. Requires 2-Step Verification.
                </FormHelperText>
              </FormControl>
            </VStack>
          </>
        )}

        {settings.notification_provider === 'smtp' && (
          <>
            <Divider mb={4} />
            <Heading size="xs" mb={4} color="gray.500">SMTP CONFIGURATION</Heading>
            <VStack spacing={4} align="stretch">
              <HStack spacing={4} align="flex-start">
                <FormControl>
                  <FormLabel fontSize="sm">Host</FormLabel>
                  <Input
                    value={settings.smtp_host}
                    onChange={e => set('smtp_host', e.target.value)}
                    placeholder="smtp.example.com"
                    focusBorderColor="brand.500"
                  />
                </FormControl>
                <FormControl maxW="120px">
                  <FormLabel fontSize="sm">Port</FormLabel>
                  <Input
                    value={settings.smtp_port}
                    onChange={e => set('smtp_port', e.target.value)}
                    placeholder="587"
                    focusBorderColor="brand.500"
                  />
                </FormControl>
              </HStack>
              <FormControl>
                <FormLabel fontSize="sm">Username</FormLabel>
                <Input
                  value={settings.smtp_username}
                  onChange={e => set('smtp_username', e.target.value)}
                  placeholder="username or email"
                  focusBorderColor="brand.500"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Password</FormLabel>
                <Input
                  value={settings.smtp_password}
                  onChange={e => set('smtp_password', e.target.value)}
                  type="password"
                  focusBorderColor="brand.500"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">From address</FormLabel>
                <Input
                  value={settings.smtp_from_address}
                  onChange={e => set('smtp_from_address', e.target.value)}
                  placeholder="alerts@example.com"
                  focusBorderColor="brand.500"
                  type="email"
                />
                <FormHelperText fontSize="xs">The address emails will be sent from</FormHelperText>
              </FormControl>
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <FormLabel fontSize="sm" mb={0}>Use TLS</FormLabel>
                  <Text fontSize="xs" color="gray.400">Enable for SMTPS (port 465) or STARTTLS (port 587)</Text>
                </Box>
                <Switch
                  isChecked={settings.smtp_use_tls === 'true'}
                  onChange={e => set('smtp_use_tls', e.target.checked ? 'true' : 'false')}
                  colorScheme="brand"
                />
              </FormControl>
            </VStack>
          </>
        )}

        <HStack mt={6} spacing={3}>
          <Button colorScheme="brand" isLoading={saving} onClick={handleSave}>
            Save settings
          </Button>
          <Button variant="outline" colorScheme="brand" isLoading={testing} onClick={handleTest}>
            Send test notification
          </Button>
        </HStack>
      </Box>
    </Box>
  )
}
