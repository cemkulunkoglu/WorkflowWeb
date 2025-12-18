import React from 'react';

function EmployeeNode({
  node,
  depth = 0,
  expandedIds,
  matchedIds,
  selectedNodeId,
  onToggle,
  onSelect,
}) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isExpanded = expandedIds.has(node.employeeId);
  const isMatched = matchedIds.has(node.employeeId);
  const isSelected = selectedNodeId === node.employeeId;

  const cardBaseClasses =
    'relative rounded-lg border bg-white shadow-sm px-3 py-2 text-xs sm:text-sm transition-all cursor-pointer';

  const borderClasses = isSelected
    ? 'border-blue-600 ring-1 ring-blue-500'
    : isMatched
    ? 'border-amber-400 ring-1 ring-amber-300'
    : 'border-slate-200 hover:border-blue-300 hover:shadow-md';

  return (
    <div className="mb-2" style={{ marginLeft: depth === 0 ? 0 : Math.min(depth, 4) * 16 }}>
      <div className="flex items-start gap-2">
        {hasChildren && (
          <button
            type="button"
            onClick={() => onToggle(node.employeeId)}
            className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] text-slate-600 hover:bg-slate-50"
            aria-label={isExpanded ? 'Alt çalışanları gizle' : 'Alt çalışanları göster'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}
        {!hasChildren && <div className="w-5" aria-hidden="true" />}

        <div
          className={`${cardBaseClasses} ${borderClasses} flex-1`}
          onClick={() => onSelect(node)}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-slate-800 truncate">
                {node.fullName}
              </div>
              <div className="text-[11px] text-slate-500">
                {node.jobTitle} • {node.department}
              </div>
            </div>
            <div className="text-[10px] text-slate-400 text-right">
              <div>ID: {node.employeeId}</div>
              {node.managerId != null && <div>Manager: {node.managerId}</div>}
            </div>
          </div>
          {node.path && (
            <div className="mt-1 text-[10px] text-slate-400 break-all">
              Path: {node.path}
            </div>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1 border-l border-slate-200 pl-4">
          {node.children.map((child) => (
            <EmployeeNode
              key={child.employeeId}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              matchedIds={matchedIds}
              selectedNodeId={selectedNodeId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default EmployeeNode;


