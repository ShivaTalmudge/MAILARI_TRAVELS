import { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { DataTable, Column } from '../../components/ui/DataTable';
import { useToast } from '../../hooks/useToast';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  description: string;
  createdAt: string;
  user: { mobile: string; email: string | null; role: string } | null;
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 25;
  const toast = useToast();

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/audit-logs', { params: { page, limit } });
      setLogs(data.data);
      if (data.meta) {
        setTotal(data.meta.total);
        setTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      toast('Failed to fetch audit logs', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, toast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const columns: Column<AuditLog>[] = [
    { key: 'createdAt', label: 'Time', render: (row) => <span className="whitespace-nowrap text-slate-500">{new Date(row.createdAt).toLocaleString('en-IN')}</span> },
    { key: 'action', label: 'Action', render: (row) => <span className="font-mono text-xs font-medium">{row.action}</span> },
    { key: 'entity', label: 'Entity', render: (row) => <span>{row.entity}{row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ''}</span> },
    { key: 'description', label: 'Description', render: (row) => <span className="text-slate-700">{row.description}</span> },
    { key: 'user', label: 'By', render: (row) => <span className="text-xs text-slate-500">{row.user ? `${row.user.role} · ${row.user.mobile}` : 'System'}</span> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Audit Logs</h1>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyMessage="No audit activity recorded yet."
        pagination={{ page, totalPages, total, limit, onPageChange: setPage }}
      />
    </div>
  );
}
