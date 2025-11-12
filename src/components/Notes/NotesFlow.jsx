import { useCallback, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import StartNode from './Start/StartNode'
import DecisionNode from './Decision/DecisionNode'
import StepNode from './Step/StepNode'
import StepEdge from './Step/StepEdge'
import './NotesFlow.css'

const STORAGE_KEY = 'notes-flow-state'

const nodeTypes = {
  start: StartNode,
  decision: DecisionNode,
  step: StepNode,
}

const edgeTypes = {
  step: StepEdge,
}

export default function NotesFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [nodeCounts, setNodeCounts] = useState({ start: 0, decision: 0, step: 0 })
  const [selectedNodeType, setSelectedNodeType] = useState(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [connectionMode, setConnectionMode] = useState(false)
  const [connectionSource, setConnectionSource] = useState(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState([])
  const [activeNodeId, setActiveNodeId] = useState(null)
  const [labelEditorValue, setLabelEditorValue] = useState('')
  const computeCountsFromNodes = useCallback((nodeList) => {
    const counts = { start: 0, decision: 0, step: 0 }

    nodeList.forEach((node) => {
      const { type, id } = node
      if (!(type in counts)) {
        counts[type] = 0
      }

      const match = id.match(/^(start|decision|step)-(\d+)$/)
      if (match) {
        const [, matchedType, index] = match
        counts[matchedType] = Math.max(counts[matchedType], Number(index))
      } else if (type in counts) {
        counts[type] += 1
      }
    })

    return counts
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (!stored) return

      const parsed = JSON.parse(stored)

      if (Array.isArray(parsed.nodes)) {
        setNodes(parsed.nodes)

        const derivedCounts = parsed.nodeCounts ?? computeCountsFromNodes(parsed.nodes)
        setNodeCounts((prev) => ({
          ...prev,
          ...derivedCounts,
        }))
      }

      if (Array.isArray(parsed.edges)) {
        setEdges(parsed.edges)
      }
    } catch (error) {
      console.error('NotesFlow state yüklenirken hata oluştu:', error)
    }
  }, [computeCountsFromNodes, setEdges, setNodes])

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'step',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#1d4ed8',
            },
          },
          eds
        )
      ),
    [setEdges]
  )

  const addNodeAtPosition = useCallback(
    (position) => {
      if (!selectedNodeType) return

      setNodeCounts((prev) => {
        const nextCount = prev[selectedNodeType] + 1

        const newNode = {
          id: `${selectedNodeType}-${nextCount}`,
          type: selectedNodeType,
          position,
          data: {
            label:
              selectedNodeType === 'start'
                ? 'Başlangıç'
                : selectedNodeType === 'decision'
                ? 'Karar'
                : 'Adım',
          },
        }

        setNodes((nds) => nds.concat(newNode))
        return { ...prev, [selectedNodeType]: nextCount }
      })

      setSelectedNodeType(null)
    },
    [selectedNodeType, setNodes, setSelectedNodeType]
  )

  const handlePaneClick = useCallback(
    (event) => {
      if (!selectedNodeType || !reactFlowInstance || connectionMode) {
        return
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      addNodeAtPosition(position)
    },
    [addNodeAtPosition, reactFlowInstance, selectedNodeType, connectionMode]
  )

  const handleSelectType = useCallback(
    (type) => {
      setSelectedNodeType((current) => {
        const isSameType = current === type

        if (!isSameType) {
          setConnectionMode(false)
          setConnectionSource(null)
        }

        return isSameType ? null : type
      })
    },
    [setConnectionMode, setConnectionSource]
  )

  const toggleConnectionMode = useCallback(() => {
    setSelectedNodeType(null)
    setConnectionMode((active) => {
      if (active) {
        setConnectionSource(null)
      }
      return !active
    })
  }, [])

  const handleNodeClick = useCallback(
    (event, node) => {
      if (!connectionMode) return

      event.preventDefault()
      event.stopPropagation()

      setSelectedNodeType(null)

      setConnectionSource((currentSource) => {
        if (!currentSource) {
          return node.id
        }

        if (currentSource === node.id) {
          setConnectionMode(false)
          return null
        }

        setEdges((eds) =>
          addEdge(
            {
              id: `manual-${currentSource}-${node.id}-${Date.now()}`,
              source: currentSource,
              target: node.id,
              type: 'step',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#1d4ed8',
              },
            },
            eds
          )
        )

        setConnectionMode(false)

        return null
      })
    },
    [connectionMode, setEdges, setSelectedNodeType]
  )

  const handleSelectionChange = useCallback(({ nodes: selected }) => {
    const selectedNodes = selected ?? []
    const ids = selectedNodes.map((node) => node.id)
    setSelectedNodeIds(ids)

    if (selectedNodes.length === 1) {
      const node = selectedNodes[0]
      setActiveNodeId(node.id)
      setLabelEditorValue(node.data?.label || '')
    } else {
      setActiveNodeId(null)
      setLabelEditorValue('')
    }
  }, [])

  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeIds.length === 0) return

    setNodes((nds) => nds.filter((node) => !selectedNodeIds.includes(node.id)))
    setEdges((eds) =>
      eds.filter((edge) => !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target))
    )
    setSelectedNodeIds([])
    setActiveNodeId(null)
    setLabelEditorValue('')
  }, [selectedNodeIds, setEdges, setNodes])

  const handleLabelInputChange = useCallback(
    (event) => {
      const value = event.target.value
      setLabelEditorValue(value)

      if (!activeNodeId) return

      setNodes((nds) =>
        nds.map((node) =>
          node.id === activeNodeId ? { ...node, data: { ...node.data, label: value } } : node
        )
      )
    },
    [activeNodeId, setNodes]
  )

  const handleSave = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      const payload = JSON.stringify({
        nodes,
        edges,
        nodeCounts,
      })

      window.localStorage.setItem(STORAGE_KEY, payload)
    } catch (error) {
      console.error('NotesFlow state kaydedilirken hata oluştu:', error)
    }
  }, [edges, nodes, nodeCounts])

  const shapeOptions = [
    { type: 'start', label: 'Kare' },
    { type: 'decision', label: 'Daire' },
    { type: 'step', label: 'Üçgen' },
  ]

  const renderShapePreview = (type) => (
    <div className={`shape-preview shape-preview--${type}`} />
  )

  const canvasClassName = [
    'notes-flow-canvas',
    selectedNodeType && !connectionMode ? 'notes-flow-canvas--placing' : '',
    connectionMode ? 'notes-flow-canvas--connecting' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="notes-flow-wrapper">
      <div className="notes-flow-toolbar">
        <div className="notes-flow-toolbar__group">
          {shapeOptions.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => handleSelectType(option.type)}
              className={`notes-flow-toolbar__button px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border ${
                selectedNodeType === option.type
                  ? 'bg-blue-600 text-white border-blue-600 shadow'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                {renderShapePreview(option.type)}
                {option.label}
              </span>
            </button>
          ))}
        </div>
        <div className="notes-flow-toolbar__actions">
          <button
            type="button"
            onClick={toggleConnectionMode}
            className={`notes-flow-toolbar__button px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border ${
              connectionMode ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {connectionMode ? 'Bağlantı Modu Aktif' : 'Bağlantı Oluştur'}
          </button>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedNodeIds.length === 0}
            className={`notes-flow-toolbar__button px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border ${
              selectedNodeIds.length === 0
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
            }`}
          >
            Seçili Şekli Sil
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="notes-flow-toolbar__button px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow"
          >
            Kaydet
          </button>
        </div>
        {activeNodeId && (
          <div className="notes-flow-label-editor">
            <label className="notes-flow-label-editor__label" htmlFor="notes-flow-label-input">
              Etiket
            </label>
            <input
              id="notes-flow-label-input"
              type="text"
              value={labelEditorValue}
              onChange={handleLabelInputChange}
              className="notes-flow-label-editor__input"
              placeholder="Düğüm etiketi"
            />
          </div>
        )}
        <span className="notes-flow-toolbar__info">
          Şekil eklemek için önce tür seçin, diyagramda tıklayın. Bağlantı modu aktifken ardışık iki düğüme tıklayarak bağlantı oluşturabilirsiniz.
          Seçili düğümleri silmek için yukarıdaki butonu kullanın veya klavyeden Delete tuşuna basın.
        </span>
      </div>

      <ReactFlow
        className={canvasClassName}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.4 }}
        panOnScroll
        zoomOnPinch
        onPaneClick={handlePaneClick}
        onInit={setReactFlowInstance}
        onNodeClick={handleNodeClick}
        onSelectionChange={handleSelectionChange}
      >
        <MiniMap
          zoomable
          pannable
          nodeStrokeColor={() => '#1e293b'}
          nodeStrokeWidth={2}
          nodeColor={() => '#bfdbfe'}
        />
        <Controls />
        <Background variant="lines" gap={18} size={1} color="#dbeafe" />
      </ReactFlow>
    </div>
  )
}

