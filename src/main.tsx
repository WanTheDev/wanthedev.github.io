import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from './ThemeProvider'
import App from './components/App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
        <App />
    </ThemeProvider>
  </React.StrictMode>
)