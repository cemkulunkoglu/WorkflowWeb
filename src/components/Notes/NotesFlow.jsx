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

// 👇 DÜZELTME BURADA: Klasör yapısına göre 2 değil 3 üst dizine çıkmamız gerekiyor olabilir
// veya src/config klasörünün yeri değişmiş olabilir.
// Varsayım: src/components/Notes/NotesFlow.jsx -> src/config/axiosClient.js
// Bu durumda ../../../config/axiosClient doğru yol olur.
import axiosClient from '../../config/axiosClient'
import { API_ROUTES } from '../../config/apiConfig'

// Storage ID'sini config dosyasından da alabilirsin, burada da tanımlayabilirsin.
const STORAGE_FLOW_ID_KEY = 'notes-flow-id'

const nodeTypes = {
  start: StartNode,
  decision: DecisionNode,
  step: StepNode,
}

const edgeTypes = {
  step: StepEdge,
}

export default function NotesFlow({ flowId: propFlowId, onClose, onSaveSuccess }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [designName, setDesignName] = useState('Yeni Akış Tasarımı')
  const [nodeCounts, setNodeCounts] = useState({ start: 0, decision: 0, step: 0 })
  
  const [selectedNodeType, setSelectedNodeType] = useState(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [connectionMode, setConnectionMode] = useState(false)
  const [connectionSource, setConnectionSource] = useState(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState([])
  const [activeNodeId, setActiveNodeId] = useState(null)
  const [labelEditorValue, setLabelEditorValue] = useState('')
  const [flowId, setFlowId] = useState(propFlowId || null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

  const computeCountsFromNodes = useCallback((nodeList) => {
    const counts = { start: 0, decision: 0, step: 0 }
    nodeList.forEach((node) => {
      const { type, id } = node
      if (!(type in counts)) counts[type] = 0
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

  // --- VERİ YÜKLEME ---
  useEffect(() => {
    const loadFlowDesign = async () => {
      let targetId = propFlowId;
      
      // Eğer component prop olmadan çalışıyorsa (eski sayfa mantığı)
      if (propFlowId === undefined) {
         targetId = window.localStorage.getItem(STORAGE_FLOW_ID_KEY)
      }

      if (!targetId) {
        setFlowId(null);
        setNodes([]);
        setEdges([]);
        setDesignName('Yeni Akış Tasarımı');
        setNodeCounts({ start: 0, decision: 0, step: 0 });
        return;
      }

      setFlowId(targetId);

      try {
        const response = await axiosClient.get(API_ROUTES.WORKFLOW.GET_BY_ID(targetId));
        const data = response.data;
        
        if (data.nodes) setNodes(data.nodes)
        if (data.edges) setEdges(data.edges)
        if (data.designName) setDesignName(data.designName);

        if (data.nodes) {
            const counts = computeCountsFromNodes(data.nodes);
            setNodeCounts(counts);
        }

      } catch (error) {
        console.error("Yükleme hatası:", error);
        if (error.response && error.response.status === 404) {
             if(propFlowId === undefined) {
                window.localStorage.removeItem(STORAGE_FLOW_ID_KEY);
             }
             setFlowId(null);
        } else {
             setSaveMessage({ type: 'error', text: 'Veri yüklenemedi' });
        }
      }
    }

    loadFlowDesign();
  }, [propFlowId, computeCountsFromNodes, setNodes, setEdges])

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          { ...params, type: 'step', markerEnd: { type: MarkerType.ArrowClosed, color: '#1d4ed8' } },
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
          data: { label: selectedNodeType === 'start' ? 'Başlangıç' : selectedNodeType === 'decision' ? 'Karar' : 'Adım' },
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
      if (!selectedNodeType || !reactFlowInstance || connectionMode) return
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      addNodeAtPosition(position)
    },
    [addNodeAtPosition, reactFlowInstance, selectedNodeType, connectionMode]
  )

  // --- TOOLBAR HANDLERS ---
  const handleSelectType = useCallback((type) => {
      setSelectedNodeType((current) => {
        const isSameType = current === type
        if (!isSameType) { setConnectionMode(false); setConnectionSource(null); }
        return isSameType ? null : type
      })
    }, [])

  const toggleConnectionMode = useCallback(() => {
    setSelectedNodeType(null)
    setConnectionMode((active) => { if (active) setConnectionSource(null); return !active })
  }, [])

  const handleNodeClick = useCallback((event, node) => {
      if (!connectionMode) return
      event.preventDefault(); event.stopPropagation()
      setSelectedNodeType(null)
      setConnectionSource((currentSource) => {
        if (!currentSource) return node.id
        if (currentSource === node.id) { setConnectionMode(false); return null }
        setEdges((eds) => addEdge({
              id: `manual-${currentSource}-${node.id}-${Date.now()}`,
              source: currentSource, target: node.id, type: 'step',
              markerEnd: { type: MarkerType.ArrowClosed, color: '#1d4ed8' },
            }, eds))
        setConnectionMode(false)
        return null
      })
    }, [connectionMode, setEdges])

  const handleSelectionChange = useCallback(({ nodes: selected }) => {
    const selectedNodes = selected ?? []
    const ids = selectedNodes.map((node) => node.id)
    setSelectedNodeIds(ids)
    if (selectedNodes.length === 1) {
      setActiveNodeId(selectedNodes[0].id)
      setLabelEditorValue(selectedNodes[0].data?.label || '')
    } else {
      setActiveNodeId(null); setLabelEditorValue('')
    }
  }, [])

  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeIds.length === 0) return
    setNodes((nds) => nds.filter((node) => !selectedNodeIds.includes(node.id)))
    setEdges((eds) => eds.filter((edge) => !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)))
    setSelectedNodeIds([]); setActiveNodeId(null); setLabelEditorValue('')
  }, [selectedNodeIds, setEdges, setNodes])

  const handleLabelInputChange = useCallback((event) => {
      const value = event.target.value
      setLabelEditorValue(value)
      if (!activeNodeId) return
      setNodes((nds) => nds.map((node) => node.id === activeNodeId ? { ...node, data: { ...node.data, label: value } } : node))
    }, [activeNodeId, setNodes])

  // --- KAYDETME ---
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveMessage(null)

    const payload = {
        designName: designName,
        nodes: nodes.map(node => ({
            label: node.data.label,
            type: node.type,
            x: node.position.x, 
            y: node.position.y
        })),
        edges: edges.map(edge => ({
            source: edge.source,
            target: edge.target,
            label: edge.label || "" 
        }))
    }

    try {
      let url = API_ROUTES.WORKFLOW.CREATE;
      let axiosMethod = axiosClient.post; 

      if (flowId) {
        url = API_ROUTES.WORKFLOW.UPDATE(flowId);
        axiosMethod = axiosClient.put;
      }

      const response = await axiosMethod(url, payload);
      const result = response.data;

      if(result.nodes) setNodes(result.nodes)
      if(result.edges) setEdges(result.edges)
      
      if (!flowId && result.id) {
         setFlowId(result.id);
         if (propFlowId === undefined) {
            window.localStorage.setItem(STORAGE_FLOW_ID_KEY, result.id);
         }
      }
      
      setSaveMessage({ type: 'success', text: 'Başarıyla kaydedildi.' })
      
      if (onSaveSuccess) onSaveSuccess();

    } catch (error) {
      console.error('Kaydetme hatası:', error)
      const message = error.response?.data?.message || error.message;
      setSaveMessage({ type: 'error', text: 'Kaydedilemedi: ' + message })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }, [edges, nodes, designName, flowId, setNodes, setEdges, propFlowId, onSaveSuccess])

  // --- SİLME ---
  const handleDeleteRemote = useCallback(async () => {
    if (!flowId) return
    if (!window.confirm('Bu akışı sunucudan silmek istediğinize emin misiniz?')) return

    setIsSaving(true)
    try {
      await axiosClient.delete(API_ROUTES.WORKFLOW.DELETE(flowId));

      setFlowId(null)
      setNodes([])
      setEdges([])
      setDesignName("Yeni Akış Tasarımı")
      
      if(propFlowId === undefined) {
         window.localStorage.removeItem(STORAGE_FLOW_ID_KEY)
      }
      
      setSaveMessage({ type: 'success', text: 'Sunucudan silindi.' })
      
      if (onSaveSuccess) onSaveSuccess();

    } catch (error) {
      console.error('Silme hatası:', error)
      setSaveMessage({ type: 'error', text: 'Silinemedi!' })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }, [flowId, setNodes, setEdges, propFlowId, onSaveSuccess])

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
  ].filter(Boolean).join(' ')

  return (
    <div className="notes-flow-wrapper">
      <div className="notes-flow-toolbar">
        
        <div className="flex items-center gap-2 mr-4 border-r pr-4 border-slate-200">
             <label className="text-xs font-bold text-slate-500 uppercase">Tasarım Adı:</label>
             <input 
                type="text" 
                value={designName} 
                onChange={(e) => setDesignName(e.target.value)}
                className="px-2 py-1 text-sm border rounded border-slate-300 focus:border-blue-500 outline-none"
             />
             {flowId && <span className="text-xs text-slate-400">ID: {flowId}</span>}
        </div>

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
          {saveMessage && (
            <span
              className={`text-sm px-3 py-1 rounded font-medium ${
                saveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {saveMessage.text}
            </span>
          )}
          <button
            type="button"
            onClick={toggleConnectionMode}
            className={`notes-flow-toolbar__button px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border ${
              connectionMode
                ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
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
          
          {/* Modal içindeyken kapatma butonu */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="notes-flow-toolbar__button px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            >
              Kapat
            </button>
          )}

          {flowId && (
            <button
              type="button"
              onClick={handleDeleteRemote}
              disabled={isSaving}
              className="notes-flow-toolbar__button px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border bg-white text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              Sunucudan Sil
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`notes-flow-toolbar__button px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border ${
              isSaving
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 cursor-wait'
                : 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow'
            }`}
          >
            {isSaving ? 'İşleniyor...' : flowId ? 'Güncelle' : 'Kaydet'}
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
          Şekil eklemek için tür seçip tıklayın. Bağlantı için moda geçin.
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