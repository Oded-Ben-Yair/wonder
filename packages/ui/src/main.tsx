import React from 'react'
import ReactDOM from 'react-dom/client'
import AppSimple from './AppSimple.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppSimple />
    </ErrorBoundary>
  </React.StrictMode>,
)