import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2, Image, CalendarDays, Coins, BookOpen, Receipt, Boxes,
  Plus, Search, Edit2, Trash2, Star, Upload, X, Save, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../../contexts/DataContext';

interface Props { subTab: number; setSubTab: (n: number) => void; }

const tabs = [
  { label: 'Informations legales', icon: Building2 },
  { label: 'Logo & En-tete', icon: Image },
  { label: 'Exercice comptable', icon: CalendarDays },
  { label: 'Devise', icon: Coins },
  { label: 'Plan SYSCOHADA', icon: BookOpen },
  { label: 'TVA & Taxes', icon: Receipt },
  { label: 'Categories immobilisations', icon: Boxes },
];

const OHADA_COUNTRIES = ['Cote d\'Ivoire','Cameroun','Senegal','Gabon','Congo','Tchad','RCA','Mali','Burkina Faso','Niger','Togo','Benin','Guinee Equatoriale','Comores','Guinee','Guinee-Bissau','RDC'];

const DEVISE_SYMBOLS: Record<string,string> = { XOF:'FCFA',XAF:'FCFA',EUR:'€',USD:'$' };

// --- Sub-components defined OUTSIDE AdminCompany to prevent remount on every render ---
const Modal: React.FC<{ title:string;onClose:()=>void;onSubmit:()=>void;submitLabel?:string;children:React.ReactNode }> = ({ title,onClose,onSubmit,submitLabel='Enregistrer',children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b"><h3 className="text-lg font-semibold text-gray-900">{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
      <div className="px-6 py-4 space-y-4">{children}</div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t"><button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Annuler</button><button onClick={onSubmit} className="px-4 py-2 text-sm text-white rounded-lg hover:opacity-90" style={{backgroundColor:'#C0322B'}}>{submitLabel}</button></div>
    </div>
  </div>
);
const InputField: React.FC<{ label:string;value:string;onChange:(v:string)=>void;type?:string;required?:boolean;placeholder?:string }> = ({ label,value,onChange,type='text',required,placeholder }) => (<div><label className="block text-sm font-medium text-gray-700 mb-1">{label}{required&&<span className="text-red-500 ml-1">*</span>}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" /></div>);
const SelectField: React.FC<{ label:string;value:string;onChange:(v:string)=>void;options:{value:string;label:string}[];required?:boolean }> = ({ label,value,onChange,options,required }) => (<div><label className="block text-sm font-medium text-gray-700 mb-1">{label}{required&&<span className="text-red-500 ml-1">*</span>}</label><select value={value} onChange={e=>onChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white">{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>);
const Badge: React.FC<{ text:string;color?:string }> = ({ text,color='gray' }) => { const c: Record<string,string> = { green:'bg-green-100 text-green-700',red:'bg-red-100 text-red-700',blue:'bg-blue-100 text-blue-700',yellow:'bg-yellow-100 text-yellow-700',gray:'bg-gray-100 text-gray-700',primary:'bg-primary-100 text-primary-700' }; return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c[color]||c.gray}`}>{text}</span>; };

// ─── LegalInfoSection ─────────────────────────────────────────────────────────
// CONTROLLED inputs with LOCAL state — l'état vit DANS ce composant, pas dans
// AdminCompany. Taper n'entraîne donc AUCUN re-render de l'ancêtre. React ne
// peut pas re-monter ce composant à cause d'une frappe clavier.
const DEFAULT_LEGAL = { raisonSociale:'',formeJuridique:'SARL',nif:'',rccm:'',capitalSocial:'',regimeFiscal:'Reel normal',adresse:'',ville:'',pays:"Cote d'Ivoire",telephone:'',email:'',siteWeb:'' };

interface LegalInfoSectionProps {
  initialValues: typeof DEFAULT_LEGAL;
  saveSetting: (key: string, value: any) => Promise<void>;
}

const CLS = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none";

const LegalInfoSection: React.FC<LegalInfoSectionProps> = ({ initialValues, saveSetting }) => {
  // État LOCAL — les mises à jour restent ici, AdminCompany ne re-rend PAS
  const [form, setForm] = useState({ ...DEFAULT_LEGAL, ...initialValues });
  const set = useCallback((field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value })),
  []);

  const handleSave = useCallback(async () => {
    if (!form.raisonSociale) { toast.error('La raison sociale est obligatoire'); return; }
    await saveSetting('admin_company_legal', form);
    toast.success('Informations legales enregistrees avec succes');
  }, [form, saveSetting]);

  return (
    <form onSubmit={e=>{e.preventDefault();handleSave();}} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale<span className="text-red-500 ml-1">*</span></label><input type="text" value={form.raisonSociale} onChange={set('raisonSociale')} className={CLS} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Forme juridique</label><select value={form.formeJuridique} onChange={set('formeJuridique')} className={CLS+' bg-white'}>{['SARL','SA','SAS','SNC','Entreprise individuelle','GIE'].map(f=><option key={f} value={f}>{f}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">NIF</label><input type="text" value={form.nif} onChange={set('nif')} className={CLS} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">RCCM</label><input type="text" value={form.rccm} onChange={set('rccm')} className={CLS} /></div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capital social</label>
          <div className="flex">
            <input type="number" value={form.capitalSocial} onChange={set('capitalSocial')} className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" />
            <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-600">FCFA</span>
          </div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Regime fiscal</label><select value={form.regimeFiscal} onChange={set('regimeFiscal')} className={CLS+' bg-white'}>{['Reel normal','Reel simplifie','BIC','BNC'].map(r=><option key={r} value={r}>{r}</option>)}</select></div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Adresse siege</label>
        <textarea value={form.adresse} onChange={set('adresse')} rows={3} className={CLS} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Ville</label><input type="text" value={form.ville} onChange={set('ville')} className={CLS} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Pays</label><select value={form.pays} onChange={set('pays')} className={CLS+' bg-white'}>{OHADA_COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label><input type="text" value={form.telephone} onChange={set('telephone')} className={CLS} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={set('email')} className={CLS} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Site web</label><input type="text" value={form.siteWeb} onChange={set('siteWeb')} className={CLS} /></div>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="flex items-center gap-2 px-6 py-2 text-white rounded-lg hover:opacity-90" style={{backgroundColor:'#C0322B'}}>
          <Save className="w-4 h-4" />Enregistrer
        </button>
      </div>
    </form>
  );
};

// ─── PlanSyscohadaSection ─────────────────────────────────────────────────────
// Isolated search state to prevent focus loss when typing in search box
interface PlanSyscohadaSectionProps {
  accounts: any[];
  onAddAccount: () => void;
}

const PlanSyscohadaSection: React.FC<PlanSyscohadaSectionProps> = ({ accounts, onAddAccount }) => {
  const [accountSearch, setAccountSearch] = useState('');
  const [accountClasseFilter, setAccountClasseFilter] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('');

  const filteredAccounts = accounts.filter((a) => {
    const ms = !accountSearch||a.numero.includes(accountSearch)||a.libelle.toLowerCase().includes(accountSearch.toLowerCase());
    const mc = !accountClasseFilter||a.classe===Number(accountClasseFilter);
    const mt = !accountTypeFilter||a.type===accountTypeFilter;
    return ms&&mc&&mt;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Rechercher un compte..." value={accountSearch} onChange={e=>setAccountSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" />
        </div>
        <select value={accountClasseFilter} onChange={e=>setAccountClasseFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none"><option value="">Toutes les classes</option>{[1,2,3,4,5,6,7,8,9].map(c=><option key={c} value={c}>Classe {c}</option>)}</select>
        <select value={accountTypeFilter} onChange={e=>setAccountTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none"><option value="">Tous les types</option>{['Bilan','Gestion','HAO'].map(t=><option key={t} value={t}>{t}</option>)}</select>
        <button onClick={onAddAccount} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm" style={{backgroundColor:'#C0322B'}}><Plus className="w-4 h-4" />Ajouter un compte</button>
        <button className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"><Upload className="w-4 h-4" />Importer</button>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Numero','Libelle','Classe','Type','Sens normal','Lettrable','Statut','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-200">{filteredAccounts.length===0?(<tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucun compte trouve</td></tr>):filteredAccounts.map(a=>(<tr key={a.numero} className="hover:bg-gray-50"><td className="px-4 py-3 font-mono font-medium">{a.numero}</td><td className="px-4 py-3">{a.libelle}</td><td className="px-4 py-3"><Badge text={`Classe ${a.classe}`} color={a.classe<=5?'blue':'primary'} /></td><td className="px-4 py-3">{a.type}</td><td className="px-4 py-3">{a.sens}</td><td className="px-4 py-3">{a.lettrable?'Oui':'Non'}</td><td className="px-4 py-3"><Badge text={a.actif?'Actif':'Inactif'} color={a.actif?'green':'red'} /></td><td className="px-4 py-3 flex gap-2"><button className="text-gray-400 hover:text-gray-600"><Edit2 className="w-4 h-4" /></button><button className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody></table>
      </div>
    </div>
  );
};

// ─── AdminCompany ─────────────────────────────────────────────────────────────
const AdminCompany: React.FC<Props> = ({ subTab, setSubTab }) => {
  const { adapter } = useData();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  // legalForm stored for initial load only — editing happens inside LegalInfoSection
  const [legalForm, setLegalForm] = useState({ ...DEFAULT_LEGAL });
  const [logoToggles, setLogoToggles] = useState({ etatsFinanciers:true,factures:true,entetePdf:true });
  const [deviseForm, setDeviseForm] = useState({ devise:'XOF',pays:"Cote d'Ivoire",fuseau:'Africa/Abidjan',formatNombre:'1 000 000',separateurDecimal:'virgule' });
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showExerciceModal, setShowExerciceModal] = useState(false);
  const [accountForm, setAccountForm] = useState({ numero:'',libelle:'',classe:'',type:'Bilan',sens:'Debiteur',lettrable:false,compteCollectif:'' });
  const [taxForm, setTaxForm] = useState({ code:'',libelle:'',taux:'',type:'TVA',compteCollecte:'',compteDeductible:'' });
  const [categoryForm, setCategoryForm] = useState({ code:'',libelle:'',duree:'',taux:'',methode:'Lineaire',compteBilan:'',compteAmort:'',compteDotation:'' });
  const [exerciceForm, setExerciceForm] = useState({ debut:'',fin:'',code:'',periodes:'12' });

  const saveSetting = useCallback(async (key: string, value: any) => {
    const data = { key, value: JSON.stringify(value), updatedAt: new Date().toISOString() };
    try { const existing = await adapter.getById('settings', key); if (existing) { await adapter.update('settings', key, data); } else { await adapter.create('settings', data); } } catch { try { await adapter.create('settings', data); } catch { /* silent */ } }
  }, [adapter]);

  const loadData = useCallback(async () => {
    try {
      const rawAccounts = await adapter.getAll<any>('accounts');
      setAccounts(rawAccounts.map((a: any) => ({ numero: a.code||a.numero, libelle: a.name||a.libelle, classe: Number(a.accountClass||a.classe||(a.code||'')[0]||0), type: a.accountType||a.type||(Number((a.code||'')[0])<=5?'Bilan':'Gestion'), sens: a.normalBalance==='credit'?'Crediteur':(a.normalBalance==='debit'?'Debiteur':(a.sens||'Debiteur')), lettrable: a.isReconcilable??a.lettrable??false, actif: a.isActive??a.actif??true })));
      const rawFy = await adapter.getAll<any>('fiscalYears');
      setExercices(rawFy.map((fy: any) => ({ code: fy.code, debut: fy.startDate||fy.debut, fin: fy.endDate||fy.fin, periodes: 12, statut: fy.isClosed?'Cloture':'Ouvert', actif: fy.isActive??fy.actif??false })));
      const allSettings = await adapter.getAll<any>('settings');
      const taxS = allSettings.find((s: any) => s.key === 'admin_taxes'); if (taxS?.value) setTaxes(JSON.parse(taxS.value));
      const catS = allSettings.find((s: any) => s.key === 'admin_asset_categories'); if (catS?.value) setCategories(JSON.parse(catS.value));
      const legS = allSettings.find((s: any) => s.key === 'admin_company_legal'); if (legS?.value) setLegalForm(prev => ({ ...prev, ...JSON.parse(legS.value) }));
      const devS = allSettings.find((s: any) => s.key === 'admin_company_devise'); if (devS?.value) setDeviseForm(prev => ({ ...prev, ...JSON.parse(devS.value) }));
      const logS = allSettings.find((s: any) => s.key === 'admin_company_logo'); if (logS?.value) setLogoToggles(JSON.parse(logS.value));
    } catch { /* ignored */ } finally { setLoading(false); }
  }, [adapter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogoSave = async () => { await saveSetting('admin_company_logo', logoToggles); toast.success('Parametres du logo enregistres avec succes'); };
  const handleDeviseSave = async () => { await saveSetting('admin_company_devise', deviseForm); toast.success('Parametres de devise enregistres avec succes'); };
  const handleAccountSubmit = async () => { if (!accountForm.numero||!accountForm.libelle) { toast.error('Le numero et le libelle sont obligatoires'); return; } try { await adapter.create('accounts', { code: accountForm.numero, name: accountForm.libelle, accountClass: Number(accountForm.classe||accountForm.numero[0]), accountType: accountForm.type.toLowerCase(), normalBalance: accountForm.sens==='Crediteur'?'credit':'debit', isReconcilable: accountForm.lettrable, isActive: true, level: 1 }); toast.success(`Compte ${accountForm.numero} ajoute avec succes`); setShowAccountModal(false); setAccountForm({ numero:'',libelle:'',classe:'',type:'Bilan',sens:'Debiteur',lettrable:false,compteCollectif:'' }); await loadData(); } catch { toast.error('Erreur lors de l\'ajout du compte'); } };
  const handleTaxSubmit = async () => { if (!taxForm.code||!taxForm.libelle) { toast.error('Le code et le libelle sont obligatoires'); return; } const n = [...taxes, { ...taxForm, taux: Number(taxForm.taux), actif: true }]; setTaxes(n); await saveSetting('admin_taxes', n); toast.success(`Taxe ${taxForm.code} ajoutee avec succes`); setShowTaxModal(false); setTaxForm({ code:'',libelle:'',taux:'',type:'TVA',compteCollecte:'',compteDeductible:'' }); };
  const handleCategorySubmit = async () => { if (!categoryForm.code||!categoryForm.libelle) { toast.error('Le code et le libelle sont obligatoires'); return; } const n = [...categories, { ...categoryForm, duree: Number(categoryForm.duree), taux: Number(categoryForm.taux) }]; setCategories(n); await saveSetting('admin_asset_categories', n); toast.success(`Categorie ${categoryForm.code} ajoutee avec succes`); setShowCategoryModal(false); setCategoryForm({ code:'',libelle:'',duree:'',taux:'',methode:'Lineaire',compteBilan:'',compteAmort:'',compteDotation:'' }); };
  const handleExerciceSubmit = async () => { if (!exerciceForm.debut||!exerciceForm.fin) { toast.error('Les dates de debut et de fin sont obligatoires'); return; } try { await adapter.create('fiscalYears', { code: exerciceForm.code, name: `Exercice ${exerciceForm.code}`, startDate: exerciceForm.debut, endDate: exerciceForm.fin, isClosed: false, isActive: true }); toast.success(`Exercice ${exerciceForm.code} cree avec succes`); setShowExerciceModal(false); setExerciceForm({ debut:'',fin:'',code:'',periodes:'12' }); await loadData(); } catch { toast.error('Erreur lors de la creation de l\'exercice'); } };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Chargement...</span></div>;

  const renderLogoEntete = () => (<div className="space-y-6"><div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-red-400 transition-colors cursor-pointer"><Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" /><p className="text-sm text-gray-600 mb-1">Glissez-deposez votre logo ici ou cliquez pour parcourir</p><p className="text-xs text-gray-400">PNG, JPG ou SVG - Max 2Mo</p></div><div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm font-medium text-gray-700 mb-2">Apercu du logo actuel</p><div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center"><Image className="w-8 h-8 text-gray-400" /></div></div><div className="space-y-3">{([{key:'etatsFinanciers' as const,label:'Afficher sur les etats financiers'},{key:'factures' as const,label:'Afficher sur les factures'},{key:'entetePdf' as const,label:'Afficher dans l\'en-tete PDF'}]).map(({key,label})=>(<div key={key} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"><span className="text-sm text-gray-700">{label}</span><button onClick={()=>setLogoToggles({...logoToggles,[key]:!logoToggles[key]})} className={`w-10 h-6 rounded-full transition-colors relative ${logoToggles[key]?'bg-red-500':'bg-gray-300'}`}><span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${logoToggles[key]?'left-[18px]':'left-0.5'}`} /></button></div>))}</div><div className="flex justify-end"><button onClick={handleLogoSave} className="flex items-center gap-2 px-6 py-2 text-white rounded-lg hover:opacity-90" style={{backgroundColor:'#C0322B'}}><Save className="w-4 h-4" />Enregistrer</button></div></div>);

  const renderExerciceComptable = () => (<div className="space-y-4"><div className="flex justify-end"><button onClick={()=>setShowExerciceModal(true)} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm" style={{backgroundColor:'#C0322B'}}><Plus className="w-4 h-4" />Creer un exercice</button></div><div className="overflow-x-auto border border-gray-200 rounded-lg"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Code','Date debut','Date fin','Nb periodes','Statut','Actif','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-200">{exercices.length===0?(<tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun exercice comptable</td></tr>):exercices.map(ex=>(<tr key={ex.code} className="hover:bg-gray-50"><td className="px-4 py-3 font-medium">{ex.code}</td><td className="px-4 py-3">{ex.debut}</td><td className="px-4 py-3">{ex.fin}</td><td className="px-4 py-3">{ex.periodes}</td><td className="px-4 py-3"><Badge text={ex.statut} color={ex.statut==='Ouvert'?'green':'red'} /></td><td className="px-4 py-3">{ex.actif&&<Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}</td><td className="px-4 py-3"><button className="text-gray-400 hover:text-gray-600"><Edit2 className="w-4 h-4" /></button></td></tr>))}</tbody></table></div></div>);

  const renderDevise = () => (<div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><SelectField label="Devise principale" value={deviseForm.devise} onChange={v=>setDeviseForm({...deviseForm,devise:v})} options={[{value:'XOF',label:'XOF - FCFA UEMOA'},{value:'XAF',label:'XAF - FCFA CEMAC'},{value:'EUR',label:'EUR - Euro'},{value:'USD',label:'USD - Dollar US'}]} /><SelectField label="Pays OHADA" value={deviseForm.pays} onChange={v=>setDeviseForm({...deviseForm,pays:v})} options={OHADA_COUNTRIES.map(c=>({value:c,label:c}))} /><SelectField label="Fuseau horaire" value={deviseForm.fuseau} onChange={v=>setDeviseForm({...deviseForm,fuseau:v})} options={[{value:'Africa/Abidjan',label:'Africa/Abidjan (GMT+0)'},{value:'Africa/Douala',label:'Africa/Douala (GMT+1)'},{value:'Africa/Dakar',label:'Africa/Dakar (GMT+0)'},{value:'Africa/Libreville',label:'Africa/Libreville (GMT+1)'},{value:'Africa/Brazzaville',label:'Africa/Brazzaville (GMT+1)'},{value:'Africa/Ndjamena',label:'Africa/Ndjamena (GMT+1)'}]} /><div><label className="block text-sm font-medium text-gray-700 mb-1">Symbole devise</label><input type="text" readOnly value={DEVISE_SYMBOLS[deviseForm.devise]||''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" /></div><SelectField label="Format nombre" value={deviseForm.formatNombre} onChange={v=>setDeviseForm({...deviseForm,formatNombre:v})} options={[{value:'1 000 000',label:'1 000 000'},{value:'1.000.000',label:'1.000.000'}]} /><SelectField label="Separateur decimal" value={deviseForm.separateurDecimal} onChange={v=>setDeviseForm({...deviseForm,separateurDecimal:v})} options={[{value:'virgule',label:'Virgule (,)'},{value:'point',label:'Point (.)'}]} /></div><div className="flex justify-end"><button onClick={handleDeviseSave} className="flex items-center gap-2 px-6 py-2 text-white rounded-lg hover:opacity-90" style={{backgroundColor:'#C0322B'}}><Save className="w-4 h-4" />Enregistrer</button></div></div>);

  const renderTvaTaxes = () => (<div className="space-y-4"><div className="flex justify-end"><button onClick={()=>setShowTaxModal(true)} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm" style={{backgroundColor:'#C0322B'}}><Plus className="w-4 h-4" />Ajouter un taux</button></div><div className="overflow-x-auto border border-gray-200 rounded-lg"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Code','Libelle','Taux (%)','Type','Compte collecte','Compte deductible','Statut','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-200">{taxes.length===0?(<tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucune taxe configuree</td></tr>):taxes.map((t: any)=>{const tc:Record<string,string>={TVA:'blue',Retenue:'yellow',IMF:'primary',Patente:'green'};return(<tr key={t.code} className="hover:bg-gray-50"><td className="px-4 py-3 font-mono font-medium">{t.code}</td><td className="px-4 py-3">{t.libelle}</td><td className="px-4 py-3">{t.taux}%</td><td className="px-4 py-3"><Badge text={t.type} color={tc[t.type]||'gray'} /></td><td className="px-4 py-3 font-mono">{t.compteCollecte}</td><td className="px-4 py-3 font-mono">{t.compteDeductible||'-'}</td><td className="px-4 py-3"><Badge text="Actif" color="green" /></td><td className="px-4 py-3 flex gap-2"><button className="text-gray-400 hover:text-gray-600"><Edit2 className="w-4 h-4" /></button><button className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td></tr>);})}</tbody></table></div></div>);

  const renderCategoriesImmobilisations = () => (<div className="space-y-4"><div className="flex justify-end"><button onClick={()=>setShowCategoryModal(true)} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm" style={{backgroundColor:'#C0322B'}}><Plus className="w-4 h-4" />Ajouter une categorie</button></div><div className="overflow-x-auto border border-gray-200 rounded-lg"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Code','Libelle','Duree (ans)','Taux lineaire (%)','Methode','Compte bilan','Compte amort','Compte dotation','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-200">{categories.length===0?(<tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Aucune categorie d'immobilisation</td></tr>):categories.map((c: any)=>(<tr key={c.code} className="hover:bg-gray-50"><td className="px-4 py-3 font-mono font-medium">{c.code}</td><td className="px-4 py-3">{c.libelle}</td><td className="px-4 py-3">{c.duree||'-'}</td><td className="px-4 py-3">{c.taux?`${c.taux}%`:'-'}</td><td className="px-4 py-3">{c.methode}</td><td className="px-4 py-3 font-mono">{c.compteBilan}</td><td className="px-4 py-3 font-mono">{c.compteAmort}</td><td className="px-4 py-3 font-mono">{c.compteDotation}</td><td className="px-4 py-3 flex gap-2"><button className="text-gray-400 hover:text-gray-600"><Edit2 className="w-4 h-4" /></button><button className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody></table></div></div>);

  const renderTabContent = () => {
    switch(subTab) {
      case 0: return <LegalInfoSection initialValues={legalForm} saveSetting={saveSetting} />;
      case 1: return renderLogoEntete();
      case 2: return renderExerciceComptable();
      case 3: return renderDevise();
      case 4: return <PlanSyscohadaSection accounts={accounts} onAddAccount={()=>setShowAccountModal(true)} />;
      case 5: return renderTvaTaxes();
      case 6: return renderCategoriesImmobilisations();
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">{tabs.map((tab,i)=>{const Icon=tab.icon;return(<button key={i} onClick={()=>setSubTab(i)} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${subTab===i?'bg-white text-red-600 shadow-sm':'text-gray-600 hover:text-gray-900'}`}><Icon className="w-4 h-4" />{tab.label}</button>);})}</div>
      <div className="bg-white rounded-lg border border-gray-200 p-6">{renderTabContent()}</div>
      {showAccountModal&&(<Modal title="Ajouter un compte" onClose={()=>setShowAccountModal(false)} onSubmit={handleAccountSubmit}><InputField label="Numero" value={accountForm.numero} required onChange={v=>setAccountForm({...accountForm,numero:v,classe:v?v[0]:''})} /><InputField label="Libelle" value={accountForm.libelle} required onChange={v=>setAccountForm({...accountForm,libelle:v})} /><div><label className="block text-sm font-medium text-gray-700 mb-1">Classe</label><input type="text" readOnly value={accountForm.classe?`Classe ${accountForm.classe}`:''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" /></div><SelectField label="Type" value={accountForm.type} onChange={v=>setAccountForm({...accountForm,type:v})} options={['Bilan','Gestion','HAO'].map(t=>({value:t,label:t}))} /><SelectField label="Sens normal" value={accountForm.sens} onChange={v=>setAccountForm({...accountForm,sens:v})} options={[{value:'Debiteur',label:'Debiteur'},{value:'Crediteur',label:'Crediteur'}]} /><div className="flex items-center gap-2"><input type="checkbox" id="lettrable" checked={accountForm.lettrable} onChange={e=>setAccountForm({...accountForm,lettrable:e.target.checked})} className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500" /><label htmlFor="lettrable" className="text-sm text-gray-700">Lettrable</label></div><InputField label="Compte collectif" value={accountForm.compteCollectif} onChange={v=>setAccountForm({...accountForm,compteCollectif:v})} placeholder="Optionnel" /></Modal>)}
      {showTaxModal&&(<Modal title="Ajouter un taux" onClose={()=>setShowTaxModal(false)} onSubmit={handleTaxSubmit}><InputField label="Code" value={taxForm.code} required onChange={v=>setTaxForm({...taxForm,code:v})} /><InputField label="Libelle" value={taxForm.libelle} required onChange={v=>setTaxForm({...taxForm,libelle:v})} /><InputField label="Taux (%)" value={taxForm.taux} type="number" onChange={v=>setTaxForm({...taxForm,taux:v})} /><SelectField label="Type" value={taxForm.type} onChange={v=>setTaxForm({...taxForm,type:v})} options={['TVA','Retenue a la source','IMF','Patente','Autre'].map(t=>({value:t,label:t}))} /><InputField label="Compte collecte" value={taxForm.compteCollecte} onChange={v=>setTaxForm({...taxForm,compteCollecte:v})} /><InputField label="Compte deductible" value={taxForm.compteDeductible} onChange={v=>setTaxForm({...taxForm,compteDeductible:v})} /></Modal>)}
      {showCategoryModal&&(<Modal title="Ajouter une categorie" onClose={()=>setShowCategoryModal(false)} onSubmit={handleCategorySubmit}><InputField label="Code" value={categoryForm.code} required onChange={v=>setCategoryForm({...categoryForm,code:v})} /><InputField label="Libelle" value={categoryForm.libelle} required onChange={v=>setCategoryForm({...categoryForm,libelle:v})} /><InputField label="Duree (ans)" value={categoryForm.duree} type="number" onChange={v=>{const d=Number(v);const t=d>0?(100/d).toFixed(2):'';setCategoryForm({...categoryForm,duree:v,taux:String(t)});}} /><div><label className="block text-sm font-medium text-gray-700 mb-1">Taux lineaire (%)</label><input type="text" readOnly value={categoryForm.taux?`${categoryForm.taux}%`:''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" /></div><SelectField label="Methode" value={categoryForm.methode} onChange={v=>setCategoryForm({...categoryForm,methode:v})} options={[{value:'Lineaire',label:'Lineaire'},{value:'Degressif',label:'Degressif'}]} /><InputField label="Compte bilan" value={categoryForm.compteBilan} onChange={v=>setCategoryForm({...categoryForm,compteBilan:v})} /><InputField label="Compte amortissement" value={categoryForm.compteAmort} onChange={v=>setCategoryForm({...categoryForm,compteAmort:v})} /><InputField label="Compte dotation" value={categoryForm.compteDotation} onChange={v=>setCategoryForm({...categoryForm,compteDotation:v})} /></Modal>)}
      {showExerciceModal&&(<Modal title="Creer un exercice comptable" onClose={()=>setShowExerciceModal(false)} onSubmit={handleExerciceSubmit}><InputField label="Date debut" value={exerciceForm.debut} type="date" required onChange={v=>{const y=v?new Date(v).getFullYear().toString():'';setExerciceForm({...exerciceForm,debut:v,code:y});}} /><InputField label="Date fin" value={exerciceForm.fin} type="date" required onChange={v=>setExerciceForm({...exerciceForm,fin:v})} /><div><label className="block text-sm font-medium text-gray-700 mb-1">Code</label><input type="text" readOnly value={exerciceForm.code} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" /></div><InputField label="Nombre de periodes" value={exerciceForm.periodes} type="number" onChange={v=>setExerciceForm({...exerciceForm,periodes:v})} /></Modal>)}
    </div>
  );
};

export default AdminCompany;
