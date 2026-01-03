import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTree } from '../../services/employeeApi';

// Basit tip dokümantasyonu
// type EmployeeNode = {
//   employeeId: number;
//   fullName: string;
//   jobTitle: string;
//   department: string;
//   managerId: number | null;
//   path: string;
//   children: EmployeeNode[];
// };

function useEmployeeTree() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [matchedIds, setMatchedIds] = useState(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getTree();
      const safeData = Array.isArray(data) ? data : [];

      setTree(safeData);

      // Varsayılan: root seviyesindeki çalışanlar açık
      const rootIds = safeData.map((n) => n.employeeId);
      setExpandedIds(new Set(rootIds));
    } catch (err) {
      const status = err?.response?.status;
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;

      if (status === 401) {
        setError('Oturum süresi doldu, tekrar giriş yapın.');
      } else {
        setError(
          backendMessage ||
            `Çalışan verisi alınırken bir hata oluştu${
              status ? ` (HTTP ${status})` : ''
            }.`
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Arama ve otomatik expand işlemleri
  useEffect(() => {
    if (!tree.length) return;

    const rootIds = tree.map((n) => n.employeeId);
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      setMatchedIds(new Set());
      setExpandedIds(new Set(rootIds));
      return;
    }

    const parents = new Map(); // id -> parentId
    const matches = new Set();

    const traverse = (nodes, parentId = null) => {
      nodes.forEach((node) => {
        const id = node.employeeId;
        parents.set(id, parentId);

        const fields = [
          node.fullName,
          node.jobTitle,
          node.department,
        ]
          .filter(Boolean)
          .map((v) => v.toLowerCase());

        if (fields.some((f) => f.includes(term))) {
          matches.add(id);
        }

        if (Array.isArray(node.children) && node.children.length > 0) {
          traverse(node.children, id);
        }
      });
    };

    traverse(tree);

    const nextExpanded = new Set(rootIds);
    matches.forEach((id) => {
      let current = id;
      while (current != null && !nextExpanded.has(current)) {
        nextExpanded.add(current);
        current = parents.get(current) ?? null;
      }
    });

    setMatchedIds(matches);
    setExpandedIds(nextExpanded);
  }, [searchTerm, tree]);

  const toggleNode = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectNode = useCallback((node) => {
    setSelectedNodeId(node?.employeeId ?? null);
  }, []);

  const flatIndex = useMemo(() => {
    const index = new Map();

    const traverse = (nodes) => {
      nodes.forEach((node) => {
        index.set(node.employeeId, node);
        if (Array.isArray(node.children) && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };

    traverse(tree);
    return index;
  }, [tree]);

  const selectedNode = useMemo(
    () => (selectedNodeId != null ? flatIndex.get(selectedNodeId) || null : null),
    [selectedNodeId, flatIndex]
  );

  return {
    tree,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    expandedIds,
    matchedIds,
    selectedNodeId,
    selectedNode,
    toggleNode,
    selectNode: handleSelectNode,
    refetch: fetchTree,
  };
}

export default useEmployeeTree;


