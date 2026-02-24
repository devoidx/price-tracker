import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { AuthProvider } from './context/AuthContext'
import App from './App'

const theme = extendTheme({
  colors: {
    brand: {
      50: '#eef2ff',
      100: '#e0e7ff',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
    }
  },
  fonts: {
    heading: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    body: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  },
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  }
})

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ChakraProvider>
    </QueryClientProvider>
  </BrowserRouter>
)
