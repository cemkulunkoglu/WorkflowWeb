import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import useEmployeeTree from './useEmployeeTree';
import { getDetail, updateEmployee, deleteEmployee, getEmployeeAncestors } from '../../services/employeeApi';
import EmployeeAncestorsPanel from './EmployeeAncestorsPanel';
import { useAuth } from '../../auth/AuthContext';
import { AuthService } from '../../services/authService';
import { confirmToast } from '../../utils/notify';
import { Button } from '@mui/material';
import { Alert } from '@mui/material';

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

function flattenEmployees(tree) {
  const result = [];

  const walk = (nodes) => {
    nodes.forEach((node) => {
      result.push(node);
      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children);
      }
    });
  };

  walk(tree || []);
  return result;
}

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
  } = useEmployeeTree();

  const { isAdmin } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [provisionError, setProvisionError] = useState(null);
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionResult, setProvisionResult] = useState(null);
  const [provisionForm, setProvisionForm] = useState({
    userName: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    jobTitle: '',
    department: '',
    managerId: '',
  });

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [ancestors, setAncestors] = useState([]);
  const [ancestorsLoading, setAncestorsLoading] = useState(false);
  const [ancestorsError, setAncestorsError] = useState(null);
  const [depth, setDepth] = useState(10);
  const [includeSelf, setIncludeSelf] = useState(false);
  const ancestorsCacheRef = useRef(new Map());

  const maxDepthForSelected = useMemo(() => {
    // detail.path ör: "/5/6/17/" (root->...->selected). Buradan gerçek üst sayısını çıkarabiliriz.
    const path = detail?.path;
    if (!path) return 10;
    const ids = path
      .split('/')
      .filter(Boolean)
      .map((p) => Number(p))
      .filter((n) => Number.isFinite(n));

    if (!ids.length) return 10;

    const totalIncludingSelf = ids.length;
    const max = includeSelf ? totalIncludingSelf : totalIncludingSelf - 1;
    return Math.max(1, max);
  }, [detail, includeSelf]);

  // Seçili çalışanın gerçek üst sayısına göre depth'i clamp et
  useEffect(() => {
    setDepth((prev) => Math.min(Math.max(1, prev), maxDepthForSelected));
  }, [maxDepthForSelected]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    sicilNo: '',
    jobTitle: '',
    department: '',
    managerId: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Başarı mesajını bir süre sonra otomatik gizle
  useEffect(() => {
    if (!feedbackMessage) return;

    const timeoutId = window.setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedbackMessage]);

  const allEmployees = useMemo(() => flattenEmployees(tree), [tree]);

  const managerName = useMemo(() => {
    if (!detail) return null;
    if (detail.managerId === null || typeof detail.managerId === 'undefined') return null;
    const mgr = allEmployees.find((e) => e.employeeId === detail.managerId);
    return mgr?.fullName || null;
  }, [detail, allEmployees]);

  const detailHierarchy = useMemo(() => {
    if (!detail || !detail.path) return [];

    const ids = detail.path
      .split('/')
      .filter(Boolean)
      .map((p) => Number(p))
      .filter((n) => Number.isFinite(n));

    if (!ids.length) return [];

    // Ör: /5/6/17/ -> [17, 6, 5] (seçili çalışan en üstte)
    return ids
      .map((id) => {
        const emp = allEmployees.find((e) => e.employeeId === id);
        return {
          id,
          name: emp?.fullName || `ID ${id}`,
        };
      })
      .reverse();
  }, [detail, allEmployees]);

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
    setProvisionError(null);
    setProvisionResult(null);
    setProvisionForm((prev) => ({
      ...prev,
      managerId: selectedNodeId ? String(selectedNodeId) : prev.managerId,
    }));
    setIsAddOpen(true);
  };

  const closeAddModal = () => {
    setIsAddOpen(false);
    setProvisionError(null);
    setProvisionLoading(false);
    setProvisionResult(null);
    setProvisionForm({
      userName: '',
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      jobTitle: '',
      department: '',
      managerId: selectedNodeId ? String(selectedNodeId) : '',
    });
  };

  const handleProvisionChange = (event) => {
    const { name, value } = event.target;
    setProvisionForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProvisionSubmit = async (event) => {
    event.preventDefault();
    setProvisionError(null);
    setProvisionResult(null);

    if (!isAdmin) {
      setProvisionError('Yetkin yok. Bu işlem sadece admin kullanıcılar içindir.');
      return;
    }

    const payload = {
      userName: provisionForm.userName.trim(),
      email: provisionForm.email.trim(),
      firstName: provisionForm.firstName.trim(),
      lastName: provisionForm.lastName.trim(),
      phone: provisionForm.phone.trim() || null,
      jobTitle: provisionForm.jobTitle.trim() || null,
      department: provisionForm.department.trim() || null,
      managerId:
        provisionForm.managerId === '' ? 0 : Number(provisionForm.managerId),
    };

    if (!payload.userName || !payload.email || !payload.firstName || !payload.lastName) {
      setProvisionError('userName, email, firstName ve lastName zorunludur.');
      return;
    }

    setProvisionLoading(true);
    try {
      const res = await AuthService.provisionEmployee(payload);
      setProvisionResult(res);
      // Tree tarafı internal olarak oluştuğu için UI’yı güncellemek adına refetch.
      refetch();
      // Formu resetle (managerId kalsın)
      setProvisionForm((prev) => ({
        ...prev,
        userName: '',
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        jobTitle: '',
        department: '',
      }));
    } catch (err) {
      setProvisionError(err?.message || 'Çalışan provision edilemedi.');
    } finally {
      setProvisionLoading(false);
    }
  };

  // Detay verisini seçili employee için çek
  useEffect(() => {
    if (!selectedNodeId) {
      setDetail(null);
      setDetailError(null);
      setIsEditing(false);
      return;
    }

    let isCancelled = false;

    const fetchDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const data = await getDetail(selectedNodeId);
        if (isCancelled) return;
        setDetail(data);
        setIsEditing(false);
      } catch (err) {
        if (isCancelled) return;
        const status = err?.response?.status;
        const backendMessage =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message;

        if (status === 401) {
          setDetailError('Oturum süresi doldu, tekrar giriş yapın.');
        } else {
          setDetailError(
            backendMessage ||
              `Çalışan detayı alınırken bir hata oluştu${
                status ? ` (HTTP ${status})` : ''
              }.`
          );
        }
      } finally {
        if (!isCancelled) {
          setDetailLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      isCancelled = true;
    };
  }, [selectedNodeId]);

  // Üst zinciri (breadcrumb) için ancestors çek
  useEffect(() => {
    if (!selectedNodeId) {
      setAncestors([]);
      setAncestorsError(null);
      setAncestorsLoading(false);
      return;
    }

    let isCancelled = false;
    const cacheKey = `${selectedNodeId}|${depth}|${includeSelf ? '1' : '0'}`;
    const cached = ancestorsCacheRef.current.get(cacheKey);
    if (cached) {
      setAncestors(cached);
      setAncestorsError(null);
      setAncestorsLoading(false);
      return;
    }

    const fetchAncestors = async () => {
      setAncestorsLoading(true);
      setAncestorsError(null);
      try {
        const data = await getEmployeeAncestors(selectedNodeId, depth, includeSelf);
        if (isCancelled) return;
        const safe = Array.isArray(data) ? data : [];
        ancestorsCacheRef.current.set(cacheKey, safe);
        setAncestors(safe);
      } catch (err) {
        if (isCancelled) return;
        const status = err?.response?.status;
        const backendMessage =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message;
        if (status === 401) {
          setAncestorsError('Oturum süresi doldu, tekrar giriş yapın.');
        } else {
          setAncestorsError(
            backendMessage ||
              `Üst zinciri alınırken bir hata oluştu${status ? ` (HTTP ${status})` : ''}.`
          );
        }
      } finally {
        if (!isCancelled) setAncestorsLoading(false);
      }
    };

    fetchAncestors();
    return () => {
      isCancelled = true;
    };
  }, [selectedNodeId, depth, includeSelf]);

  const handleStartEdit = () => {
    if (!detail) return;
    const parts = (detail.fullName || '').trim().split(/\s+/);
    const firstName = parts.shift() || '';
    const lastName = parts.join(' ');

    setEditForm({
      firstName,
      lastName,
      phone: detail.phone || '',
      sicilNo: detail.sicilNo || '',
      jobTitle: detail.jobTitle || '',
      department: detail.department || '',
      managerId:
        detail.managerId === null || typeof detail.managerId === 'undefined'
          ? ''
          : String(detail.managerId),
    });
    setFeedbackMessage(null);
    setIsEditing(true);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!selectedNodeId) return;

    setEditSaving(true);
    setFeedbackMessage(null);
    setDetailError(null);

    const payload = {
      // userId UI'da gösterilmez/düzenlenmez; mevcut değeri koruyalım.
      userId:
        detail?.userId === null || typeof detail?.userId === 'undefined'
          ? null
          : Number(detail.userId),
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      phone: editForm.phone.trim() || null,
      sicilNo: editForm.sicilNo.trim() || null,
      jobTitle: editForm.jobTitle.trim() || null,
      department: editForm.department.trim() || null,
      managerId:
        editForm.managerId === '' || editForm.managerId === null
          ? null
          : Number(editForm.managerId),
    };

    try {
      await updateEmployee(selectedNodeId, payload);
      setFeedbackMessage('Çalışan bilgileri başarıyla güncellendi.');
      // Detayı ve ağacı tekrar çek
      const refreshed = await getDetail(selectedNodeId);
      setDetail(refreshed);
      setIsEditing(false);
      refetch();
    } catch (err) {
      const status = err?.response?.status;
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;

      if (status === 401) {
        setDetailError('Oturum süresi doldu, tekrar giriş yapın.');
      } else {
        setDetailError(
          backendMessage ||
            'Çalışan güncellenirken bir hata oluştu. Lütfen tekrar deneyin.'
        );
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNodeId) return;
    const ok = await confirmToast({
      title: 'Çalışan silinsin mi?',
      message: 'Bu çalışan ve tüm alt çalışanları silinecek. Bu işlem geri alınamaz.',
      confirmText: 'Evet, sil',
      cancelText: 'Vazgeç',
      tone: 'error',
    });
    if (!ok) return;

    setDeleteLoading(true);
    setDetailError(null);
    setFeedbackMessage(null);

    try {
      await deleteEmployee(selectedNodeId);
      setFeedbackMessage('Çalışan ve alt çalışanları silindi.');
      // Seçimi temizle
      selectNode(null);
      setDetail(null);
      refetch();
    } catch (err) {
      const status = err?.response?.status;
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;

      if (status === 401) {
        setDetailError('Oturum süresi doldu, tekrar giriş yapın.');
      } else {
        setDetailError(
          backendMessage ||
            'Çalışan silinirken bir hata oluştu. Lütfen tekrar deneyin.'
        );
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // NOT: "Yeni Çalışan" artık WorkflowAPI(7071) üzerinden create etmez.
  // Admin-only provision işlemi AuthServerAPI(7130) /api/Auth/provision-employee ile yapılır.

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
          <Button
            type="button"
            variant="outlined"
            size="small"
            onClick={refetch}
            sx={{ textTransform: 'none' }}
          >
            Yenile
          </Button>
          <Button
            type="button"
            variant="contained"
            size="small"
            onClick={openAddModal}
            sx={{ textTransform: 'none' }}
          >
            Yeni Çalışan
          </Button>
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
              <Alert severity="error" className="max-w-sm shadow-sm">
                <div className="font-semibold mb-1">Bir hata oluştu</div>
                <div>{error}</div>
              </Alert>
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

      {/* Sağ: Üst Zinciri + Detay paneli */}
      <aside className="md:flex-1 flex flex-col gap-4">
        <EmployeeAncestorsPanel
          selectedEmployeeId={selectedNodeId}
          selectedEmployeeLabel={
            detail
              ? `${detail.fullName || '-'} • ${detail.jobTitle || '-'} • ${detail.department || '-'}`
              : selectedNode
              ? `${selectedNode.fullName || '-'} • ${selectedNode.jobTitle || '-'} • ${selectedNode.department || '-'}`
              : ''
          }
          ancestors={ancestors}
          depth={depth}
          maxDepth={maxDepthForSelected}
          includeSelf={includeSelf}
          isLoading={ancestorsLoading}
          error={ancestorsError}
          onDepthChange={setDepth}
          onIncludeSelfChange={setIncludeSelf}
          onCrumbClick={(employeeId) => selectNode({ employeeId })}
        />

        <section className="rounded-xl border border-slate-200 bg-white/90 p-3 sm:p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">
            Çalışan Detayları
          </h2>
          {!selectedNodeId && (
            <p className="text-xs text-slate-500">
              Soldaki organizasyon şemasından bir çalışan seçtiğinizde detayları
              burada görünecek.
            </p>
          )}

        {detailLoading && selectedNodeId && (
          <div className="mt-2 text-xs text-slate-500">Detaylar yükleniyor…</div>
        )}

        {detailError && (
          <Alert severity="error" className="mt-2">
            {detailError}
          </Alert>
        )}

        {feedbackMessage && !detailError && (
          <Alert severity="success" className="mt-2">
            {feedbackMessage}
          </Alert>
        )}

        {selectedNodeId && detail && !isEditing && (
          <div className="mt-2 space-y-2 text-xs text-slate-700">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Ad Soyad
                </div>
                <div className="font-semibold text-slate-900">
                  {detail.fullName}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="contained"
                  size="small"
                  onClick={handleStartEdit}
                  disabled={detailLoading || deleteLoading}
                  sx={{ textTransform: 'none' }}
                >
                  Düzenle
                </Button>
                <Button
                  type="button"
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={handleDelete}
                  disabled={detailLoading || deleteLoading}
                  sx={{ textTransform: 'none' }}
                >
                  {deleteLoading ? 'Siliniyor…' : 'Sil'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Ünvan
                </div>
                <div>{detail.jobTitle || '-'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Departman
                </div>
                <div>{detail.department || '-'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Telefon
                </div>
                <div>{detail.phone || '-'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Sicil No
                </div>
                <div>{detail.sicilNo || '-'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Yönetici
                </div>
                <div>
                  {managerName || '-'}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedNodeId && detail && isEditing && (
          <form
            onSubmit={handleEditSubmit}
            className="mt-2 space-y-3 text-xs text-slate-700"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Ad
                </label>
                <input
                  name="firstName"
                  value={editForm.firstName}
                  onChange={handleEditChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Soyad
                </label>
                <input
                  name="lastName"
                  value={editForm.lastName}
                  onChange={handleEditChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Telefon
                </label>
                <input
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Sicil No
                </label>
                <input
                  name="sicilNo"
                  value={editForm.sicilNo}
                  onChange={handleEditChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Ünvan
                </label>
                <input
                  name="jobTitle"
                  value={editForm.jobTitle}
                  onChange={handleEditChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Departman
                </label>
                <input
                  name="department"
                  value={editForm.department}
                  onChange={handleEditChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Yönetici
                </label>
                  <select
                  name="managerId"
                  value={editForm.managerId}
                  onChange={handleEditChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Yönetici yok</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={() => {
                  setIsEditing(false);
                  setFeedbackMessage(null);
                }}
                disabled={editSaving}
                sx={{ textTransform: 'none' }}
              >
                İptal
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="small"
                disabled={editSaving}
                sx={{ textTransform: 'none' }}
              >
                {editSaving ? 'Kaydediliyor…' : 'Kaydet'}
              </Button>
            </div>
          </form>
        )}
        </section>
      </aside>

      {/* Yeni Çalışan Modalı (AuthServer provision-employee) */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Yeni Çalışan Ekle
                </h3>
              </div>
              <Button
                type="button"
                variant="text"
                onClick={closeAddModal}
                aria-label="Kapat"
                sx={{
                  minWidth: 0,
                  padding: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 9999,
                  textTransform: 'none',
                  color: 'rgba(148, 163, 184, 1)',
                  '&:hover': {
                    color: 'rgba(71, 85, 105, 1)',
                    backgroundColor: 'rgba(241, 245, 249, 1)',
                  },
                }}
              >
                ✕
              </Button>
            </div>

            {!isAdmin ? (
              <Alert severity="warning" className="mb-3">
                Yetkin yok: Bu işlem sadece admin kullanıcılar içindir.
              </Alert>
            ) : null}

            {provisionError && (
              <Alert severity="error" className="mb-3">
                {provisionError}
              </Alert>
            )}

            {provisionResult?.temporaryPassword ? (
              <Alert severity="success" className="mb-3">
                <div className="font-semibold">Temporary Password</div>
                <div className="mt-1 font-mono">{provisionResult.temporaryPassword}</div>
                <div className="mt-2 text-[11px] opacity-80">
                  employeeId: {provisionResult.employeeId} • path: {provisionResult.path}
                </div>
                <Button
                  type="button"
                  variant="contained"
                  color="success"
                  size="small"
                  className="mt-2"
                  sx={{ textTransform: 'none' }}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(provisionResult.temporaryPassword);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Kopyala
                </Button>
              </Alert>
            ) : null}

            <form onSubmit={handleProvisionSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Kullanıcı Adı *</label>
                  <input
                    name="userName"
                    value={provisionForm.userName}
                    onChange={handleProvisionChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    required
                    disabled={provisionLoading}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Email *</label>
                  <input
                    name="email"
                    value={provisionForm.email}
                    onChange={handleProvisionChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    required
                    disabled={provisionLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Ad *</label>
                  <input
                    name="firstName"
                    value={provisionForm.firstName}
                    onChange={handleProvisionChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    required
                    disabled={provisionLoading}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Soyad *</label>
                  <input
                    name="lastName"
                    value={provisionForm.lastName}
                    onChange={handleProvisionChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    required
                    disabled={provisionLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Departman</label>
                  <input
                    name="department"
                    value={provisionForm.department}
                    onChange={handleProvisionChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    disabled={provisionLoading}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Ünvan</label>
                  <input
                    name="jobTitle"
                    value={provisionForm.jobTitle}
                    onChange={handleProvisionChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    disabled={provisionLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Telefon</label>
                  <input
                    name="phone"
                    value={provisionForm.phone}
                    onChange={handleProvisionChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    disabled={provisionLoading}
                  />
                </div>
                <div>
                <label className="mb-1 block font-medium text-slate-700">Yönetici</label>
                <select
                  name="managerId"
                  value={provisionForm.managerId}
                  onChange={handleProvisionChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  disabled={provisionLoading}
                >
                  <option value="0">Yönetici yok</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={closeAddModal}
                  disabled={provisionLoading}
                  sx={{ textTransform: 'none' }}
                >
                  Kapat
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  size="small"
                  disabled={provisionLoading || !isAdmin}
                  sx={{ textTransform: 'none' }}
                >
                  {provisionLoading ? 'Oluşturuluyor…' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default EmployeesOrgChartFlow;


