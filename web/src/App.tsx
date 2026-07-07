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
import PwaUpdateOverlay from './shared/components/PwaUpdateOverlay'
import { useSeedDefaultTodoList } from './modules/todos/hooks/use-seed-todo'
import { useRealtimeTodos } from './shared/hooks/use-realtime'
import RequireAuth from './shared/components/RequireAuth'
import RequireMember from './shared/components/RequireMember'
import ThemeShell from './shared/components/ThemeShell'
import { AuthProvider } from './shared/hooks/use-auth'
import LoginPage from './shared/pages/LoginPage'
import SceneViewPage from './modules/everything/pages/SceneViewPage'
import SetupPage from './modules/everything/pages/SetupPage'
import EverythingLayout from './modules/everything/pages/EverythingLayout'
import CheckinModuleLayout from './modules/checkin/components/layout/CheckinModuleLayout'
import CheckinTabLayout from './modules/checkin/components/layout/CheckinTabLayout'
import CheckinPage from './modules/checkin/pages/CheckinPage'
import CheckinOverviewPage from './modules/checkin/pages/CheckinOverviewPage'
import CheckinProfilePage from './modules/checkin/pages/CheckinProfilePage'
import CheckinRecordDetailPage from './modules/checkin/pages/CheckinRecordDetailPage'
import CheckinRecordFormPage from './modules/checkin/pages/CheckinRecordFormPage'

const queryClient = new QueryClient()

function SeedLayout() {
  useSeedUserDefaults()
  useSeedDefaultTodoList()
  useRealtimeTodos()
  return (
    <PendingActionsProvider>
      <Outlet />
      <NotificationToast />
      <PwaUpdateOverlay />
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

            <Route path="/everything" element={<EverythingLayout />}>
              <Route index element={<SceneViewPage />} />
              <Route path="setup" element={<SetupPage />} />
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

            <Route path="/checkin" element={<CheckinModuleLayout />}>
              <Route path="records/new" element={<CheckinRecordFormPage />} />
              <Route path="records/:id/edit" element={<CheckinRecordFormPage />} />
              <Route path="records/:id" element={<CheckinRecordDetailPage />} />
              <Route element={<CheckinTabLayout />}>
                <Route index element={<CheckinPage type="diet" />} />
                <Route path="exercise" element={<CheckinPage type="exercise" />} />
                <Route path="water" element={<CheckinPage type="water" />} />
                <Route path="overview" element={<CheckinOverviewPage />} />
                <Route path="profile" element={<CheckinProfilePage />} />
              </Route>
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
