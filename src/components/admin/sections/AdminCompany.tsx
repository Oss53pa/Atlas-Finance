import React, { useState } from 'react';
import {
  Building2, Image, CalendarDays, Coins, BookOpen, Receipt, Boxes,
  Plus, Search, Edit2, Trash2, Star, Upload, X, Save, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../../contexts/DataContext';

interface Props {
  subTab: number;
  setSubTab: (n: number) => void;
}

const tabs = [
  { label: 'Informations legales', icon: Building2 },
  { label: 'Logo & En-tete', icon: Image },
  { label: 'Exercice comptable', icon: CalendarDays },
  { label: 'Devise', icon: Coins },
  { label: 'Plan SYSCOHADA', icon: BookOpen },
  { label: 'TVA & Taxes', icon: Receipt },
  { label: 'Categories immobilisations', icon: Boxes },
];

const OHADA_COUNTRIES = [
  'Cote d\'Ivoire', 'Cameroun', 'Senegal', 'Gabon', 'Congo', 'Tchad', 'RCA',
  'Mali', 'Burkina Faso', 'Niger', 'Togo', 'Benin', 'Guinee Equatoriale',
  'Comores', 'Guinee', 'Guinee-Bissau', 'RDC',
];

const mockAccounts = [
  { numero: '101', libelle: 'Capital social', classe: 1, type: 'Bilan', sens: 'Crediteur', lettrable: false, actif: true },
  { numero: '411', libelle: 'Clients', classe: 4, type: 'Bilan', sens: 'Debiteur', lettrable: true, actif: true },
  { numero: '401', libelle: 'Fournisseurs', classe: 4, type: 'Bilan', sens: 'Crediteur', lettrable: true, actif: true },
  { numero: '521', libelle: 'Banques locales', classe: 5, type: 'Bilan', sens: 'Debiteur', lettrable: false, actif: true },
  { numero: '601', libelle: 'Achats de marchandises', classe: 6, type: 'Gestion', sens: 'Debiteur', lettrable: false, actif: true },
  { numero: '701', libelle: 'Ventes de marchandises', classe: 7, type: 'Gestion', sens: 'Crediteur', lettrable: false, actif: true },
  { numero: '681', libelle: 'Dotations aux amortissements', classe: 6, type: 'Gestion', sens: 'Debiteur', lettrable: false, actif: true },
  { numero: '791', libelle: 'Reprises de provisions', classe: 7, type: 'Gestion', sens: 'Crediteur', lettrable: false, actif: true },
];

const mockTaxes = [
  { code: 'TVA18', libelle: 'TVA 18%', taux: 18, type: 'TVA', compteCollecte: '4431', compteDeductible: '4451', actif: true },
  { code: 'TVA9', libelle: 'TVA 9%', taux: 9, type: 'TVA', compteCollecte: '4431', compteDeductible: '4451', actif: true },
  { code: 'TVA0', libelle: 'TVA 0% export', taux: 0, type: 'TVA', compteCollecte: '4431', compteDeductible: '4451', actif: true },
  { code: 'RAS15', libelle: 'Retenue a la source 15%', taux: 15, type: 'Retenue', compteCollecte: '4472', compteDeductible: '', actif: true },
  { code: 'IMF1', libelle: 'IMF 1%', taux: 1, type: 'IMF', compteCollecte: '4473', compteDeductible: '', actif: true },
];

const mockCategories = [
  { code: 'TERR', libelle: 'Terrains', duree: 0, taux: 0, methode: 'Lineaire', compteBilan: '211', compteAmort: '2811', compteDotation: '681' },
  { code: 'BAT', libelle: 'Batiments', duree: 20, taux: 5, methode: 'Lineaire', compteBilan: '231', compteAmort: '2831', compteDotation: '681' },
  { code: 'MBUR', libelle: 'Materiel de bureau', duree: 5, taux: 20, methode: 'Lineaire', compteBilan: '244', compteAmort: '2844', compteDotation: '681' },
  { code: 'MTRA', libelle: 'Materiel de transport', duree: 5, taux: 20, methode: 'Lineaire', compteBilan: '245', compteAmort: '2845', compteDotation: '681' },
  { code: 'MINF', libelle: 'Materiel informatique', duree: 3, taux: 33.33, methode: 'Lineaire', compteBilan: '244', compteAmort: '2844', compteDotation: '681' },
  { code: 'MOB', libelle: 'Mobilier', duree: 10, taux: 10, methode: 'Lineaire', compteBilan: '244', compteAmort: '2844', compteDotation: '681' },
];

const mockExercices = [
  { code: '2025', debut: '2025-01-01', fin: '2025-12-31', periodes: 12, statut: 'Cloture', actif: false },
  { code: '2026', debut: '2026-01-01', fin: '2026-12-31', periodes: 12, statut: 'Ouvert', actif: true },
];

const AdminCompany: React.FC<Props> = ({ subTab, setSubTab }) => {
  const { adapter } = useData();

  // Legal info form
  const [legalForm, setLegalForm] = useState({
    raisonSociale: '', formeJuridique: 'SARL', nif: '', rccm: '',
    capitalSocial: '', regimeFiscal: 'Reel normal', adresse: '',
    ville: '', pays: 'Cote d\'Ivoire', telephone: '', email: '', siteWeb: '',
  });

  // Logo toggles
  const [logoToggles, setLogoToggles] = useState({
    etatsFinanciers: true, factures: true, entetePdf: true,
  });

  // Devise form
  const [deviseForm, setDeviseForm] = useState({
    devise: 'XOF', pays: 'Cote d\'Ivoire', fuseau: 'Africa/Abidjan',
    formatNombre: '1 000 000', separateurDecimal: 'virgule',
  });

  // Search & filters for Plan SYSCOHADA
  const [accountSearch, setAccountSearch] = useState('');
  const [accountClasseFilter, setAccountClasseFilter] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('');

  // Modals
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showExerciceModal, setShowExerciceModal] = useState(false);

  // Modal forms
  const [accountForm, setAccountForm] = useState({
    numero: '', libelle: '', classe: '', type: 'Bilan', sens: 'Debiteur',
    lettrable: false, compteCollectif: '',
  });
  const [taxForm, setTaxForm] = useState({
    code: '', libelle: '', taux: '', type: 'TVA', compteCollecte: '', compteDeductible: '',
  });
  const [categoryForm, setCategoryForm] = useState({
    code: '', libelle: '', duree: '', taux: '', methode: 'Lineaire',
    compteBilan: '', compteAmort: '', compteDotation: '',
  });
  const [exerciceForm, setExerciceForm] = useState({
    debut: '', fin: '', code: '', periodes: '12',
  });

  const deviseSymbols: Record<string, string> = {
    XOF: 'FCFA', XAF: 'FCFA', EUR: '\u20AC', USD: '$',
  };

  const handleLegalSave = () => {
    if (!legalForm.raisonSociale) {
      toast.error('La raison sociale est obligatoire');
      return;
    }
    toast.success('Informations legales enregistrees avec succes');
  };

  const handleLogoSave = () => {
    toast.success('Parametres du logo enregistres avec succes');
  };

  const handleDeviseSave = () => {
    toast.success('Parametres de devise enregistres avec succes');
  };

  const handleAccountSubmit = () => {
    if (!accountForm.numero || !accountForm.libelle) {
      toast.error('Le numero et le libelle sont obligatoires');
      return;
    }
    toast.success(`Compte ${accountForm.numero} ajoute avec succes`);
    setShowAccountModal(false);
    setAccountForm({ numero: '', libelle: '', classe: '', type: 'Bilan', sens: 'Debiteur', lettrable: false, compteCollectif: '' });
  };

  const handleTaxSubmit = () => {
    if (!taxForm.code || !taxForm.libelle) {
      toast.error('Le code et le libelle sont obligatoires');
      return;
    }
    toast.success(`Taxe ${taxForm.code} ajoutee avec succes`);
    setShowTaxModal(false);
    setTaxForm({ code: '', libelle: '', taux: '', type: 'TVA', compteCollecte: '', compteDeductible: '' });
  };

  const handleCategorySubmit = () => {
    if (!categoryForm.code || !categoryForm.libelle) {
      toast.error('Le code et le libelle sont obligatoires');
      return;
    }
    toast.success(`Categorie ${categoryForm.code} ajoutee avec succes`);
    setShowCategoryModal(false);
    setCategoryForm({ code: '', libelle: '', duree: '', taux: '', methode: 'Lineaire', compteBilan: '', compteAmort: '', compteDotation: '' });
  };

  const handleExerciceSubmit = () => {
    if (!exerciceForm.debut || !exerciceForm.fin) {
      toast.error('Les dates de debut et de fin sont obligatoires');
      return;
    }
    toast.success(`Exercice ${exerciceForm.code} cree avec succes`);
    setShowExerciceModal(false);
    setExerciceForm({ debut: '', fin: '', code: '', periodes: '12' });
  };

  const filteredAccounts = mockAccounts.filter((a) => {
    const matchSearch = !accountSearch ||
      a.numero.includes(accountSearch) ||
      a.libelle.toLowerCase().includes(accountSearch.toLowerCase());
    const matchClasse = !accountClasseFilter || a.classe === Number(accountClasseFilter);
    const matchType = !accountTypeFilter || a.type === accountTypeFilter;
    return matchSearch && matchClasse && matchType;
  });

  // Modal wrapper
  const Modal: React.FC<{ title: string; onClose: () => void; onSubmit: () => void; submitLabel?: string; children: React.ReactNode }> = ({
    title, onClose, onSubmit, submitLabel = 'Enregistrer', children,
  }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">{children}</div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Annuler</button>
          <button onClick={onSubmit} className="px-4 py-2 text-sm text-white rounded-lg hover:opacity-90" style={{ backgroundColor: '#ef4444' }}>{submitLabel}</button>
        </div>
      </div>
    </div>
  );

  const InputField: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }> = ({
    label, value, onChange, type = 'text', required, placeholder,
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" />
    </div>
  );

  const SelectField: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; required?: boolean }> = ({
    label, value, onChange, options, required,
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const Badge: React.FC<{ text: string; color?: string }> = ({ text, color = 'gray' }) => {
    const colors: Record<string, string> = {
      green: 'bg-green-100 text-green-700', red: 'bg-red-100 text-red-700',
      blue: 'bg-blue-100 text-blue-700', yellow: 'bg-yellow-100 text-yellow-700',
      gray: 'bg-gray-100 text-gray-700', purple: 'bg-purple-100 text-purple-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>{text}</span>;
  };

  const renderInformationsLegales = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField label="Raison sociale" value={legalForm.raisonSociale} onChange={(v) => setLegalForm({ ...legalForm, raisonSociale: v })} required />
        <SelectField label="Forme juridique" value={legalForm.formeJuridique} onChange={(v) => setLegalForm({ ...legalForm, formeJuridique: v })}
          options={['SARL', 'SA', 'SAS', 'SNC', 'Entreprise individuelle', 'GIE'].map((f) => ({ value: f, label: f }))} />
        <InputField label="NIF" value={legalForm.nif} onChange={(v) => setLegalForm({ ...legalForm, nif: v })} />
        <InputField label="RCCM" value={legalForm.rccm} onChange={(v) => setLegalForm({ ...legalForm, rccm: v })} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capital social</label>
          <div className="flex">
            <input type="number" value={legalForm.capitalSocial} onChange={(e) => setLegalForm({ ...legalForm, capitalSocial: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" />
            <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-600">FCFA</span>
          </div>
        </div>
        <SelectField label="Regime fiscal" value={legalForm.regimeFiscal} onChange={(v) => setLegalForm({ ...legalForm, regimeFiscal: v })}
          options={['Reel normal', 'Reel simplifie', 'BIC', 'BNC'].map((r) => ({ value: r, label: r }))} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Adresse siege</label>
        <textarea value={legalForm.adresse} onChange={(e) => setLegalForm({ ...legalForm, adresse: e.target.value })} rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField label="Ville" value={legalForm.ville} onChange={(v) => setLegalForm({ ...legalForm, ville: v })} />
        <SelectField label="Pays" value={legalForm.pays} onChange={(v) => setLegalForm({ ...legalForm, pays: v })}
          options={OHADA_COUNTRIES.map((c) => ({ value: c, label: c }))} />
        <InputField label="Telephone" value={legalForm.telephone} onChange={(v) => setLegalForm({ ...legalForm, telephone: v })} />
        <InputField label="Email" value={legalForm.email} onChange={(v) => setLegalForm({ ...legalForm, email: v })} type="email" />
        <InputField label="Site web" value={legalForm.siteWeb} onChange={(v) => setLegalForm({ ...legalForm, siteWeb: v })} />
      </div>
      <div className="flex justify-end">
        <button onClick={handleLegalSave} className="flex items-center gap-2 px-6 py-2 text-white rounded-lg hover:opacity-90" style={{ backgroundColor: '#ef4444' }}>
          <Save className="w-4 h-4" />Enregistrer
        </button>
      </div>
    </div>
  );

  const renderLogoEntete = () => (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-red-400 transition-colors cursor-pointer">
        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        <p className="text-sm text-gray-600 mb-1">Glissez-deposez votre logo ici ou cliquez pour parcourir</p>
        <p className="text-xs text-gray-400">PNG, JPG ou SVG - Max 2Mo</p>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm font-medium text-gray-700 mb-2">Apercu du logo actuel</p>
        <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
          <Image className="w-8 h-8 text-gray-400" />
        </div>
      </div>
      <div className="space-y-3">
        {[
          { key: 'etatsFinanciers' as const, label: 'Afficher sur les etats financiers' },
          { key: 'factures' as const, label: 'Afficher sur les factures' },
          { key: 'entetePdf' as const, label: 'Afficher dans l\'en-tete PDF' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-700">{label}</span>
            <button onClick={() => setLogoToggles({ ...logoToggles, [key]: !logoToggles[key] })}
              className={`w-10 h-6 rounded-full transition-colors relative ${logoToggles[key] ? 'bg-red-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${logoToggles[key] ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={handleLogoSave} className="flex items-center gap-2 px-6 py-2 text-white rounded-lg hover:opacity-90" style={{ backgroundColor: '#ef4444' }}>
          <Save className="w-4 h-4" />Enregistrer
        </button>
      </div>
    </div>
  );

  const renderExerciceComptable = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowExerciceModal(true)} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm" style={{ backgroundColor: '#ef4444' }}>
          <Plus className="w-4 h-4" />Creer un exercice
        </button>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Code', 'Date debut', 'Date fin', 'Nb periodes', 'Statut', 'Actif', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mockExercices.map((ex) => (
              <tr key={ex.code} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{ex.code}</td>
                <td className="px-4 py-3">{ex.debut}</td>
                <td className="px-4 py-3">{ex.fin}</td>
                <td className="px-4 py-3">{ex.periodes}</td>
                <td className="px-4 py-3">
                  <Badge text={ex.statut} color={ex.statut === 'Ouvert' ? 'green' : 'red'} />
                </td>
                <td className="px-4 py-3">
                  {ex.actif && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                </td>
                <td className="px-4 py-3">
                  <button className="text-gray-400 hover:text-gray-600"><Edit2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDevise = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField label="Devise principale" value={deviseForm.devise} onChange={(v) => setDeviseForm({ ...deviseForm, devise: v })}
          options={[
            { value: 'XOF', label: 'XOF - FCFA UEMOA' },
            { value: 'XAF', label: 'XAF - FCFA CEMAC' },
            { value: 'EUR', label: 'EUR - Euro' },
            { value: 'USD', label: 'USD - Dollar US' },
          ]} />
        <SelectField label="Pays OHADA" value={deviseForm.pays} onChange={(v) => setDeviseForm({ ...deviseForm, pays: v })}
          options={OHADA_COUNTRIES.map((c) => ({ value: c, label: c }))} />
        <SelectField label="Fuseau horaire" value={deviseForm.fuseau} onChange={(v) => setDeviseForm({ ...deviseForm, fuseau: v })}
          options={[
            { value: 'Africa/Abidjan', label: 'Africa/Abidjan (GMT+0)' },
            { value: 'Africa/Douala', label: 'Africa/Douala (GMT+1)' },
            { value: 'Africa/Dakar', label: 'Africa/Dakar (GMT+0)' },
            { value: 'Africa/Libreville', label: 'Africa/Libreville (GMT+1)' },
            { value: 'Africa/Brazzaville', label: 'Africa/Brazzaville (GMT+1)' },
            { value: 'Africa/Ndjamena', label: 'Africa/Ndjamena (GMT+1)' },
          ]} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Symbole devise</label>
          <input type="text" readOnly value={deviseSymbols[deviseForm.devise] || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" />
        </div>
        <SelectField label="Format nombre" value={deviseForm.formatNombre} onChange={(v) => setDeviseForm({ ...deviseForm, formatNombre: v })}
          options={[{ value: '1 000 000', label: '1 000 000' }, { value: '1.000.000', label: '1.000.000' }]} />
        <SelectField label="Separateur decimal" value={deviseForm.separateurDecimal} onChange={(v) => setDeviseForm({ ...deviseForm, separateurDecimal: v })}
          options={[{ value: 'virgule', label: 'Virgule (,)' }, { value: 'point', label: 'Point (.)' }]} />
      </div>
      <div className="flex justify-end">
        <button onClick={handleDeviseSave} className="flex items-center gap-2 px-6 py-2 text-white rounded-lg hover:opacity-90" style={{ backgroundColor: '#ef4444' }}>
          <Save className="w-4 h-4" />Enregistrer
        </button>
      </div>
    </div>
  );

  const renderPlanSyscohada = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Rechercher un compte..." value={accountSearch} onChange={(e) => setAccountSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" />
        </div>
        <select value={accountClasseFilter} onChange={(e) => setAccountClasseFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none">
          <option value="">Toutes les classes</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => <option key={c} value={c}>Classe {c}</option>)}
        </select>
        <select value={accountTypeFilter} onChange={(e) => setAccountTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none">
          <option value="">Tous les types</option>
          {['Bilan', 'Gestion', 'HAO'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => setShowAccountModal(true)} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm" style={{ backgroundColor: '#ef4444' }}>
          <Plus className="w-4 h-4" />Ajouter un compte
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
          <Upload className="w-4 h-4" />Importer
        </button>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Numero', 'Libelle', 'Classe', 'Type', 'Sens normal', 'Lettrable', 'Statut', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAccounts.map((a) => (
              <tr key={a.numero} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium">{a.numero}</td>
                <td className="px-4 py-3">{a.libelle}</td>
                <td className="px-4 py-3"><Badge text={`Classe ${a.classe}`} color={a.classe <= 5 ? 'blue' : 'purple'} /></td>
                <td className="px-4 py-3">{a.type}</td>
                <td className="px-4 py-3">{a.sens}</td>
                <td className="px-4 py-3">{a.lettrable ? 'Oui' : 'Non'}</td>
                <td className="px-4 py-3"><Badge text="Actif" color="green" /></td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="text-gray-400 hover:text-gray-600"><Edit2 className="w-4 h-4" /></button>
                  <button className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTvaTaxes = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowTaxModal(true)} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm" style={{ backgroundColor: '#ef4444' }}>
          <Plus className="w-4 h-4" />Ajouter un taux
        </button>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Code', 'Libelle', 'Taux (%)', 'Type', 'Compte collecte', 'Compte deductible', 'Statut', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mockTaxes.map((t) => {
              const typeColor: Record<string, string> = { TVA: 'blue', Retenue: 'yellow', IMF: 'purple', Patente: 'green' };
              return (
                <tr key={t.code} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium">{t.code}</td>
                  <td className="px-4 py-3">{t.libelle}</td>
                  <td className="px-4 py-3">{t.taux}%</td>
                  <td className="px-4 py-3"><Badge text={t.type} color={typeColor[t.type] || 'gray'} /></td>
                  <td className="px-4 py-3 font-mono">{t.compteCollecte}</td>
                  <td className="px-4 py-3 font-mono">{t.compteDeductible || '-'}</td>
                  <td className="px-4 py-3"><Badge text="Actif" color="green" /></td>
                  <td className="px-4 py-3 flex gap-2">
                    <button className="text-gray-400 hover:text-gray-600"><Edit2 className="w-4 h-4" /></button>
                    <button className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCategoriesImmobilisations = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowCategoryModal(true)} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm" style={{ backgroundColor: '#ef4444' }}>
          <Plus className="w-4 h-4" />Ajouter une categorie
        </button>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Code', 'Libelle', 'Duree (ans)', 'Taux lineaire (%)', 'Methode', 'Compte bilan', 'Compte amort', 'Compte dotation', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mockCategories.map((c) => (
              <tr key={c.code} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                <td className="px-4 py-3">{c.libelle}</td>
                <td className="px-4 py-3">{c.duree || '-'}</td>
                <td className="px-4 py-3">{c.taux ? `${c.taux}%` : '-'}</td>
                <td className="px-4 py-3">{c.methode}</td>
                <td className="px-4 py-3 font-mono">{c.compteBilan}</td>
                <td className="px-4 py-3 font-mono">{c.compteAmort}</td>
                <td className="px-4 py-3 font-mono">{c.compteDotation}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="text-gray-400 hover:text-gray-600"><Edit2 className="w-4 h-4" /></button>
                  <button className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (subTab) {
      case 0: return renderInformationsLegales();
      case 1: return renderLogoEntete();
      case 2: return renderExerciceComptable();
      case 3: return renderDevise();
      case 4: return renderPlanSyscohada();
      case 5: return renderTvaTaxes();
      case 6: return renderCategoriesImmobilisations();
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          return (
            <button key={i} onClick={() => setSubTab(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                subTab === i ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}>
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {renderTabContent()}
      </div>

      {/* Account Modal */}
      {showAccountModal && (
        <Modal title="Ajouter un compte" onClose={() => setShowAccountModal(false)} onSubmit={handleAccountSubmit}>
          <InputField label="Numero" value={accountForm.numero} required
            onChange={(v) => setAccountForm({ ...accountForm, numero: v, classe: v ? v[0] : '' })} />
          <InputField label="Libelle" value={accountForm.libelle} required
            onChange={(v) => setAccountForm({ ...accountForm, libelle: v })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
            <input type="text" readOnly value={accountForm.classe ? `Classe ${accountForm.classe}` : ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" />
          </div>
          <SelectField label="Type" value={accountForm.type} onChange={(v) => setAccountForm({ ...accountForm, type: v })}
            options={['Bilan', 'Gestion', 'HAO'].map((t) => ({ value: t, label: t }))} />
          <SelectField label="Sens normal" value={accountForm.sens} onChange={(v) => setAccountForm({ ...accountForm, sens: v })}
            options={[{ value: 'Debiteur', label: 'Debiteur' }, { value: 'Crediteur', label: 'Crediteur' }]} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="lettrable" checked={accountForm.lettrable}
              onChange={(e) => setAccountForm({ ...accountForm, lettrable: e.target.checked })}
              className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500" />
            <label htmlFor="lettrable" className="text-sm text-gray-700">Lettrable</label>
          </div>
          <InputField label="Compte collectif" value={accountForm.compteCollectif}
            onChange={(v) => setAccountForm({ ...accountForm, compteCollectif: v })} placeholder="Optionnel" />
        </Modal>
      )}

      {/* Tax Modal */}
      {showTaxModal && (
        <Modal title="Ajouter un taux" onClose={() => setShowTaxModal(false)} onSubmit={handleTaxSubmit}>
          <InputField label="Code" value={taxForm.code} required onChange={(v) => setTaxForm({ ...taxForm, code: v })} />
          <InputField label="Libelle" value={taxForm.libelle} required onChange={(v) => setTaxForm({ ...taxForm, libelle: v })} />
          <InputField label="Taux (%)" value={taxForm.taux} type="number" onChange={(v) => setTaxForm({ ...taxForm, taux: v })} />
          <SelectField label="Type" value={taxForm.type} onChange={(v) => setTaxForm({ ...taxForm, type: v })}
            options={['TVA', 'Retenue a la source', 'IMF', 'Patente', 'Autre'].map((t) => ({ value: t, label: t }))} />
          <InputField label="Compte collecte" value={taxForm.compteCollecte} onChange={(v) => setTaxForm({ ...taxForm, compteCollecte: v })} />
          <InputField label="Compte deductible" value={taxForm.compteDeductible} onChange={(v) => setTaxForm({ ...taxForm, compteDeductible: v })} />
        </Modal>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <Modal title="Ajouter une categorie" onClose={() => setShowCategoryModal(false)} onSubmit={handleCategorySubmit}>
          <InputField label="Code" value={categoryForm.code} required onChange={(v) => setCategoryForm({ ...categoryForm, code: v })} />
          <InputField label="Libelle" value={categoryForm.libelle} required onChange={(v) => setCategoryForm({ ...categoryForm, libelle: v })} />
          <InputField label="Duree (ans)" value={categoryForm.duree} type="number"
            onChange={(v) => {
              const duree = Number(v);
              const taux = duree > 0 ? (100 / duree).toFixed(2) : '';
              setCategoryForm({ ...categoryForm, duree: v, taux: String(taux) });
            }} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taux lineaire (%)</label>
            <input type="text" readOnly value={categoryForm.taux ? `${categoryForm.taux}%` : ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" />
          </div>
          <SelectField label="Methode" value={categoryForm.methode} onChange={(v) => setCategoryForm({ ...categoryForm, methode: v })}
            options={[{ value: 'Lineaire', label: 'Lineaire' }, { value: 'Degressif', label: 'Degressif' }]} />
          <InputField label="Compte bilan" value={categoryForm.compteBilan} onChange={(v) => setCategoryForm({ ...categoryForm, compteBilan: v })} />
          <InputField label="Compte amortissement" value={categoryForm.compteAmort} onChange={(v) => setCategoryForm({ ...categoryForm, compteAmort: v })} />
          <InputField label="Compte dotation" value={categoryForm.compteDotation} onChange={(v) => setCategoryForm({ ...categoryForm, compteDotation: v })} />
        </Modal>
      )}

      {/* Exercice Modal */}
      {showExerciceModal && (
        <Modal title="Creer un exercice comptable" onClose={() => setShowExerciceModal(false)} onSubmit={handleExerciceSubmit}>
          <InputField label="Date debut" value={exerciceForm.debut} type="date" required
            onChange={(v) => {
              const year = v ? new Date(v).getFullYear().toString() : '';
              setExerciceForm({ ...exerciceForm, debut: v, code: year });
            }} />
          <InputField label="Date fin" value={exerciceForm.fin} type="date" required
            onChange={(v) => setExerciceForm({ ...exerciceForm, fin: v })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input type="text" readOnly value={exerciceForm.code}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" />
          </div>
          <InputField label="Nombre de periodes" value={exerciceForm.periodes} type="number"
            onChange={(v) => setExerciceForm({ ...exerciceForm, periodes: v })} />
        </Modal>
      )}
    </div>
  );
};

export default AdminCompany;
