import { Handle, Position } from '@xyflow/react'
import '../NotesNodes.css'

export default function StartNode({ data }) {
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Left} />
      <div className="notes-shape notes-shape--start">{data?.label || 'Start'}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

