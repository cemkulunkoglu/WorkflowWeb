import { Handle, Position } from '@xyflow/react'
import '../NotesNodes.css'

export default function StepNode({ data }) {
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Left} />
      <div className="notes-shape notes-shape--step">
        <span className="notes-shape__text">{data?.label || 'Step'}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

