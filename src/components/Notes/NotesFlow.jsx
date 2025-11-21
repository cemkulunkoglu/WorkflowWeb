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

import { API_ROUTES } from '../../config/apiConfig'

const STORAGE_FLOW_ID_KEY = 'notes-flow-id'

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
  
  // Tasarım adı için state ekledik (API için zorunlu)
  const [designName, setDesignName] = useState('Yeni Akış Tasarımı')
  
  const [nodeCounts, setNodeCounts] = useState({ start: 0, decision: 0, step: 0 })
  const [selectedNodeType, setSelectedNodeType] = useState(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [connectionMode, setConnectionMode] = useState(false)
  const [connectionSource, setConnectionSource] = useState(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState([])
  const [activeNodeId, setActiveNodeId] = useState(null)
  const [labelEditorValue, setLabelEditorValue] = useState('')
  const [flowId, setFlowId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

  // --- NODE SAYACI (ID üretmek için) ---
  const computeCountsFromNodes = useCallback((nodeList) => {
    const counts = { start: 0, decision: 0, step: 0 }
    nodeList.forEach((node) => {
      const { type, id } = node
      if (!(type in counts)) counts[type] = 0

      // ID formatı: "type-index" (örn: step-5)
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

  // --- VERİ YÜKLEME (READ) ---
  useEffect(() => {
    const loadFlowDesign = async () => {
      // 1. Önce LocalStorage'da kayıtlı bir ID var mı bakalım
      const storedFlowId = window.localStorage.getItem(STORAGE_FLOW_ID_KEY)
      
      // ID yoksa (ilk açılış) boş başla
      if (!storedFlowId) return;

      setFlowId(storedFlowId);

      try {
        // 2. API'den veriyi çek
        const response = await fetch(API_ROUTES.WORKFLOW.GET_BY_ID(storedFlowId))
        
        if (!response.ok) {
           if(response.status === 404) {
               // Eğer ID localstorage'da var ama DB'de yoksa temizle
               window.localStorage.removeItem(STORAGE_FLOW_ID_KEY);
               setFlowId(null);
               return;
           }
           throw new Error(`Veri çekilemedi: ${response.statusText}`);
        }

        const data = await response.json()
        
        // 3. State'i güncelle
        // Backend'den gelen veri zaten React Flow formatına uygun (DTO'da ayarlamıştık)
        if (data.nodes) setNodes(data.nodes)
        if (data.edges) setEdges(data.edges)
        
        // Design adını güncelle (DTO'da varsa, yoksa varsayılan)
        // Not: Şu anki DTO yapımızda GetById sadece node ve edge dönüyor, 
        // eğer designName'i de dönmesini istersen Backend DTO'yu güncellemen gerekebilir.
        // Şimdilik varsayılan kalabilir veya backend'i güncelleyebiliriz.

        // Node sayacını güncelle
        if (data.nodes) {
            const counts = computeCountsFromNodes(data.nodes);
            setNodeCounts(counts);
        }

      } catch (error) {
        console.error("Yükleme hatası:", error);
        setSaveMessage({ type: 'error', text: 'Veri yüklenemedi' });
      }
    }

    loadFlowDesign();
  }, [computeCountsFromNodes, setNodes, setEdges])

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'step',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#1d4ed8' },
          },
          eds
        )
      ),
    [setEdges]
  )

  // --- YENİ DÜĞÜM EKLEME ---
  const addNodeAtPosition = useCallback(
    (position) => {
      if (!selectedNodeType) return

      setNodeCounts((prev) => {
        const nextCount = prev[selectedNodeType] + 1
        const newNode = {
          id: `${selectedNodeType}-${nextCount}`, // Geçici Frontend ID'si
          type: selectedNodeType,
          position,
          data: {
            label: selectedNodeType === 'start' ? 'Başlangıç' : selectedNodeType === 'decision' ? 'Karar' : 'Adım',
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
      if (!selectedNodeType || !reactFlowInstance || connectionMode) return
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      addNodeAtPosition(position)
    },
    [addNodeAtPosition, reactFlowInstance, selectedNodeType, connectionMode]
  )

  // --- TOOLBAR İŞLEMLERİ ---
  const handleSelectType = useCallback((type) => {
      setSelectedNodeType((current) => {
        const isSameType = current === type
        if (!isSameType) {
          setConnectionMode(false)
          setConnectionSource(null)
        }
        return isSameType ? null : type
      })
    }, [setConnectionMode, setConnectionSource])

  const toggleConnectionMode = useCallback(() => {
    setSelectedNodeType(null)
    setConnectionMode((active) => {
      if (active) setConnectionSource(null)
      return !active
    })
  }, [])

  const handleNodeClick = useCallback((event, node) => {
      if (!connectionMode) return
      event.preventDefault()
      event.stopPropagation()
      setSelectedNodeType(null)

      setConnectionSource((currentSource) => {
        if (!currentSource) return node.id
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
              markerEnd: { type: MarkerType.ArrowClosed, color: '#1d4ed8' },
            },
            eds
          )
        )
        setConnectionMode(false)
        return null
      })
    }, [connectionMode, setEdges, setSelectedNodeType])

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

  const handleLabelInputChange = useCallback((event) => {
      const value = event.target.value
      setLabelEditorValue(value)
      if (!activeNodeId) return
      setNodes((nds) =>
        nds.map((node) =>
          node.id === activeNodeId ? { ...node, data: { ...node.data, label: value } } : node
        )
      )
    }, [activeNodeId, setNodes])

  // --- VERİ DÖNÜŞÜMÜ VE KAYDETME (CREATE/UPDATE) ---
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveMessage(null)

    // 1. React Flow verisini Backend DTO formatına çevir
    // Backend DTO: { designName, nodes: [{ x, y, label, type }], edges: [{ source, target, label }] }
    const payload = {
        designName: designName,
        nodes: nodes.map(node => ({
            label: node.data.label,
            type: node.type,
            // React Flow 'position' objesi kullanır, Backend düz X ve Y ister
            x: node.position.x, 
            y: node.position.y
        })),
        edges: edges.map(edge => ({
            source: edge.source,
            target: edge.target,
            label: edge.label || "" // Edge label opsiyonel
        }))
    }

    try {
      let url = API_ROUTES.WORKFLOW.CREATE
      let method = 'POST'

      // ID varsa Update moduna geç
      if (flowId) {
        url = API_ROUTES.WORKFLOW.UPDATE(flowId)
        method = 'PUT'
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Hata: ${errText || response.statusText}`);
      }

      // 2. Backend'den dönen GÜNCEL veriyi al
      // (Full Replacement yaptığımız için Node ID'leri değişti, yenilerini almalıyız!)
      const result = await response.json()

      // 3. State'i backend verisiyle güncelle
      // Bu sayede ekrandaki node'ların ID'leri backend ID'leriyle senkronize olur
      if(result.nodes) setNodes(result.nodes)
      if(result.edges) setEdges(result.edges)
      
      // Design ID'yi sakla (Create ise yeni oluştu)
      if (!flowId && result.nodes && result.nodes.length > 0) {
          // Backend response'da Design ID dönmüyor olabilir, nodes üzerinden kontrol edebiliriz 
          // Veya Create işlemi DesignDto dönmeli. 
          // Eğer backend GetFlowDesignById dönüyorsa sorun yok.
          // Biz ID'yi localstorage'a kaydedelim ama result içinde root ID yoksa 
          // backend response'unu kontrol etmemiz gerekebilir.
          
          // Şimdilik update mantığımız çalıştığı için flowId değişmiyor ama
          // Create işleminden sonra ID'yi yakalamak için backend create metodundan ID dönmesi önemli.
          // Varsayım: Backend DTO dönüyor ama Design ID içinde yoksa, URL'den alamayız.
          // ** Backend Create metodu Design ID içeren bir DTO dönmeli. **
      }
      
      // Create işlemi sonrası URL'den veya response'dan ID'yi yakalamak için 
      // Backend'de Create işleminde "CreatedAtAction" kullandık, header'dan location alabiliriz 
      // Veya result'un kendisi DTO ise ve içinde ID yoksa bu kısım eksik kalabilir.
      // Çözüm: Eğer ilk kayıtsa, dönen verideki Node'lardan birinin ID'sini değil,
      // Response Header'dan veya backend'i güncelleyerek DesignId almalıyız.
      // Şimdilik "Update" yaparken FlowId zaten var. "Create" yaparken
      // sunucudan dönen veriyi kullanıyoruz.

      // Create işleminden sonra ID'yi almanın pratik yolu:
      // Backend Create metodu FlowDesignDto dönüyor. Buna DesignId alanı eklemek en temizidir.
      // Ama eklemediysek; update işlemi için backend tarafında flowId'ye ihtiyacımız var.
      // Geçici çözüm: İlk create'den sonra ID'yi manuel set edemiyorsak, 
      // kullanıcıya "Kaydedildi" deyip ID'yi bir şekilde almamız lazım.
      // *Backend'de FlowDesignDto'ya 'Id' alanı eklemeni şiddetle öneririm.*
      
      // Şimdilik elimizdeki logic ile devam:
      setSaveMessage({ type: 'success', text: 'Başarıyla kaydedildi.' })

    } catch (error) {
      console.error('Kaydetme hatası:', error)
      setSaveMessage({ type: 'error', text: 'Kaydedilemedi: ' + error.message })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }, [edges, nodes, designName, flowId, setNodes, setEdges])

  // --- SİLME (DELETE) ---
  const handleDeleteRemote = useCallback(async () => {
    if (!flowId) return
    if (!window.confirm('Bu akışı sunucudan silmek istediğinize emin misiniz?')) return

    setIsSaving(true)
    try {
      const response = await fetch(API_ROUTES.WORKFLOW.DELETE(flowId), {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Silme işlemi başarısız.')

      setFlowId(null)
      setNodes([])
      setEdges([])
      setDesignName("Yeni Akış Tasarımı")
      window.localStorage.removeItem(STORAGE_FLOW_ID_KEY)
      setSaveMessage({ type: 'success', text: 'Sunucudan silindi.' })
    } catch (error) {
      console.error('Silme hatası:', error)
      setSaveMessage({ type: 'error', text: 'Silinemedi!' })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }, [flowId, setNodes, setEdges])

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
        
        {/* --- TASARIM ADI INPUT --- */}
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