import { Handle, Position } from '@xyflow/react'
import '../NotesNodes.css'

export default function StartNode({ data }) {
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Left} />
      <div className="notes-shape notes-shape--start">
        <span className="notes-shape__text">{data?.label || 'Start'}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

