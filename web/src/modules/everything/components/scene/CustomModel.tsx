import { Suspense } from 'react'
import { useGLTF } from '@react-three/drei'
import { ErrorBoundary } from 'react-error-boundary'
import { resolveModelUrl } from '../../lib/model-url'

const SOFA_URL = resolveModelUrl('everything-models/sofa_glb.glb')
const CABINET_URL = resolveModelUrl('everything-models/bathroom_sink_cabinet.glb')

function FallbackBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#9E9E9E" />
    </mesh>
  )
}

function GLBModelInner({ url }: { url: string }) {
  const { scene } = useGLTF(resolveModelUrl(url))
  return <primitive object={scene.clone()} />
}

export default function CustomModel({ url }: { url: string }) {
  return (
    <ErrorBoundary
      fallback={<FallbackBox />}
      onError={(error) => {
        console.error('模型加载失败:', error)
      }}
    >
      <Suspense fallback={<FallbackBox />}>
        <GLBModelInner url={url} />
      </Suspense>
    </ErrorBoundary>
  )
}

useGLTF.preload(SOFA_URL)
useGLTF.preload(CABINET_URL)

