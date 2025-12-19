import { useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import StartNode from "./Start/StartNode";
import DecisionNode from "./Decision/DecisionNode";
import StepNode from "./Step/StepNode";
import StepEdge from "./Step/StepEdge";
import "./NotesFlow.css";

import axiosClient from "../../config/axiosClient";
import { API_ROUTES } from "../../config/apiConfig";

const STORAGE_FLOW_ID_KEY = "notes-flow-id";

const nodeTypes = {
  start: StartNode,
  decision: DecisionNode,
  step: StepNode,
};

const normalizeEdges = (apiEdges = []) =>
  apiEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "step",
    label: e.label || "",
    data: { label: e.label || "" },
    // Var olan tüm bağlantılara da ok ucu ekleyelim
    markerEnd: { type: MarkerType.ArrowClosed, color: "#1d4ed8" },
  }));

const edgeTypes = {
  step: StepEdge,
};

// Belirli bir type için mevcut node'lara göre bir sonraki id'yi üretir
const getNextTypeId = (type, nodes) => {
  const count = nodes.filter((n) => n.type === type).length;
  return `${type}-${count + 1}`;
};

export default function NotesFlow({
  flowId: propFlowId,
  onClose,
  onSaveSuccess,
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [designName, setDesignName] = useState("Yeni Akış Tasarımı");
  const [nodeCounts, setNodeCounts] = useState({
    start: 0,
    decision: 0,
    step: 0,
  });

  const [selectedNodeType, setSelectedNodeType] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectionSource, setConnectionSource] = useState(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [labelEditorValue, setLabelEditorValue] = useState("");
  const [flowId, setFlowId] = useState(propFlowId || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const computeCountsFromNodes = useCallback((nodeList) => {
    const counts = { start: 0, decision: 0, step: 0 };
    nodeList.forEach((node) => {
      const { type, id } = node;
      if (!(type in counts)) counts[type] = 0;
      const match = id.match(/^(start|decision|step)-(\d+)$/);
      if (match) {
        const [, matchedType, index] = match;
        counts[matchedType] = Math.max(counts[matchedType], Number(index));
      } else if (type in counts) {
        counts[type] += 1;
      }
    });
    return counts;
  }, []);

  // --- VERİ YÜKLEME ---
  useEffect(() => {
    const loadFlowDesign = async () => {
      let targetId = propFlowId;

      if (propFlowId === undefined) {
        targetId = window.localStorage.getItem(STORAGE_FLOW_ID_KEY);
      }

      if (!targetId) {
        setFlowId(null);
        setNodes([]);
        setEdges([]);
        setDesignName("Yeni Akış Tasarımı");
        setNodeCounts({ start: 0, decision: 0, step: 0 });
        return;
      }

      setFlowId(targetId);

      try {
        const response = await axiosClient.get(
          API_ROUTES.WORKFLOW.GET_BY_ID(targetId)
        );
        const data = response.data;

        if (data.nodes) setNodes(data.nodes);
        if (data.edges) {
          setEdges(normalizeEdges(data.edges));
        }

        if (data.designName) setDesignName(data.designName);

        if (data.nodes) {
          const counts = computeCountsFromNodes(data.nodes);
          setNodeCounts(counts);
        }
      } catch (error) {
        console.error("Yükleme hatası:", error);
        if (error.response && error.response.status === 404) {
          if (propFlowId === undefined) {
            window.localStorage.removeItem(STORAGE_FLOW_ID_KEY);
          }
          setFlowId(null);
        } else {
          setSaveMessage({ type: "error", text: "Veri yüklenemedi" });
        }
      }
    };

    loadFlowDesign();
  }, [propFlowId, computeCountsFromNodes, setNodes, setEdges]);

  const onConnect = useCallback((params) => {
    console.log("onConnect params:", params);
    console.log("current node ids:", (reactFlowInstance?.getNodes() || nodes).map(n => n.id));
    setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "step",
            markerEnd: { type: MarkerType.ArrowClosed, color: "#1d4ed8" },
          },
          eds
        )
      )
  }, [reactFlowInstance, nodes]);

  const addNodeAtPosition = useCallback(
    (position) => {
      if (!selectedNodeType) return;
      setNodes((nds) => {
        const newId = getNextTypeId(selectedNodeType, nds);
        const newNode = {
          id: newId,
          type: selectedNodeType,
          position,
          data: {
            label:
              selectedNodeType === "start"
                ? "Başlangıç"
                : selectedNodeType === "decision"
                ? "Karar"
                : "Adım",
          },
        };
        return nds.concat(newNode);
      });
      // Mevcut sayaç state'ini de güncel tutalım (ileride gösterim için kullanılabilir)
      setNodeCounts((prev) => ({
        ...prev,
        [selectedNodeType]: prev[selectedNodeType] + 1,
      }));
      setSelectedNodeType(null);
    },
    [selectedNodeType, setNodes, setSelectedNodeType]
  );

  const handlePaneClick = useCallback(
    (event) => {
      if (!selectedNodeType || !reactFlowInstance || connectionMode) return;
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNodeAtPosition(position);
    },
    [addNodeAtPosition, reactFlowInstance, selectedNodeType, connectionMode]
  );

  // --- TOOLBAR HANDLERS ---
  const handleSelectType = useCallback((type) => {
    setSelectedNodeType((current) => {
      const isSameType = current === type;
      if (!isSameType) {
        setConnectionMode(false);
        setConnectionSource(null);
      }
      return isSameType ? null : type;
    });
  }, []);

  const toggleConnectionMode = useCallback(() => {
    setSelectedNodeType(null);
    setConnectionMode((active) => {
      if (active) setConnectionSource(null);
      return !active;
    });
  }, []);

  const handleNodeClick = useCallback(
    (event, node) => {
      if (!connectionMode) return;
      event.preventDefault();
      event.stopPropagation();
      setSelectedNodeType(null);
      setConnectionSource((currentSource) => {
        if (!currentSource) return node.id;
        if (currentSource === node.id) {
          setConnectionMode(false);
          return null;
        }
        setEdges((eds) =>
          addEdge(
            {
              id: `manual-${currentSource}-${node.id}-${Date.now()}`,
              source: currentSource,
              target: node.id,
              type: "step",
              markerEnd: { type: MarkerType.ArrowClosed, color: "#1d4ed8" },
            },
            eds
          )
        );
        setConnectionMode(false);
        return null;
      });
    },
    [connectionMode, setEdges]
  );

  const handleSelectionChange = useCallback(({ nodes: selected }) => {
    const selectedNodes = selected ?? [];
    const ids = selectedNodes.map((node) => node.id);
    setSelectedNodeIds(ids);
    if (selectedNodes.length === 1) {
      setActiveNodeId(selectedNodes[0].id);
      setLabelEditorValue(selectedNodes[0].data?.label || "");
    } else {
      setActiveNodeId(null);
      setLabelEditorValue("");
    }
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    setNodes((nds) => nds.filter((node) => !selectedNodeIds.includes(node.id)));
    setEdges((eds) =>
      eds.filter(
        (edge) =>
          !selectedNodeIds.includes(edge.source) &&
          !selectedNodeIds.includes(edge.target)
      )
    );
    setSelectedNodeIds([]);
    setActiveNodeId(null);
    setLabelEditorValue("");
  }, [selectedNodeIds, setEdges, setNodes]);

  const handleLabelInputChange = useCallback(
    (event) => {
      const value = event.target.value;
      setLabelEditorValue(value);
      if (!activeNodeId) return;
      setNodes((nds) =>
        nds.map((node) =>
          node.id === activeNodeId
            ? { ...node, data: { ...node.data, label: value } }
            : node
        )
      );
    },
    [activeNodeId, setNodes]
  );
  

  // --- KAYDETME ---
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage(null);

    const currentNodes = reactFlowInstance
      ? reactFlowInstance.getNodes()
      : nodes;
    const currentEdges = reactFlowInstance
      ? reactFlowInstance.getEdges()
      : edges;

    const nodeIds = new Set(currentNodes.map((n) => n.id));

    const validEdges = currentEdges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    const invalidEdges = currentEdges.filter(
      (e) => !nodeIds.has(e.source) || !nodeIds.has(e.target)
    );
    if (invalidEdges.length) {
      console.warn("Geçersiz edge bulundu, kaydetmiyorum:", invalidEdges);
    }

    const payload = {
      designName,
      nodes: nodes.map(node => ({
        id: node.id,
        label: node.data.label,
        type: node.type,
        x: node.position.x,
        y: node.position.y
      })),
      // Sadece geçerli edge'leri sunucuya gönder
      edges: validEdges.map((e) => ({
        source: e.source,
        target: e.target,
        label: e.label || "",
      })),
    };

    try {
      let url = API_ROUTES.WORKFLOW.CREATE;
      let axiosMethod = axiosClient.post;

      if (flowId) {
        url = API_ROUTES.WORKFLOW.UPDATE(flowId);
        axiosMethod = axiosClient.put;
      }

      const response = await axiosMethod(url, payload);
      const result = response.data;

      if (result.nodes) setNodes(result.nodes);
      if (result.edges) setEdges(normalizeEdges(result.edges));

      if (!flowId && result.id) {
        setFlowId(result.id);
        if (propFlowId === undefined) {
          window.localStorage.setItem(STORAGE_FLOW_ID_KEY, result.id);
        }
      }

      setSaveMessage({ type: "success", text: "Başarıyla kaydedildi." });

      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      console.error("Kaydetme hatası:", error);
      const message = error.response?.data?.message || error.message;
      setSaveMessage({ type: "error", text: "Kaydedilemedi: " + message });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }, [
    edges,
    nodes,
    designName,
    flowId,
    setNodes,
    setEdges,
    propFlowId,
    onSaveSuccess,
    reactFlowInstance,
  ]);

  // --- SİLME ---
  const handleDeleteRemote = useCallback(async () => {
    if (!flowId) return;
    if (!window.confirm("Bu akışı sunucudan silmek istediğinize emin misiniz?"))
      return;

    setIsSaving(true);
    try {
      await axiosClient.delete(API_ROUTES.WORKFLOW.DELETE(flowId));

      setFlowId(null);
      setNodes([]);
      setEdges([]);
      setDesignName("Yeni Akış Tasarımı");

      if (propFlowId === undefined) {
        window.localStorage.removeItem(STORAGE_FLOW_ID_KEY);
      }

      setSaveMessage({ type: "success", text: "Sunucudan silindi." });

      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      console.error("Silme hatası:", error);
      setSaveMessage({ type: "error", text: "Silinemedi!" });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }, [flowId, setNodes, setEdges, propFlowId, onSaveSuccess]);

  const shapeOptions = [
    { type: "start", label: "Başlangıç" },
    { type: "decision", label: "Karar" },
    { type: "step", label: "Adım" },
  ];

  const renderShapePreview = (type) => (
    <div className={`shape-preview shape-preview--${type}`} />
  );

  const canvasClassName = [
    "notes-flow-canvas",
    selectedNodeType && !connectionMode ? "notes-flow-canvas--placing" : "",
    connectionMode ? "notes-flow-canvas--connecting" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="notes-flow-wrapper">
      {/* 1. HEADER KISMI: Genel İşlemler */}
      <div className="notes-flow-header">
        <div className="notes-flow-header__left">
          {onClose && (
            <button
              onClick={onClose}
              className="notes-flow-header__back-btn"
              title="Kapat / Geri Dön"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <input
            type="text"
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            className="notes-flow-header__title-input"
            placeholder="Tasarım Adı Giriniz"
          />
          {flowId && (
            <span className="text-xs text-slate-400 font-mono">#{flowId}</span>
          )}
        </div>

        <div className="notes-flow-header__right">
          {saveMessage && (
            <span
              className={`text-sm px-3 py-1 rounded font-medium ${
                saveMessage.type === "success"
                  ? "bg-green-50 text-green-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {saveMessage.text}
            </span>
          )}

          {flowId && (
            <button
              onClick={handleDeleteRemote}
              disabled={isSaving}
              className="notes-flow-tool-btn text-red-600 hover:bg-red-50 border-transparent"
              title="Bu tasarımı tamamen sil"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              <span className="hidden sm:inline">Sil</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              isSaving
                ? "bg-slate-100 text-slate-400 cursor-wait"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            }`}
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-current"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>{flowId ? "Güncelle" : "Kaydet"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. ARAÇ ÇUBUĞU: Çizim İşlemleri */}
      <div className="notes-flow-tools">
        {/* Şekil Ekleme Grubu */}
        <div className="notes-flow-tool-group">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 hidden sm:inline">
            Şekiller
          </span>
          {shapeOptions.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => handleSelectType(option.type)}
              className={`notes-flow-tool-btn ${
                selectedNodeType === option.type
                  ? "notes-flow-tool-btn--active"
                  : ""
              }`}
              title={`${option.label} Ekle`}
            >
              {renderShapePreview(option.type)}
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Bağlantı Grubu */}
        <div className="notes-flow-tool-group">
          <button
            type="button"
            onClick={toggleConnectionMode}
            className={`notes-flow-tool-btn ${
              connectionMode ? "notes-flow-tool-btn--active" : ""
            }`}
            title="Bağlantı Modunu Aç/Kapat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <span className="hidden sm:inline">
              {connectionMode ? "Bağlantı Aktif" : "Bağla"}
            </span>
          </button>
        </div>

        {/* Düzenleme Grubu */}
        <div className="notes-flow-tool-group">
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedNodeIds.length === 0}
            className="notes-flow-tool-btn text-slate-600 hover:text-red-600"
            title="Seçili elemanları sil"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>

        {/* Etiket Editörü (Dinamik) */}
        {activeNodeId && (
          <div className="notes-flow-label-editor">
            <span>Etiket:</span>
            <input
              type="text"
              value={labelEditorValue}
              onChange={handleLabelInputChange}
              placeholder="Etiket yaz..."
              autoFocus
            />
          </div>
        )}
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
          nodeStrokeColor={() => "#1e293b"}
          nodeStrokeWidth={2}
          nodeColor={() => "#bfdbfe"}
        />
        <Controls />
        <Background variant="lines" gap={18} size={1} color="#dbeafe" />
      </ReactFlow>

      {/* Ok yönü için küçük açıklama */}
      <div className="mt-2 text-[11px] text-slate-400">
        Bağlantı yönü: çizgiyi başlattığınız düğümden (kaynak) bıraktığınız düğüme (hedef) doğru okunur.
      </div>
    </div>
  );
}
