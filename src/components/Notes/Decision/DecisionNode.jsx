import { Handle, Position } from '@xyflow/react'
import '../NotesNodes.css'

export default function DecisionNode({ data }) {
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Top} />
      <div className="notes-shape notes-shape--decision">
        <span className="notes-shape__text">{data?.label || 'Decision'}</span>
      </div>
      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

