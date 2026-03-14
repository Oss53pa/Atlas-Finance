import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  FileText, Lock, LogIn, Edit3, Download, Search,
  Filter, CheckCircle, XCircle, Calendar, User
} from 'lucide-react';

interface Props {
  subTab: number;
  setSubTab: (n: number) => void;
}

const tabs = ['Ecritures', 'Clotures', 'Connexions', 'Modifications', 'Export'];

const mockEcritures = [
  { date: '14/03/2026 09:15', user: 'Jean Kouame', action: 'Creee', piece: 'VE-2026-0342', journal: 'Ventes', montant: '1 250 000', details: 'Facture client SARL Abidjan' },
  { date: '14/03/2026 08:45', user: 'Marie Koffi', action: 'Validee', piece: 'AC-2026-0128', journal: 'Achats', montant: '875 000', details: 'Achat fournitures bureau' },
  { date: '13/03/2026 17:30', user: 'Jean Kouame', action: 'Modifiee', piece: 'OD-2026-0056', journal: 'Operations Diverses', montant: '2 340 000', details: 'Correction montant provision' },
  { date: '13/03/2026 16:00', user: 'Admin', action: 'Supprimee', piece: 'BQ-2026-0089', journal: 'Banque', montant: '150 000', details: 'Doublon supprime' },
];

const mockClotures = [
  { date: '01/03/2026 00:05', user: 'Admin', type: 'Mensuelle', periode: 'Fevrier 2026', resultat: 'Succes', score: '12/12' },
  { date: '01/02/2026 00:05', user: 'Admin', type: 'Mensuelle', periode: 'Janvier 2026', resultat: 'Succes', score: '12/12' },
  { date: '01/01/2026 00:15', user: 'Jean Kouame', type: 'Annuelle', periode: 'Exercice 2025', resultat: 'Succes', score: '24/24' },
];

const mockConnexions = [
  { date: '14/03/2026 09:00', user: 'Jean Kouame', ip: '192.168.1.45', nav: 'Chrome 122', duree: '2h15', loc: 'Abidjan, CI', statut: 'Reussi' },
  { date: '14/03/2026 08:30', user: 'Marie Koffi', ip: '192.168.1.52', nav: 'Firefox 124', duree: '3h05', loc: 'Abidjan, CI', statut: 'Reussi' },
  { date: '13/03/2026 22:15', user: 'inconnu@test.com', ip: '41.207.12.88', nav: 'Chrome 121', duree: '-', loc: 'Lagos, NG', statut: 'Echoue' },
  { date: '13/03/2026 17:00', user: 'Admin', ip: '192.168.1.1', nav: 'Edge 122', duree: '1h30', loc: 'Abidjan, CI', statut: 'Reussi' },
];

const mockModifications = [
  { date: '14/03/2026 10:20', user: 'Admin', module: 'Plan comptable', entite: 'Compte 601100', champ: 'Libelle', ancien: 'Achats matieres prem.', nouveau: 'Achats matieres premieres' },
  { date: '13/03/2026 15:45', user: 'Marie Koffi', module: 'Tiers', entite: 'SARL Abidjan Tech', champ: 'Adresse', ancien: '12 Rue du Commerce', nouveau: '15 Boulevard Lagunaire' },
  { date: '13/03/2026 11:00', user: 'Jean Kouame', module: 'Journaux', entite: 'Journal BQ1', champ: 'Compte de contrepartie', ancien: '521000', nouveau: '521100' },
];

const actionColors: Record<string, string> = {
  Creee: 'bg-green-100 text-green-700',
  Modifiee: 'bg-yellow-100 text-yellow-700',
  Validee: 'bg-blue-100 text-blue-700',
  Supprimee: 'bg-red-100 text-red-700',
};

const AdminAuditTrail: React.FC<Props> = ({ subTab, setSubTab }) => {
  const [dateFrom, setDateFrom] = useState('2026-03-01');
  const [dateTo, setDateTo] = useState('2026-03-14');
  const [userFilter, setUserFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [exportPeriodFrom, setExportPeriodFrom] = useState('2026-01-01');
  const [exportPeriodTo, setExportPeriodTo] = useState('2026-03-14');
  const [exportFormat, setExportFormat] = useState('PDF certifie');

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
          <option value="Jean Kouame">Jean Kouame</option>
          <option value="Marie Koffi">Marie Koffi</option>
          <option value="Admin">Admin</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-500" />
        <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Rechercher..." className="border rounded px-2 py-1 text-sm" />
      </div>
    </div>
  );

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
                  {['Date', 'Utilisateur', 'Action', 'N° piece', 'Journal', 'Montant (FCFA)', 'Details'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockEcritures.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3">{row.user}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[row.action]}`}>{row.action}</span>
                    </td>
                    <td className="px-4 py-3 font-mono">{row.piece}</td>
                    <td className="px-4 py-3">{row.journal}</td>
                    <td className="px-4 py-3 text-right font-mono">{row.montant}</td>
                    <td className="px-4 py-3 text-gray-500">{row.details}</td>
                  </tr>
                ))}
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
                  {['Date', 'Utilisateur', 'Type', 'Periode', 'Resultat', 'Checklist'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockClotures.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3">{row.user}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${row.type === 'Annuelle' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{row.type}</span>
                    </td>
                    <td className="px-4 py-3">{row.periode}</td>
                    <td className="px-4 py-3">
                      {row.resultat === 'Succes' ? (
                        <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> Succes</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600"><XCircle className="w-4 h-4" /> Echec</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">{row.score}</td>
                  </tr>
                ))}
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
                  {['Date', 'Utilisateur', 'IP', 'Navigateur', 'Duree', 'Localisation', 'Statut'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockConnexions.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3">{row.user}</td>
                    <td className="px-4 py-3 font-mono">{row.ip}</td>
                    <td className="px-4 py-3">{row.nav}</td>
                    <td className="px-4 py-3">{row.duree}</td>
                    <td className="px-4 py-3">{row.loc}</td>
                    <td className="px-4 py-3">
                      {row.statut === 'Reussi' ? (
                        <span className="text-green-600 font-medium">Reussi</span>
                      ) : (
                        <span className="text-red-600 font-medium">Echoue</span>
                      )}
                    </td>
                  </tr>
                ))}
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
                  {['Date', 'Utilisateur', 'Module', 'Entite', 'Champ', 'Ancienne valeur', 'Nouvelle valeur'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockModifications.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3">{row.user}</td>
                    <td className="px-4 py-3">{row.module}</td>
                    <td className="px-4 py-3 font-medium">{row.entite}</td>
                    <td className="px-4 py-3">{row.champ}</td>
                    <td className="px-4 py-3"><span className="line-through text-red-600">{row.ancien}</span></td>
                    <td className="px-4 py-3"><span className="text-green-600 font-medium">{row.nouveau}</span></td>
                  </tr>
                ))}
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
