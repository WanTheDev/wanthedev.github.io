import '@mantine/core/styles.css';
import './globalStyles.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Routes, Route, Outlet, BrowserRouter } from 'react-router-dom'
import { MantineProvider, createTheme, rem } from '@mantine/core';

import Header from './components/Header'
import PageFooter from './components/PageFooter'

import HomePage from './pages/HomePage'
import ContactPage from './pages/ContactPage'
import ProjectsPage from './pages/ProjectsPage'

const theme = createTheme({
  colors: {
    'background': ['#222222', '#212121', '#2c2c2c', '#383838', '#444444', '#505050', '#5b5b5b', '#676767', '#737373', '#7e7e7e'],
    'text': ['#E0E2DB','#8F8F8F','#e6cb97','#d9bf8f','#ccb486','#bfa97e','#b39e76','#a6926d','#998765','#8c7c5c'],
    'primary': ['#474747','#3d3d3d','#333333','#303030','#2e2e2e','#2b2b2b','#292929','#262626','#242424','#212121']
  },
  fontSizes: {
    xs: rem(12),
    sm: rem(16),
    md: rem(20),
    lg: rem(24),
    xl: rem(28),
  },
  fontFamily: 'RobotoMono',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme='dark' theme={theme}>
      
      <BrowserRouter basename='/'>
        <Routes>

          { /* Root path which defines the page layout */}
          <Route path='/' element={
              <> {/* Page layout */}
                <Header /> {/* Header */}
                <Outlet /> {/* Page content */}
                <PageFooter /> {/* Page footer */}
              </>
          }>

            {/* Routes inside the root path serving page content as <Outlet /> */}
            <Route path='' element={<HomePage />}/>
            <Route path='contact' element={<ContactPage />}/>
            <Route path='projects' element={<ProjectsPage />}/>

          </Route>
        </Routes>

      </BrowserRouter>
      
    </MantineProvider>
  </React.StrictMode>
)