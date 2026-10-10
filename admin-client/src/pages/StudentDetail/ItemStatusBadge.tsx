export const ItemStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    APPROVED: {
      label: 'Approved',
      cls: 'bg-status-bg-approved text-status-approved border-edge',
    },
    PENDING: {
      label: 'Pending',
      cls: 'bg-status-bg-pending text-status-pending border-edge',
    },
    UNDER_REVIEW: {
      label: 'Under Review',
      cls: 'bg-status-bg-review text-status-review border-edge',
    },
    CHANGES_REQUESTED: {
      label: 'Changes Requested',
      cls: 'bg-status-bg-changes text-status-changes border-edge',
    },
    REJECTED: {
      label: 'Rejected',
      cls: 'bg-status-bg-rejected text-status-rejected border-edge',
    },
  };
  const s = map[status] ?? {
    label: status,
    cls: 'bg-surface-canvas text-ink-secondary border-edge',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${s.cls}`}>
      {s.label}
    </span>
  );
};
