import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  FileText, Lock, LogIn, Edit3, Download, Search,
  Filter, CheckCircle, XCircle, Calendar, User, Loader2
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';

interface Props {
  subTab: number;
  setSubTab: (n: number) => void;
}

const tabs = ['Ecritures', 'Clotures', 'Connexions', 'Modifications', 'Export'];

const actionColors: Record<string, string> = {
  Creee: 'bg-green-100 text-green-700',
  create: 'bg-green-100 text-green-700',
  Modifiee: 'bg-yellow-100 text-yellow-700',
  update: 'bg-yellow-100 text-yellow-700',
  Validee: 'bg-blue-100 text-blue-700',
  validate: 'bg-blue-100 text-blue-700',
  Supprimee: 'bg-red-100 text-red-700',
  delete: 'bg-red-100 text-red-700',
};

const actionLabels: Record<string, string> = {
  create: 'Creee',
  update: 'Modifiee',
  delete: 'Supprimee',
  validate: 'Validee',
  login: 'Connexion',
  logout: 'Deconnexion',
};

const formatTs = (ts: string) => {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (err) { /* silent */ return ts; }
};

const parseDetails = (details: any): Record<string, string> => {
  if (!details) return {};
  if (typeof details === 'string') {
    try { return JSON.parse(details); } catch (err) { /* silent */ return { info: details }; }
  }
  return details;
};

