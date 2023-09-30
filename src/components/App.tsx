import { Routes, Route, Outlet, BrowserRouter } from 'react-router-dom'
import PageFooter from './PageFooter'
import ProjectsPage from "../pages/ProjectsPage"
import Header from './Header'
import ContactPage from "../pages/ContactPage.tsx"
import HomePage from "../pages/HomePage.tsx"

export default function App() {
  //
  return (
    <BrowserRouter basename="/">
      {/* Routes */}
      <Routes>
        <Route path="/" element={<><Header /><Outlet /></>}>
          <Route path="" element={<HomePage />}/>
          <Route path="contact" element={<ContactPage />}/>
          <Route path="projects" element={<ProjectsPage />}/>
        </Route>
        
      </Routes>
      
      {/* Footer */}
      <PageFooter />
    
    </BrowserRouter>
  );
}
