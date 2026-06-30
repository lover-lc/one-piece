import { useGLTF } from '@react-three/drei'
import { resolveModelUrl } from '../../lib/model-url'

const SOFA_URL = resolveModelUrl('everything-models/sofa_glb.glb')
const CABINET_URL = resolveModelUrl('everything-models/bathroom_sink_cabinet.glb')

export default function CustomModel({
  url,
}: {
  url: string
}) {
  const { scene } = useGLTF(resolveModelUrl(url))
  return <primitive object={scene} />
}

useGLTF.preload(SOFA_URL)
useGLTF.preload(CABINET_URL)