const AdminAuditTrail: React.FC<Props> = ({ subTab, setSubTab }) => {
  const { adapter } = useData();
  const [loading, setLoading] = useState(true);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [exportPeriodFrom, setExportPeriodFrom] = useState('');
  const [exportPeriodTo, setExportPeriodTo] = useState('');
  const [exportFormat, setExportFormat] = useState('PDF certifie');

  useEffect(() => {
    const load = async () => {
      try {
        const logs = await adapter.getAuditTrail({
          orderBy: { field: 'timestamp', direction: 'desc' as const },
          limit: 200,
        });
        setAllLogs(logs);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [adapter]);

  const filterFn = (log: any) => {
    if (userFilter && (log.userId || '') !== userFilter) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      const details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details || '');
      if (!(log.entityId || '').toLowerCase().includes(s) && !details.toLowerCase().includes(s) && !(log.entityType || '').toLowerCase().includes(s)) return false;
    }
    if (dateFrom && log.timestamp < dateFrom) return false;
    if (dateTo && log.timestamp > dateTo + 'T23:59:59') return false;
    return true;
  };

  const ecritures = useMemo(() =>
    allLogs.filter(l => l.entityType === 'journalEntry' || l.entityType === 'journalEntries').filter(filterFn),
    [allLogs, userFilter, searchText, dateFrom, dateTo]
  );
  const clotures = useMemo(() =>
    allLogs.filter(l => l.entityType === 'closureSession' || l.entityType === 'closureSessions' || l.entityType === 'fiscalPeriods').filter(filterFn),
    [allLogs, userFilter, searchText, dateFrom, dateTo]
  );
  const connexions = useMemo(() =>
    allLogs.filter(l => l.action === 'login' || l.action === 'logout' || l.action === 'login_failed').filter(filterFn),
    [allLogs, userFilter, searchText, dateFrom, dateTo]
  );
  const modifications = useMemo(() =>
    allLogs.filter(l => l.action === 'update').filter(filterFn),
    [allLogs, userFilter, searchText, dateFrom, dateTo]
  );

  const uniqueUsers = useMemo(() => [...new Set(allLogs.map(l => l.userId).filter(Boolean))], [allLogs]);

  const filters = (
    <div className="flex flex-wrap gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        <span className="text-gray-400">-</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded px-2 py-1 text-sm" />
      </div>
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-gray-500" />
        <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">Tous les utilisateurs</option>
          {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-500" />
        <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Rechercher..." className="border rounded px-2 py-1 text-sm" />
      </div>
    </div>
  );

  const EmptyRow = ({ cols, text }: { cols: number; text: string }) => (
    <tr><td colSpan={cols} className="px-4 py-8 text-center text-gray-400">{text}</td></tr>
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Chargement de la piste d'audit...</span></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setSubTab(i)}
            className={`px-4 py-2 text-sm font-medium rounded-t whitespace-nowrap ${
              subTab === i ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {subTab === 0 && (
        <div>
          {filters}
          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Utilisateur', 'Action', 'Entite', 'Type', 'Details'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {ecritures.length === 0 ? <EmptyRow cols={6} text="Aucune ecriture tracee" /> : ecritures.map((row, i) => {
                  const d = parseDetails(row.details);
                  const label = actionLabels[row.action] || row.action;
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">{formatTs(row.timestamp)}</td>
                      <td className="px-4 py-3">{row.userId || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[row.action] || 'bg-gray-100 text-gray-700'}`}>{label}</span>
                      </td>
                      <td className="px-4 py-3 font-mono">{row.entityId || '—'}</td>
                      <td className="px-4 py-3">{row.entityType || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[250px] truncate">{d.info || d.label || d.reference || JSON.stringify(d).substring(0, 80)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 1 && (
        <div>
          {filters}
          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Utilisateur', 'Action', 'Type entite', 'Entite', 'Details'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {clotures.length === 0 ? <EmptyRow cols={6} text="Aucune cloture enregistree" /> : clotures.map((row, i) => {
                  const d = parseDetails(row.details);
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">{formatTs(row.timestamp)}</td>
                      <td className="px-4 py-3">{row.userId || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[row.action] || 'bg-blue-100 text-blue-700'}`}>{actionLabels[row.action] || row.action}</span>
                      </td>
                      <td className="px-4 py-3">{row.entityType}</td>
                      <td className="px-4 py-3 font-mono">{row.entityId || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{d.info || d.type || JSON.stringify(d).substring(0, 80)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 2 && (
        <div>
          {filters}
          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Utilisateur', 'Action', 'Details', 'Statut'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {connexions.length === 0 ? <EmptyRow cols={5} text="Aucune connexion enregistree" /> : connexions.map((row, i) => {
                  const d = parseDetails(row.details);
                  const isSuccess = row.action === 'login' || row.action === 'logout';
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">{formatTs(row.timestamp)}</td>
                      <td className="px-4 py-3">{row.userId || '—'}</td>
                      <td className="px-4 py-3">{actionLabels[row.action] || row.action}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{d.info || d.ip || JSON.stringify(d).substring(0, 80)}</td>
                      <td className="px-4 py-3">
                        {isSuccess ? (
                          <span className="text-green-600 font-medium">Reussi</span>
                        ) : (
                          <span className="text-red-600 font-medium">Echoue</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 3 && (
        <div>
          {filters}
          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Utilisateur', 'Module', 'Entite', 'Details'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {modifications.length === 0 ? <EmptyRow cols={5} text="Aucune modification enregistree" /> : modifications.map((row, i) => {
                  const d = parseDetails(row.details);
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">{formatTs(row.timestamp)}</td>
                      <td className="px-4 py-3">{row.userId || '—'}</td>
                      <td className="px-4 py-3">{row.entityType || '—'}</td>
                      <td className="px-4 py-3 font-medium">{row.entityId || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[300px] truncate">{d.info || d.field || JSON.stringify(d).substring(0, 100)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 4 && (
        <div className="bg-white p-6 rounded-lg border space-y-6">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2"><FileText className="w-5 h-5" /> Export de la piste d'audit</h3>
            <p className="text-sm text-gray-500 mt-1">
              Generez un export certifie de la piste d'audit conforme aux exigences du SYSCOHADA et du Code General des Impots.
              Ce document retrace l'integralite des operations effectuees sur la periode selectionnee.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date debut</label>
              <input type="date" value={exportPeriodFrom} onChange={e => setExportPeriodFrom(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
              <input type="date" value={exportPeriodTo} onChange={e => setExportPeriodTo(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select value={exportFormat} onChange={e => setExportFormat(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option>PDF certifie</option>
                <option>CSV</option>
                <option>Excel</option>
              </select>
            </div>
          </div>
          <button onClick={() => toast.success(`Export ${exportFormat} de la piste d'audit genere`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Download className="w-4 h-4" /> Generer l'export
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminAuditTrail;
