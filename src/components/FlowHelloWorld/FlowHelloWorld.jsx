import React, { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './FlowHelloWorld.css'

// 🔷 Decision Node (Köşegen elmas)
const DecisionNode = ({ data }) => (
  <div className="flow-node flow-node--decision">
    <Handle type="target" position={Position.Left} />
    <Handle type="target" position={Position.Top} />
    <div className="flow-node__diamond">
      <span className="flow-node__diamond-label">{data.label}</span>
    </div>
    <Handle type="source" position={Position.Right} />
    <Handle type="source" position={Position.Top} />
    <Handle type="source" position={Position.Bottom} />
  </div>
)

// 🟢 Start & 🔴 End Node
const StartEndNode = ({ data }) => {
  const variant = data.type === 'start' ? 'start' : 'end'
  return (
    <div className="flow-node flow-node--startend">
      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Bottom} />
      <div className={`flow-node__pill flow-node__pill--${variant}`}>{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

// 🔵 Approval Node (Yuvarlak)
const ApprovalNode = ({ data }) => (
  <div className="flow-node flow-node--approval">
    <Handle type="target" position={Position.Left} />
    <Handle type="target" position={Position.Top} />
    <div className="flow-node__circle flow-node__circle--approval">
      <span className="flow-node__circle-label">{data.label}</span>
    </div>
    <Handle type="source" position={Position.Right} />
    <Handle type="source" position={Position.Top} />
  </div>
)

// 🟢/🔴 Result Node (ONAY / RET)
const ResultNode = ({ data }) => {
  const label = data.label ?? ''
  const isApprove = label.toString().toUpperCase() === 'ONAY'
  const resultModifier = isApprove ? 'approve' : 'reject'
  return (
    <div className="flow-node flow-node--result">
      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Bottom} />
      <div className={`flow-node__circle flow-node__circle--result flow-node__circle--result-${resultModifier}`}>
        <span className="flow-node__circle-label">{label}</span>
      </div>
      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

// Node Tipleri
const nodeTypes = {
  decision: DecisionNode,
  startEnd: StartEndNode,
  approval: ApprovalNode,
  result: ResultNode,
}

const API_BASE_URL = import.meta.env.VITE_WORKFLOW_API_BASE_URL ?? 'https://localhost:7071'

export default function IzinTalepFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  useEffect(() => {
    let isMounted = true

    const loadFlowDesign = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${API_BASE_URL}/api/workflowengine/flow-design`)
        if (!response.ok) {
          throw new Error(`Flow design isteği başarısız oldu: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        if (!isMounted) return

        setNodes(data.nodes ?? [])
        setEdges(data.edges ?? [])
      } catch (err) {
        if (!isMounted) return
        console.error('Flow design yüklenirken hata:', err)
        setError(err.message || 'Flow design yüklenemedi.')
        setNodes([])
        setEdges([])
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadFlowDesign()

    return () => {
      isMounted = false
    }
  }, [setEdges, setNodes])

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.7)',
            zIndex: 10,
            fontWeight: 600,
            color: '#1f2937',
          }}
        >
          Akış yükleniyor...
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.75rem 1rem',
            background: '#fee2e2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            zIndex: 20,
            maxWidth: '320px',
            boxShadow: '0 10px 25px rgba(185, 28, 28, 0.2)',
          }}
        >
          {error}
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  )
}
