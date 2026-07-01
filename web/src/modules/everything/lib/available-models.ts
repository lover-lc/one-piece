// 可用的容器模型配置

export interface AvailableModel {
  id: string
  name: string
  modelRef: string // 相对于 public/ 的路径，运行时解析为绝对 URL
  modelType: 'builtin' | 'custom' // builtin: 内置几何体, custom: 自定义GLB模型
  icon: string
  description?: string
}

export const AVAILABLE_MODELS: readonly AvailableModel[] = [
  {
    id: 'sofa',
    name: '沙发',
    modelRef: 'everything-models/sofa_glb.glb',
    modelType: 'custom',
    icon: '🛋️',
    description: '三人座沙发',
  },
  {
    id: 'cabinet',
    name: '浴室柜',
    modelRef: 'everything-models/bathroom_sink_cabinet.glb',
    modelType: 'custom',
    icon: '🚿',
    description: '带水槽的浴室柜',
  },
]
