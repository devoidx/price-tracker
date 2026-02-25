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
      50: '#e6fffa',
      100: '#b2f5ea',
      500: '#319795',
      600: '#2c7a7b',
      700: '#285e61',
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
