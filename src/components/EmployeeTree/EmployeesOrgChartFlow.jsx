import React, { useMemo, useCallback, useState } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import useEmployeeTree from './useEmployeeTree';

function EmployeeCardNode({ data }) {
  const { employee, isMatched, isSelected } = data || {};

  const base =
    'rounded-lg border bg-white shadow-sm px-3 py-2 text-[11px] sm:text-xs leading-tight';
  const border = isSelected
    ? 'border-blue-600 ring-1 ring-blue-400'
    : isMatched
    ? 'border-amber-400 ring-1 ring-amber-300'
    : 'border-slate-200';

  if (!employee) return null;

  return (
    <div className={`${base} ${border}`}>
      <Handle
        type="target"
        id="t"
        position={Position.Top}
        style={{ width: 6, height: 6, background: '#94a3b8' }}
      />
      <Handle
        type="source"
        id="b"
        position={Position.Bottom}
        style={{ width: 6, height: 6, background: '#94a3b8' }}
      />
      <div className="font-semibold text-slate-800 truncate">
        {employee.fullName}
      </div>
      <div className="text-[10px] text-slate-500">
        {employee.jobTitle} • {employee.department}
      </div>
      <div className="mt-1 text-[10px] text-slate-400">
        ID: {employee.employeeId}
        {employee.managerId != null && ` • Manager: ${employee.managerId}`}
      </div>
    </div>
  );
}

const nodeTypes = {
  employeeCard: EmployeeCardNode,
};

