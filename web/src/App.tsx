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
import TodoManagePage, { TodoListsRedirect } from './modules/todos/pages/TodoManagePage'
import TodoFormPage from './modules/todos/pages/TodoFormPage'
import TodosPage from './modules/todos/pages/TodosPage'
import TodoTabLayout from './modules/todos/components/layout/TodoTabLayout'
import TodoModuleLayout from './modules/todos/components/layout/TodoModuleLayout'
import { PendingActionsProvider } from './modules/todos/context/pending-actions-context'
import NotificationToast from './modules/todos/components/NotificationToast'
import { useSeedDefaultTodoList } from './modules/todos/hooks/use-seed-todo'
import { useRealtimeTodos } from './shared/hooks/use-realtime'
import RequireAuth from './shared/components/RequireAuth'
import RequireMember from './shared/components/RequireMember'
import ThemeShell from './shared/components/ThemeShell'
import { AuthProvider } from './shared/hooks/use-auth'
import LoginPage from './shared/pages/LoginPage'

const queryClient = new QueryClient()

function SeedLayout() {
  useSeedUserDefaults()
  useSeedDefaultTodoList()
  useRealtimeTodos()
  return (
    <PendingActionsProvider>
      <Outlet />
      <NotificationToast />
    </PendingActionsProvider>
  )
}

function AppRoutes() {
  return (
    <ThemeShell>
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

            <Route path="/todos" element={<TodoModuleLayout />}>
              <Route path="new" element={<TodoFormPage />} />
              <Route element={<TodoTabLayout />}>
                <Route index element={<TodosPage />} />
                <Route path="timeline" element={<TodosPage />} />
                <Route path="assigned" element={<Navigate to="/todos" replace />} />
                <Route path="created" element={<TodosPage />} />
                <Route path="lists" element={<TodoListsRedirect />} />
                <Route path="manage" element={<TodoManagePage />} />
              </Route>
              <Route path=":id/edit" element={<TodoFormPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/portal" replace />} />
      <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </ThemeShell>
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
