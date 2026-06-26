import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import TabLayout from './components/layout/TabLayout'
import { AuthProvider } from './hooks/use-auth'
import { useSeedUserDefaults } from './hooks/use-seed'
import ItemDetailPage from './pages/ItemDetailPage'
import ItemFormPage from './pages/ItemFormPage'
import ItemsPage from './pages/ItemsPage'
import LoginPage from './pages/LoginPage'
import ManagePage from './pages/ManagePage'
import SearchPage from './pages/SearchPage'

const queryClient = new QueryClient()

function SeedLayout() {
  useSeedUserDefaults()
  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<SeedLayout />}>
          <Route path="/items/new" element={<ItemFormPage />} />
          <Route path="/items/:id/edit" element={<ItemFormPage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route element={<TabLayout />}>
            <Route index element={<ItemsPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="manage" element={<ManagePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