function buildGraph(tree, matchedIds, selectedNodeId) {
  const nodes = [];
  const edges = [];
  const edgeKeys = new Set();
  const levels = new Map(); // depth -> [id]
  const nodeById = new Map();

  const addEdgeUnique = (sourceId, targetId) => {
    const key = `${sourceId}-${targetId}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);

    edges.push({
      id: `e-${key}`,
      source: String(sourceId),
      sourceHandle: 'b',
      target: String(targetId),
      targetHandle: 't',
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
    });
  };

  const traverse = (node, depth = 0, parentId = null) => {
    const id = node.employeeId;
    nodeById.set(id, node);

    if (!levels.has(depth)) levels.set(depth, []);
    levels.get(depth).push(id);

    if (parentId != null) {
      addEdgeUnique(parentId, id);
    }

    if (Array.isArray(node.children) && node.children.length > 0) {
      node.children.forEach((child) => traverse(child, depth + 1, id));
    }
  };

  tree.forEach((root) => traverse(root, 0, null));

  // Path tabanlı bağlantılar: /5/6/9/10/ -> 5-6, 6-9, 9-10
  nodeById.forEach((node) => {
    if (!node.path || typeof node.path !== 'string') return;
    const parts = node.path
      .split('/')
      .filter(Boolean)
      .map((p) => Number(p))
      .filter((n) => Number.isFinite(n));

    for (let i = 0; i < parts.length - 1; i += 1) {
      const sourceId = parts[i];
      const targetId = parts[i + 1];
      if (!nodeById.has(sourceId) || !nodeById.has(targetId)) continue;
      addEdgeUnique(sourceId, targetId);
    }
  });

  const horizontalGap = 220;
  const verticalGap = 140;

  levels.forEach((ids, depth) => {
    const totalWidth = (ids.length - 1) * horizontalGap;
    ids.forEach((id, index) => {
      const employee = nodeById.get(id);
      const x = index * horizontalGap - totalWidth / 2;
      const y = depth * verticalGap;

      nodes.push({
        id: String(id),
        type: 'employeeCard',
        position: { x, y },
        data: {
          employee,
          isMatched: matchedIds.has(id),
          isSelected: selectedNodeId === id,
        },
      });
    });
  });

  return { nodes, edges };
}

function EmployeesOrgChartFlow() {
  const {
    tree,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    matchedIds,
    selectedNode,
    selectedNodeId,
    selectNode,
    refetch,
    createEmployee,
  } = useEmployeeTree();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addError, setAddError] = useState(null);
  const [form, setForm] = useState({
    fullName: '',
    jobTitle: '',
    department: '',
    managerId: '',
  });

  const { nodes, edges } = useMemo(
    () => buildGraph(tree || [], matchedIds, selectedNodeId),
    [tree, matchedIds, selectedNodeId]
  );

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleNodeClick = useCallback(
    (_, node) => {
      if (node?.data?.employee) {
        selectNode(node.data.employee);
      }
    },
    [selectNode]
  );

  const openAddModal = () => {
    setAddError(null);
    setIsAddOpen(true);
  };

  const closeAddModal = () => {
    setIsAddOpen(false);
    setAddError(null);
    setForm({
      fullName: '',
      jobTitle: '',
      department: '',
      managerId: selectedNodeId ? String(selectedNodeId) : '',
    });
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = form.fullName.trim();
    if (!trimmedName) {
      setAddError('Ad Soyad zorunludur.');
      return;
    }

    try {
      setAddError(null);
      await createEmployee({
        fullName: trimmedName,
        jobTitle: form.jobTitle,
        department: form.department,
        managerId: form.managerId,
      });
      closeAddModal();
      refetch();
    } catch (err) {
      const status = err?.response?.status;
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;

      if (status === 401) {
        setAddError('Oturum süreniz dolmuş. Lütfen yeniden giriş yapın.');
      } else {
        setAddError(
          backendMessage ||
            'Çalışan oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.'
        );
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row h-full">
      {/* Sol: Arama + React Flow */}
      <section className="md:flex-[2] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1 max-w-md">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="9"
                  cy="9"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M12.5 12.5L15 15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="İsim / Ünvan / Departman ara…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={refetch}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          >
            Yenile
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Yeni Çalışan
          </button>
        </div>

        <div className="relative mt-1 h-80 sm:h-96 rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
                Veriler yükleniyor…
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
              <div className="max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-sm">
                <div className="mb-1 font-semibold">Bir hata oluştu</div>
                <div>{error}</div>
              </div>
            </div>
          )}

          {!loading && !error && nodes.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <p className="text-xs text-slate-500">
                Henüz çalışan verisi bulunamadı.
              </p>
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25, maxZoom: 1.4 }}
            onNodeClick={handleNodeClick}
          >
            <Controls />
            <Background variant="dots" gap={16} size={1} color="#dbeafe" />
          </ReactFlow>
        </div>
      </section>

      {/* Sağ: Detay paneli */}
      <aside className="md:flex-1 rounded-xl border border-slate-200 bg-white/90 p-3 sm:p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Çalışan Detayları
        </h2>
        {!selectedNode && (
          <p className="text-xs text-slate-500">
            Soldaki organizasyon şemasından bir çalışan seçtiğinizde detayları
            burada görünecek.
          </p>
        )}

        {selectedNode && (
          <div className="space-y-2 text-xs text-slate-700">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                Ad Soyad
              </div>
              <div className="font-semibold text-slate-900">
                {selectedNode.fullName}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Ünvan
                </div>
                <div>{selectedNode.jobTitle}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Departman
                </div>
                <div>{selectedNode.department}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Çalışan ID
                </div>
                <div>{selectedNode.employeeId}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Yöneticisi (ManagerId)
                </div>
                <div>
                  {selectedNode.managerId != null
                    ? selectedNode.managerId
                    : '-'}
                </div>
              </div>
            </div>

            {selectedNode.path && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Path
                </div>
                <div className="break-all text-[11px] text-slate-600">
                  {selectedNode.path}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Yeni Çalışan Modalı */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Yeni Çalışan Ekle
              </h3>
              <button
                type="button"
                onClick={closeAddModal}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Ad Soyad
                </label>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Örn: Ali Veli"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-slate-700">
                    Ünvan
                  </label>
                  <input
                    name="jobTitle"
                    value={form.jobTitle}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Örn: Yazılım Geliştirici"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">
                    Departman
                  </label>
                  <input
                    name="department"
                    value={form.department}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Örn: IT"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Yönetici (Manager)
                </label>
                <select
                  name="managerId"
                  value={form.managerId}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Yönetici yok (root seviye)</option>
                  {tree.map((root) => (
                    <React.Fragment key={root.employeeId}>
                      <option value={root.employeeId}>
                        {root.fullName} (ID: {root.employeeId})
                      </option>
                      {Array.isArray(root.children) &&
                        root.children.map((child) => (
                          <option key={child.employeeId} value={child.employeeId}>
                            └ {child.fullName} (ID: {child.employeeId})
                          </option>
                        ))}
                    </React.Fragment>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Kaydet (Local)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeesOrgChartFlow;


