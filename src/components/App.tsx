import { Routes, Route, Outlet, BrowserRouter } from 'react-router-dom'
import PageFooter from './PageFooter'
import ProjectsPage from "../pages/ProjectsPage"
import Header from './Header'
import ContactPage from "../pages/ContactPage.tsx"
import HomePage from "../pages/HomePage.tsx"

export default function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>

        { /* Root path which defines the page layout */}
        <Route path="/" element={
            <> {/* Page layout */}
              <Header /> {/* Header */}
              <Outlet /> {/* Page content */}
              <PageFooter /> {/* Page footer */}
            </>
        }>

          {/* Routes inside the root path serving page content as <Outlet /> */}
          <Route path="" element={<HomePage />}/>
          <Route path="contact" element={<ContactPage />}/>
          <Route path="projects" element={<ProjectsPage />}/>

        </Route>

      </Routes>
    </BrowserRouter>
  );
}
