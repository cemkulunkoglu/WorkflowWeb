import React, { useMemo } from 'react';
import { Button } from '@mui/material';

function formatDepthLabel(depth) {
  if (!depth) return '10';
  return String(depth);
}

export default function EmployeeAncestorsPanel({
  selectedEmployeeId,
  selectedEmployeeLabel,
  ancestors,
  depth,
  includeSelf,
  isLoading,
  error,
  onDepthChange,
  onIncludeSelfChange,
  onCrumbClick,
}) {
  const breadcrumbText = useMemo(() => {
    if (!Array.isArray(ancestors) || ancestors.length === 0) return '';
    return ancestors.map((a) => a.fullName || `ID ${a.employeeId}`).join(' > ');
  }, [ancestors]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Üst Zinciri</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {selectedEmployeeId ? 'Yöneticiler zinciri' : 'Bir çalışan seç.'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <span className="text-[11px] font-medium text-slate-600">Üst seviye sayısı</span>
          <input
            type="range"
            min={1}
            max={10}
            value={depth}
            onChange={(e) => onDepthChange(Number(e.target.value))}
            disabled={!selectedEmployeeId}
          />
          <span className="min-w-[18px] text-[11px] text-slate-600">
            {formatDepthLabel(depth)}
          </span>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={includeSelf}
            onChange={(e) => onIncludeSelfChange(e.target.checked)}
            disabled={!selectedEmployeeId}
          />
          Kendisi dahil
        </label>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
        {!selectedEmployeeId ? (
          <div className="text-xs text-slate-500">Bir çalışan seç.</div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
            Üst zinciri yükleniyor…
          </div>
        ) : error ? (
          <div className="text-xs text-red-700">{error}</div>
        ) : !ancestors || ancestors.length === 0 ? (
          <div className="text-xs text-slate-500">Zincir bulunamadı.</div>
        ) : (
          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-700">
            {ancestors.map((a, idx) => (
              <React.Fragment key={a.employeeId}>
                <Button
                  type="button"
                  variant="text"
                  size="small"
                  disableRipple
                  onClick={() => onCrumbClick(a.employeeId)}
                  className="rounded px-1 py-0.5 text-left font-medium text-slate-800 hover:bg-slate-200/70"
                  sx={{
                    textTransform: 'none',
                    minWidth: 'auto',
                    padding: 0,
                    justifyContent: 'flex-start',
                  }}
                >
                  {a.fullName || `ID ${a.employeeId}`}
                </Button>
                {idx !== ancestors.length - 1 && (
                  <span className="text-slate-400">{'>'}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {selectedEmployeeId ? (
        <div className="mt-2 text-[11px] text-slate-500">
          Seçili: {selectedEmployeeLabel || `ID ${selectedEmployeeId}`}
        </div>
      ) : null}
    </section>
  );
}


