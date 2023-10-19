import '@mantine/core/styles.css';
import './globalStyles.css'
import React, { useEffect, Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { Routes, Route, Outlet, HashRouter, useLocation } from 'react-router-dom'
import { MantineProvider, createTheme, rem } from '@mantine/core';

import Header from './components/Header'
import PageFooter from './components/PageFooter'

import LoadingPage from './pages/LoadingPage'

const HomePage = lazy(() => import('./pages/HomePage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))

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
  fontFamily: 'RobotoMono, Trebuchet MS, Helvetica, sans-serif'
});

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const pages = [
  {element: <HomePage />, path: ''}, // root path is an empty string
  {element: <ContactPage />, path: 'contact'},
  {element: <ProjectsPage />, path: 'projects'},
]

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme='dark' theme={theme}>
      <HashRouter basename='/'>
        <ScrollToTop /> { /* Scrolls to top on every pathname change */ }
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
            {
              pages.map((curPage) => <Route key={curPage.path} path={curPage.path} element={
                <Suspense fallback={<LoadingPage />}>{curPage.element}</Suspense>
              }/>)
            }

          </Route>
        </Routes>

      </HashRouter>
      
    </MantineProvider>
  </React.StrictMode>
)