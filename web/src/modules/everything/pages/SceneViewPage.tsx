import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SceneErrorBoundary } from '../components/ErrorBoundary'
import SceneCanvas from '../components/scene/SceneCanvas'
import ControlsHint from '../components/ui/ControlsHint'
import ContainerItemsModal from '../components/ui/ContainerItemsModal'
import WebGLUnsupportedPage from '../components/WebGLUnsupportedPage'
import EditorToolbar from '../components/editor/EditorToolbar'
import MobileJoystick from '../components/ui/MobileJoystick'
import { useHasScene } from '../hooks/use-scene-config'
import { isWebGLSupported } from '../lib/webgl-check'

export default function SceneViewPage() {
  const navigate = useNavigate()
  const { hasScene, loading } = useHasScene()

  useEffect(() => {
    if (!loading && !hasScene) {
      navigate('/everything/setup')
    }
  }, [hasScene, loading, navigate])

  if (!isWebGLSupported()) {
    return <WebGLUnsupportedPage />
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-text-secondary">加载中...</p>
      </div>
    )
  }

  return (
    <SceneErrorBoundary>
      <SceneCanvas />
      <EditorToolbar />
      <MobileJoystick />
      <ControlsHint />
      <ContainerItemsModal />
    </SceneErrorBoundary>
  )
}
