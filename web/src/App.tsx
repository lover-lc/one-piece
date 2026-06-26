import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import ItemDetailPage from './modules/items/pages/ItemDetailPage'
import ItemFormPage from './modules/items/pages/ItemFormPage'
import ItemsPage from './modules/items/pages/ItemsPage'
import ManagePage from './modules/items/pages/ManagePage'
import SearchPage from './modules/items/pages/SearchPage'
import TabLayout from './modules/items/components/layout/TabLayout'
import { useSeedUserDefaults } from './modules/items/hooks/use-seed'
import PortalPage from './modules/portal/pages/PortalPage'
import SettingsPage from './modules/portal/pages/SettingsPage'
import ListManagePage from './modules/todos/pages/ListManagePage'
import TodoDetailPage from './modules/todos/pages/TodoDetailPage'
import TodoFormPage from './modules/todos/pages/TodoFormPage'
import TodosPage from './modules/todos/pages/TodosPage'
import TodoTabLayout from './modules/todos/components/layout/TodoTabLayout'
import { useSeedDefaultTodoList } from './modules/todos/hooks/use-seed-todo'
import RequireAuth from './shared/components/RequireAuth'
import RequireMember from './shared/components/RequireMember'
import { AuthProvider } from './shared/hooks/use-auth'
import LoginPage from './shared/pages/LoginPage'

const queryClient = new QueryClient()

function SeedLayout() {
  useSeedUserDefaults()
  useSeedDefaultTodoList()
  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<RequireMember />}>
          <Route element={<SeedLayout />}>
            <Route path="/portal" element={<PortalPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route path="/items">
              <Route path="new" element={<ItemFormPage />} />
              <Route path=":id/edit" element={<ItemFormPage />} />
              <Route path=":id" element={<ItemDetailPage />} />
              <Route element={<TabLayout />}>
                <Route index element={<ItemsPage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="manage" element={<ManagePage />} />
              </Route>
            </Route>

            <Route path="/todos">
              <Route path="new" element={<TodoFormPage />} />
              <Route element={<TodoTabLayout />}>
                <Route index element={<TodosPage />} />
                <Route path="timeline" element={<TodosPage />} />
                <Route path="assigned" element={<TodosPage />} />
                <Route path="created" element={<TodosPage />} />
                <Route path="lists" element={<ListManagePage />} />
              </Route>
              <Route path=":id/edit" element={<TodoFormPage />} />
              <Route path=":id" element={<TodoDetailPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/portal" replace />} />
      <Route path="*" element={<Navigate to="/portal" replace />} />
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
