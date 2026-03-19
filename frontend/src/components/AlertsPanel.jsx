import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Button, Heading, HStack, Text, Badge, Select, Input, FormControl, FormLabel, FormHelperText, VStack, Switch, Icon } from '@chakra-ui/react'
import { getAlerts, createAlert, deleteAlert, toggleAlert } from '../api'
import { Bell, Trash2, Plus } from 'lucide-react'

export default function AlertsPanel({ productId }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ alert_type: 'price_drop', threshold: '' })
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', productId],
    queryFn: () => getAlerts(productId).then(r => r.data)
  })

  const handleAdd = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createAlert(productId, {
        alert_type: form.alert_type,
        threshold: form.alert_type === 'price_drop' ? parseFloat(form.threshold) : null
      })
      queryClient.invalidateQueries(['alerts', productId])
      setForm({ alert_type: 'price_drop', threshold: '' })
      setAdding(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (alertId) => {
    await deleteAlert(alertId)
    queryClient.invalidateQueries(['alerts', productId])
  }

  const handleToggle = async (alertId) => {
    await toggleAlert(alertId)
    queryClient.invalidateQueries(['alerts', productId])
  }

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={4}>
        <HStack>
          <Icon as={Bell} color="brand.500" />
          <Heading size="sm">Alerts</Heading>
        </HStack>
        {!adding && (
          <Button size="sm" colorScheme="brand" leftIcon={<Plus size={13} />} onClick={() => setAdding(true)}>
            Add alert
          </Button>
        )}
      </HStack>

      {adding && (
        <Box bg="gray.50" borderRadius="lg" p={4} mb={4}>
          <form onSubmit={handleAdd}>
            <VStack spacing={3} align="stretch">
              <FormControl>
                <FormLabel fontSize="sm">Alert type</FormLabel>
                <Select value={form.alert_type} onChange={e => setForm({...form, alert_type: e.target.value})} focusBorderColor="brand.500" size="sm">
                  <option value="price_drop">Price drops below a threshold</option>
                  <option value="all_time_low">New all-time low</option>
	          <option value="price_decreased">Any price decrease since last check</option>
                </Select>
              </FormControl>
              {form.alert_type === 'price_drop' && (
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Alert me when price drops below</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 49.99"
                    value={form.threshold}
                    onChange={e => setForm({...form, threshold: e.target.value})}
                    focusBorderColor="brand.500"
                    size="sm"
                  />
                  <FormHelperText fontSize="xs">Enter amount in £</FormHelperText>
                </FormControl>
              )}
              {form.alert_type === 'all_time_low' && (
                <Text fontSize="xs" color="gray.500">
                  You'll be notified whenever this product hits a new all-time low price.
                </Text>
              )}
              <HStack justify="flex-end">
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                <Button size="sm" colorScheme="brand" type="submit" isLoading={loading}>Save alert</Button>
              </HStack>
            </VStack>
          </form>
        </Box>
      )}

      {alerts.length === 0 && !adding ? (
        <Text fontSize="sm" color="gray.400">No alerts set up yet</Text>
      ) : (
        <VStack spacing={2} align="stretch">
          {alerts.map(alert => (
            <HStack key={alert.id} justify="space-between" p={3} bg="gray.50" borderRadius="lg">
              <HStack spacing={3}>
                <Switch
                  isChecked={alert.enabled}
                  onChange={() => handleToggle(alert.id)}
                  colorScheme="brand"
                  size="sm"
                />
                <Box>
                  <Text fontSize="sm" fontWeight={500}>
                    {alert.alert_type === 'all_time_low'
                      ? 'New all-time low'
		      : alert.alert_type === 'price_decreased'
		      ? 'Any price decrease'
                      : `Price drops below £${Number(alert.threshold).toFixed(2)}`}
                  </Text>
                  {alert.last_triggered_at && (
                    <Text fontSize="xs" color="gray.400">
                      Last triggered {new Date(alert.last_triggered_at).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}
                    </Text>
                  )}
                </Box>
              </HStack>
              <HStack>
                <Badge colorScheme={alert.enabled ? 'green' : 'gray'} fontSize="xs">
                  {alert.enabled ? 'Active' : 'Paused'}
                </Badge>
                <Button size="xs" colorScheme="red" variant="ghost" onClick={() => handleDelete(alert.id)}>
                  <Trash2 size={13} />
                </Button>
              </HStack>
            </HStack>
          ))}
        </VStack>
      )}
    </Box>
  )
}
