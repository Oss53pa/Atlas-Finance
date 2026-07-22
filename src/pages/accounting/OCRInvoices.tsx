import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOCRConfig,
  saveOCRConfig,
  listScannedDocuments,
  saveScannedDocument,
  extractInvoice,
  createEntryFromInvoice,
  detectInvoiceDirection,
  fileToBase64,
  isOCRConfigured,
  type OCRConfig,
  type ScannedInvoice,
  type ExtractedData,
  type CompanyIdentity,
} from '../../services/ocr';
import {
  ScanLine, Upload, FileText, Check, X, AlertTriangle,
  Download, Eye, Edit, Trash2, Filter, Search, Calendar,
  DollarSign, User, Users, Building2, Hash, Clock, CheckCircle,
  XCircle, RefreshCw, Settings, ChevronRight, Image,
  File, Database, Zap, Brain, Sparkles, FileCheck,
  Camera, Paperclip, Globe, Shield, Info, ChevronDown,
  Activity, TrendingUp, BarChart3, FileX, AlertCircle,
  Loader2, ArrowRight, Copy, Share2, Archive, Tag
} from 'lucide-react';

interface OCRSettings {
  autoValidate: boolean;
  confidenceThreshold: number;
  defaultCurrency: string;
  defaultTaxRate: number;
  duplicateCheck: boolean;
  extractLineItems: boolean;
  language: string;
  enhanceImage: boolean;
}

const OCRInvoices: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ocrConfig, setOcrConfig] = useState<OCRConfig | null>(null);
  // Ref pour éviter les closures périmées dans les handlers drag-drop (useCallback []).
  const ocrConfigRef = useRef<OCRConfig | null>(null);
  // Identité de la société (settings.admin_company_legal) — sert à détecter le
  // sens achat/vente d'une facture (émetteur = nous → vente).
  const [company, setCompany] = useState<CompanyIdentity | null>(null);
  const companyRef = useRef<CompanyIdentity | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ScannedInvoice | null>(null);
  const [processingFiles, setProcessingFiles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'scan' | 'review' | 'validated' | 'analytics'>('scan');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  const [settings, setSettings] = useState<OCRSettings>({
    autoValidate: true,
    confidenceThreshold: 85,
    defaultCurrency: 'XAF',
    defaultTaxRate: 19.25,
    duplicateCheck: true,
    extractLineItems: true,
    language: 'fr',
    enhanceImage: true
  });

  const [scannedInvoices, setScannedInvoices] = useState<ScannedInvoice[]>([]);

  // Charge la config OCR + les factures déjà scannées (persistées dans settings).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await getOCRConfig(adapter);
      if (cancelled) return;
      ocrConfigRef.current = cfg;
      setOcrConfig(cfg);
      setSettings(s => ({
        ...s,
        autoValidate: cfg.autoValidate,
        confidenceThreshold: cfg.confidenceThreshold,
        defaultCurrency: cfg.defaultCurrency,
        defaultTaxRate: cfg.defaultTaxRate,
        duplicateCheck: cfg.duplicateCheck,
        extractLineItems: cfg.extractLineItems,
        language: cfg.language,
        enhanceImage: cfg.enhanceImage,
      }));
      try {
        const docs = await listScannedDocuments(adapter);
        if (!cancelled) setScannedInvoices(docs);
      } catch { /* table vide ou indisponible */ }
      // Identité société (source canonique) pour l'auto-détection achat/vente.
      try {
        const legal = await adapter.getById<{ value?: string } & Record<string, unknown>>('settings', 'admin_company_legal');
        if (!cancelled && legal) {
          const v: any = legal.value ? JSON.parse(legal.value) : legal;
          const ident: CompanyIdentity = {
            name: v?.legalName || v?.name || v?.raisonSociale || v?.companyName || '',
            taxId: v?.taxId || v?.nif || v?.ifu || v?.rccm || v?.numeroContribuable || '',
          };
          companyRef.current = ident;
          setCompany(ident);
        }
      } catch { /* identité indisponible → achat par défaut */ }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

  const configured = isOCRConfigured(ocrConfig);

  const blankExtracted = (): ExtractedData => ({
    documentType: 'invoice',
    documentNumber: '', documentDate: '', dueDate: '',
    supplierName: '', supplierAddress: '', supplierCountry: '', supplierTaxId: '',
    subtotal: 0, taxAmount: 0, discountAmount: 0, shippingAmount: 0, totalAmount: 0,
    currency: ocrConfigRef.current?.defaultCurrency || 'XAF',
    items: [],
  });

  const stats = {
    total: scannedInvoices.length,
    pending: scannedInvoices.filter(i => i.status === 'review').length,
    validated: scannedInvoices.filter(i => i.status === 'validated').length,
    errors: scannedInvoices.filter(i => i.status === 'error').length,
    totalAmount: scannedInvoices
      .filter(i => i.status === 'validated')
      .reduce((sum, i) => sum + i.extractedData.totalAmount, 0),
    averageConfidence: scannedInvoices.length > 0
      ? Math.round(scannedInvoices.reduce((sum, i) => sum + i.confidence, 0) / scannedInvoices.length)
      : 0,
    processingTime: '-',
    // Taux de succès = part des documents extraits sans erreur (review/validated) sur le total scanné.
    successRate: scannedInvoices.length > 0
      ? Math.round(
          (scannedInvoices.filter(i => i.status === 'review' || i.status === 'validated').length /
            scannedInvoices.length) * 100
        )
      : 0
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFiles = (files: FileList) => {
    const filesArray = Array.from(files);
    filesArray.forEach(file => {
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        processFile(file);
      } else {
        toast.error(t('ocr.unsupportedFormat', { name: file.name }));
      }
    });
  };

  const processFile = async (file: File) => {
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cfg = ocrConfigRef.current;
    const userName = user?.name || t('ocr.defaultUser');

    let dataUrl = '';
    try {
      dataUrl = (await fileToBase64(file)).dataUrl;
    } catch { /* aperçu indisponible */ }

    // Aucun moteur configuré : on enregistre le fichier sans extraction.
    if (!isOCRConfigured(cfg)) {
      const doc: ScannedInvoice = {
        id: fileId, fileName: file.name, fileSize: file.size, fileType: file.type,
        uploadDate: new Date(), status: 'error', confidence: 0,
        extractedData: blankExtracted(), originalFileUrl: dataUrl, tags: [],
        notes: t('ocr.notConfiguredNote'),
        auditLog: [{ action: 'uploaded', user: userName, timestamp: new Date() }],
      };
      setScannedInvoices(prev => [doc, ...prev]);
      await saveScannedDocument(adapter, doc).catch(() => {});
      toast.error(t('ocr.noServiceToast'));
      return;
    }

    setProcessingFiles(prev => [...prev, fileId]);
    try {
      const result = await extractInvoice(file, cfg!);
      const doc: ScannedInvoice = {
        id: fileId, fileName: file.name, fileSize: file.size, fileType: file.type,
        uploadDate: new Date(), processedDate: new Date(),
        status: result.success ? 'review' : 'error',
        confidence: result.confidence,
        extractedData: result.data ?? blankExtracted(),
        originalFileUrl: dataUrl,
        ocrText: result.rawText,
        provider: result.provider,
        notes: result.success ? undefined : result.error,
        tags: [],
        auditLog: [{ action: result.success ? 'extracted' : 'extraction_failed', user: userName, timestamp: new Date(), details: result.error }],
      };

      // Sens achat/vente auto-détecté (corrigeable dans l'écran de revue).
      if (result.success && result.data) {
        doc.extractedData.direction = detectInvoiceDirection(doc.extractedData, companyRef.current);
      }

      // Validation automatique si activée et confiance suffisante : crée l'écriture
      // en BROUILLON (à valider dans le journal).
      if (result.success && cfg!.autoValidate && result.confidence >= cfg!.confidenceThreshold) {
        try {
          const entryId = await createEntryFromInvoice(adapter, doc.extractedData, cfg!, { createdBy: `ocr:${user?.id || ''}`, company: companyRef.current });
          doc.status = 'validated';
          doc.validatedBy = `${userName} (auto)`;
          doc.validatedAt = new Date();
          doc.accountingEntryId = entryId;
        } catch { /* on laisse en review si la compta échoue */ }
      }

      setScannedInvoices(prev => [doc, ...prev]);
      await saveScannedDocument(adapter, doc).catch(() => {});

      if (result.success) {
        const jrn = doc.extractedData.direction === 'sale' ? 'VE' : 'AC';
        toast.success(
          `${t('ocr.extractedToast', { confidence: String(result.confidence) })}${
            doc.status === 'validated' ? ` (${t('ocr.draftToValidate', { journal: jrn })})` : ''
          }`
        );
      } else {
        toast.error(t('ocr.extractionFailed', { error: String(result.error ?? '') }));
      }
    } finally {
      setProcessingFiles(prev => prev.filter(id => id !== fileId));
    }
  };

  // Bascule manuelle achat/vente d'un document en cours de revue (corrige
  // l'auto-détection) — met à jour l'écran ET la persistance.
  const setInvoiceDirection = (invoice: ScannedInvoice, direction: 'purchase' | 'sale') => {
    const updated: ScannedInvoice = {
      ...invoice,
      extractedData: { ...invoice.extractedData, direction },
    };
    setScannedInvoices(prev => prev.map(i => i.id === invoice.id ? updated : i));
    if (selectedInvoice?.id === invoice.id) setSelectedInvoice(updated);
    saveScannedDocument(adapter, updated).catch(() => {});
  };

  const validateInvoice = async (invoice: ScannedInvoice) => {
    const cfg = ocrConfig;
    if (!cfg) { toast.error(t('ocr.configNotFound')); return; }
    let entryId = invoice.accountingEntryId;
    try {
      if (!entryId) {
        entryId = await createEntryFromInvoice(adapter, invoice.extractedData, cfg, { createdBy: `ocr:${user?.id || ''}`, company: companyRef.current });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('ocr.postingFailed'));
      return;
    }
    const updated: ScannedInvoice = {
      ...invoice,
      status: 'validated',
      validatedBy: user?.name || t('ocr.defaultUser'),
      validatedAt: new Date(),
      accountingEntryId: entryId,
    };
    setScannedInvoices(prev => prev.map(i => i.id === invoice.id ? updated : i));
    await saveScannedDocument(adapter, updated).catch(() => {});
    const jrn = invoice.extractedData.direction === 'sale' ? 'VE' : 'AC';
    toast.success(t('ocr.entryCreatedDraft', { journal: jrn }));
  };

  const rejectInvoice = async (invoice: ScannedInvoice, reason: string) => {
    const updated: ScannedInvoice = {
      ...invoice,
      status: 'rejected',
      rejectedBy: user?.name || t('ocr.defaultUser'),
      rejectedAt: new Date(),
      rejectionReason: reason,
    };
    setScannedInvoices(prev => prev.map(i => i.id === invoice.id ? updated : i));
    await saveScannedDocument(adapter, updated).catch(() => {});
    toast(t('ocr.invoiceRejected'));
  };

  const bulkValidate = async () => {
    const targets = scannedInvoices.filter(i => selectedInvoices.includes(i.id) && i.status === 'review');
    if (targets.length === 0) { toast(t('ocr.noInvoiceToReview')); return; }
    let ok = 0;
    for (const inv of targets) {
      try { await validateInvoice(inv); ok++; } catch { /* ignorée */ }
    }
    setSelectedInvoices([]);
    toast.success(t('ocr.bulkValidated', { ok: String(ok), total: String(targets.length) }));
  };

  const bulkReject = async () => {
    const targets = scannedInvoices.filter(i => selectedInvoices.includes(i.id) && i.status === 'review');
    for (const inv of targets) {
      await rejectInvoice(inv, t('ocr.bulkRejectReason'));
    }
    setSelectedInvoices([]);
    toast(t('ocr.bulkRejected', { count: String(targets.length) }));
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'uploading': 'text-gray-700 bg-gray-100',
      'processing': 'text-blue-600 bg-blue-100',
      'review': 'text-yellow-600 bg-yellow-100',
      'validated': 'text-green-600 bg-green-100',
      'rejected': 'text-red-600 bg-red-100',
      'error': 'text-red-600 bg-red-100',
      'archived': 'text-gray-700 bg-gray-100'
    };
    return colors[status] || 'text-gray-700 bg-gray-100';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };


  const filteredInvoices = scannedInvoices.filter(invoice => {
    if (filter !== 'all' && invoice.status !== filter) return false;
    if (searchQuery && !invoice.fileName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !invoice.extractedData.supplierName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex h-full bg-[var(--color-background)]">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* OCR Service Notice — affiché uniquement si aucun moteur n'est configuré */}
        {ocrConfig && !configured && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">{t('ocr.noticeTitle')}</p>
                <p className="text-xs text-amber-600">{t('ocr.noticeDesc')}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/workspace/admin')}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors whitespace-nowrap flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              {t('ocr.configure')}
            </button>
          </div>
        )}
        {/* Header */}
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-3">
                <ScanLine className="w-8 h-8 text-[var(--color-primary)]" />
                {t('ocr.title')}
              </h1>
              <p className="text-[var(--color-text-secondary)] mt-1">
                {t('ocr.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {t('ocr.settings')}
              </button>
              <button
                onClick={() => setBatchMode(!batchMode)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  batchMode
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <Copy className="w-4 h-4" />
                {t('ocr.batchMode')}
              </button>
              <button
                onClick={() => { setActiveTab('scan'); fileInputRef.current?.click(); }}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                {t('ocr.scan')}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-t border-[var(--color-border)] -mx-6 px-6 pt-3">
            {[
              { id: 'scan', label: t('ocr.tabScan'), icon: ScanLine, count: processingFiles.length },
              { id: 'review', label: t('ocr.tabReview'), icon: Eye, count: stats.pending },
              { id: 'validated', label: t('ocr.tabValidated'), icon: CheckCircle, count: stats.validated },
              { id: 'analytics', label: t('ocr.tabAnalytics'), icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative ${
                  activeTab === tab.id
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {(tab.count ?? 0) > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === tab.id
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Statistics Bar */}
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-3">
          <div className="grid grid-cols-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-primary-light)] rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">{t('ocr.statTotal')}</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{formatNumber(stats.total)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">{t('status.pending')}</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{stats.pending}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">{t('ocr.statValidated')}</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{stats.validated}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-info-light)] rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-[var(--color-info)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">{t('ocr.statAvgConfidence')}</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{stats.averageConfidence}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-success-light)] rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-[var(--color-success)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">{t('ocr.statAvgTime')}</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{stats.processingTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-accent-light)] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[var(--color-accent)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">{t('ocr.statSuccessRate')}</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{stats.successRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'scan' && (
            <div className="space-y-6">
              {/* Upload Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragActive
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  className="hidden"
                />

                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-10 h-10 text-[var(--color-primary)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                    {t('ocr.dropHere')}
                  </h3>
                  <p className="text-[var(--color-text-secondary)] mb-4">
                    {t('ocr.dropHint')}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors inline-flex items-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    {t('ocr.selectFiles')}
                  </button>
                  <div className="mt-6 flex items-center justify-center gap-8 text-sm text-[var(--color-text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>{t('ocr.gdprCompliant')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span>{t('ocr.multiLanguage')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      <span>{t('ocr.advancedAI')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Processing Files */}
              {processingFiles.length > 0 && (
                <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                    {t('ocr.processing')}
                  </h3>
                  <div className="space-y-3">
                    {processingFiles.map(fileId => (
                      <div key={fileId} className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 text-[var(--color-primary)] animate-spin" />
                          <div>
                            <p className="font-medium text-[var(--color-text-primary)]">
                              {t('ocr.extracting')}
                            </p>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              {t('ocr.aiAnalysis')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div className="bg-[var(--color-primary)] h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'review' || activeTab === 'validated') && (
            <div className="space-y-4">
              {/* Search and Filter Bar */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-tertiary)] w-5 h-5" />
                  <input
                    type="text"
                    placeholder={t('ocr.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="all">{t('ocr.filterAll')}</option>
                  <option value="review">{t('ocr.filterReview')}</option>
                  <option value="validated">{t('ocr.filterValidated')}</option>
                  <option value="rejected">{t('ocr.filterRejected')}</option>
                  <option value="error">{t('ocr.filterErrors')}</option>
                </select>
                {batchMode && selectedInvoices.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {t('ocr.selectedCount', { count: String(selectedInvoices.length) })}
                    </span>
                    <button onClick={bulkValidate} className="px-3 py-1.5 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] transition-colors text-sm">
                      {t('ocr.validateSelection')}
                    </button>
                    <button onClick={bulkReject} className="px-3 py-1.5 bg-[var(--color-error)] text-white rounded-lg hover:bg-[var(--color-error-dark)] transition-colors text-sm">
                      {t('ocr.reject')}
                    </button>
                  </div>
                )}
              </div>

              {/* Invoices Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredInvoices
                  .filter(i => activeTab === 'review' ? i.status === 'review' : i.status === 'validated')
                  .map(invoice => (
                  <div
                    key={invoice.id}
                    className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => !batchMode && setSelectedInvoice(invoice)}
                  >
                    {/* Invoice Header */}
                    <div className="p-4 border-b border-[var(--color-border)]">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          {batchMode && (
                            <input
                              type="checkbox"
                              checked={selectedInvoices.includes(invoice.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedInvoices([...selectedInvoices, invoice.id]);
                                } else {
                                  setSelectedInvoices(selectedInvoices.filter(id => id !== invoice.id));
                                }
                              }}
                              className="w-4 h-4 mt-1 text-[var(--color-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-primary)]"
                            />
                          )}
                          <div className="w-10 h-10 bg-[var(--color-primary-light)] rounded-lg flex items-center justify-center">
                            {invoice.fileType.startsWith('image/') ? (
                              <Image className="w-5 h-5 text-[var(--color-primary)]" />
                            ) : (
                              <FileText className="w-5 h-5 text-[var(--color-primary)]" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-[var(--color-text-primary)]">
                              {invoice.extractedData.documentNumber}
                            </h3>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                              {invoice.fileName}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status === 'review' ? t('ocr.statusReview') :
                           invoice.status === 'validated' ? t('ocr.statusValidated') :
                           invoice.status === 'rejected' ? t('ocr.statusRejected') : invoice.status}
                        </span>
                      </div>

                      {/* Confidence Score */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-[var(--color-text-secondary)]">{t('ocr.aiConfidence')}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                invoice.confidence >= 90 ? 'bg-green-500' :
                                invoice.confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${invoice.confidence}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs font-medium ${getConfidenceColor(invoice.confidence)}`}>
                            {invoice.confidence}%
                          </span>
                        </div>
                      </div>

                      {/* Supplier Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                          <span className="text-[var(--color-text-primary)] font-medium">
                            {invoice.extractedData.supplierName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                          <span className="text-[var(--color-text-secondary)]">
                            {new Date(invoice.extractedData.documentDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sens comptable : Achat (AC) / Vente (VE) — auto-détecté, corrigeable */}
                    <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-[var(--color-text-tertiary)]">{t('ocr.direction')}</span>
                      {invoice.status === 'review' ? (
                        <div className="inline-flex rounded-lg border border-[var(--color-border)] overflow-hidden text-xs">
                          <button
                            onClick={() => setInvoiceDirection(invoice, 'purchase')}
                            className={`px-2.5 py-1 transition-colors ${(invoice.extractedData.direction ?? 'purchase') === 'purchase' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}
                          >{t('ocr.purchaseAC')}</button>
                          <button
                            onClick={() => setInvoiceDirection(invoice, 'sale')}
                            className={`px-2.5 py-1 transition-colors ${invoice.extractedData.direction === 'sale' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}
                          >{t('ocr.saleVE')}</button>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                          {invoice.extractedData.direction === 'sale' ? t('ocr.saleVE') : t('ocr.purchaseAC')}
                        </span>
                      )}
                    </div>

                    {/* Invoice Amount */}
                    <div className="px-4 py-3 bg-[var(--color-background)]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">{t('ocr.totalAmount')}</span>
                        <span className="text-lg font-bold text-[var(--color-text-primary)]">
                          {formatCurrency(invoice.extractedData.totalAmount, invoice.extractedData.currency)}
                        </span>
                      </div>
                      {invoice.extractedData.items.length > 0 && (
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                          {t('ocr.lineItemsCount', { count: String(invoice.extractedData.items.length) })}
                        </p>
                      )}
                    </div>

                    {/* Validation Errors/Warnings */}
                    {invoice.validationErrors && invoice.validationErrors.length > 0 && (
                      <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-yellow-800">
                              {t('ocr.pointsToCheck', { count: String(invoice.validationErrors.length) })}
                            </p>
                            <p className="text-xs text-yellow-700 mt-0.5">
                              {invoice.validationErrors[0].message}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {invoice.status === 'review' && !batchMode && (
                      <div className="px-4 py-3 border-t border-[var(--color-border)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              validateInvoice(invoice);
                            }}
                            className="px-3 py-1.5 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] transition-colors text-sm flex items-center gap-1"
                          >
                            <Check className="w-4 h-4" />
                            {t('ocr.validate')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              rejectInvoice(invoice, t('ocr.rejectReasonIncorrectData'));
                            }}
                            className="px-3 py-1.5 bg-[var(--color-error)] text-white rounded-lg hover:bg-[var(--color-error-dark)] transition-colors text-sm flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            {t('ocr.reject')}
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(invoice);
                          }}
                          className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] text-sm flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          {t('ocr.edit')}
                        </button>
                      </div>
                    )}

                    {/* Validated Info */}
                    {invoice.status === 'validated' && invoice.validatedBy && (
                      <div className="px-4 py-2 bg-green-50 border-t border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <p className="text-xs text-green-800">
                            {t('ocr.validatedByOn', {
                              user: String(invoice.validatedBy),
                              date: invoice.validatedAt?.toLocaleDateString('fr-FR') ?? '',
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Analytics Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">{t('ocr.monthlyVolume')}</h3>
                    <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
                  </div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">{formatNumber(stats.total)}</div>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                    {t('ocr.scannedInvoices')}
                  </p>
                </div>

                <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">{t('ocr.totalAmount')}</h3>
                    <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">
                    {formatCurrency(stats.totalAmount)}
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                    {t('ocr.validatedInvoices')}
                  </p>
                </div>

                <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">{t('ocr.topSuppliers')}</h3>
                    <Users className="w-5 h-5 text-[var(--color-info)]" />
                  </div>
                  <div className="space-y-3">
                    {scannedInvoices.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-tertiary)]">{t('ocr.noScannedInvoice')}</p>
                    ) : (
                      Object.entries(
                        scannedInvoices.reduce<Record<string, number>>((acc, inv) => {
                          const name = inv.extractedData.supplierName;
                          acc[name] = (acc[name] || 0) + 1;
                          return acc;
                        }, {})
                      )
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3)
                        .map(([name, count]) => (
                          <div key={name} className="flex items-center justify-between">
                            <span className="text-sm text-[var(--color-text-primary)]">{name}</span>
                            <span className="text-sm font-medium text-[var(--color-text-primary)]">{count}</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">{t('ocr.aiPerformance')}</h3>
                    <Brain className="w-5 h-5 text-[var(--color-accent)]" />
                  </div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">
                    {stats.averageConfidence}%
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                    {t('ocr.avgAccuracy')}
                  </p>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--color-text-secondary)]">{t('ocr.processingTime')}</span>
                      <span className="text-[var(--color-text-primary)] font-medium">{stats.processingTime}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--color-text-secondary)]">{t('ocr.statSuccessRate')}</span>
                      <span className="text-[var(--color-text-primary)] font-medium">{stats.successRate}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Section */}
              <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                  {t('ocr.complianceStandards')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)]">{t('ocr.gdprCompliant')}</h4>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                        {t('ocr.gdprDesc')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)]">{t('ocr.ublStandards')}</h4>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                        {t('ocr.ublDesc')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileCheck className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)]">{t('ocr.peppolReady')}</h4>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                        {t('ocr.peppolDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                  {selectedInvoice.extractedData.documentNumber}
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {selectedInvoice.fileName}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Preview */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-[var(--color-text-primary)]">{t('ocr.documentPreview')}</h3>
                  <div className="bg-[var(--color-background)] rounded-lg p-4 h-96 flex items-center justify-center">
                    {selectedInvoice.fileType.startsWith('image/') ? (
                      <img
                        src={selectedInvoice.originalFileUrl}
                        alt={selectedInvoice.fileName}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <FileText className="w-16 h-16 text-[var(--color-text-tertiary)] mx-auto mb-3" />
                        <p className="text-[var(--color-text-secondary)]">{t('ocr.pdfDocument')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Extracted Data */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-[var(--color-text-primary)]">{t('ocr.extractedData')}</h3>

                  {/* Supplier Section */}
                  <div className="bg-[var(--color-background)] rounded-lg p-4">
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-3">{t('ocr.supplier')}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">{t('ocr.name')}</span>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {selectedInvoice.extractedData.supplierName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">{t('ocr.taxIdNumber')}</span>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {selectedInvoice.extractedData.supplierTaxId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">{t('ocr.address')}</span>
                        <span className="text-sm font-medium text-[var(--color-text-primary)] text-right max-w-[200px]">
                          {selectedInvoice.extractedData.supplierAddress}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="bg-[var(--color-background)] rounded-lg p-4">
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-3">{t('ocr.financialDetails')}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">{t('ocr.subtotal')}</span>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {formatCurrency(selectedInvoice.extractedData.subtotal, selectedInvoice.extractedData.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">{t('ocr.vat')}</span>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {formatCurrency(selectedInvoice.extractedData.taxAmount, selectedInvoice.extractedData.currency)}
                        </span>
                      </div>
                      {selectedInvoice.extractedData.discountAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-[var(--color-text-secondary)]">{t('ocr.discount')}</span>
                          <span className="text-sm font-medium text-red-600">
                            -{formatCurrency(selectedInvoice.extractedData.discountAmount, selectedInvoice.extractedData.currency)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-[var(--color-border)]">
                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{t('ocr.total')}</span>
                        <span className="text-lg font-bold text-[var(--color-text-primary)]">
                          {formatCurrency(selectedInvoice.extractedData.totalAmount, selectedInvoice.extractedData.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  {selectedInvoice.extractedData.items.length > 0 && (
                    <div className="bg-[var(--color-background)] rounded-lg p-4">
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">{t('ocr.items')}</h4>
                      <div className="space-y-2">
                        {selectedInvoice.extractedData.items.map((item, index) => (
                          <div key={index} className="flex justify-between py-2 border-b border-[var(--color-border)] last:border-b-0">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                {item.description}
                              </p>
                              <p className="text-xs text-[var(--color-text-secondary)]">
                                {item.quantity} x {formatCurrency(item.unitPrice, selectedInvoice.extractedData.currency)}
                              </p>
                            </div>
                            <span className="text-sm font-medium text-[var(--color-text-primary)]">
                              {formatCurrency(item.total, selectedInvoice.extractedData.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--color-text-secondary)]">{t('ocr.aiConfidenceLabel')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        selectedInvoice.confidence >= 90 ? 'bg-green-500' :
                        selectedInvoice.confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${selectedInvoice.confidence}%` }}
                    ></div>
                  </div>
                  <span className={`text-sm font-medium ${getConfidenceColor(selectedInvoice.confidence)}`}>
                    {selectedInvoice.confidence}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {t('ocr.cancel')}
                </button>
                {selectedInvoice.status === 'review' && (
                  <>
                    <button
                      onClick={() => {
                        rejectInvoice(selectedInvoice, t('ocr.rejectReasonIncorrectData'));
                        setSelectedInvoice(null);
                      }}
                      className="px-4 py-2 bg-[var(--color-error)] text-white rounded-lg hover:bg-[var(--color-error-dark)] transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      {t('ocr.reject')}
                    </button>
                    <button
                      onClick={() => {
                        validateInvoice(selectedInvoice);
                        setSelectedInvoice(null);
                      }}
                      className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] transition-colors flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      {t('ocr.validateAndPost')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed right-0 top-0 h-full w-96 bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-xl z-50 flex flex-col">
          <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {t('ocr.settings')}
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                {t('ocr.autoValidation')}
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoValidate}
                  onChange={(e) => setSettings({ ...settings, autoValidate: e.target.checked })}
                  className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {t('ocr.autoValidateIf', { threshold: String(settings.confidenceThreshold) })}
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                {t('ocr.confidenceThreshold', { value: String(settings.confidenceThreshold) })}
              </label>
              <input
                type="range"
                min="50"
                max="100"
                value={settings.confidenceThreshold}
                onChange={(e) => setSettings({ ...settings, confidenceThreshold: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                {t('ocr.defaultCurrency')}
              </label>
              <select
                value={settings.defaultCurrency}
                onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="XAF">FCFA (XAF)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="USD">{t('ocr.currencyUSD')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                {t('ocr.defaultTaxRate')}
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.defaultTaxRate}
                onChange={(e) => setSettings({ ...settings, defaultTaxRate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                {t('ocr.extractionOptions')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.extractLineItems}
                    onChange={(e) => setSettings({ ...settings, extractLineItems: e.target.checked })}
                    className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {t('ocr.extractLineItems')}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.duplicateCheck}
                    onChange={(e) => setSettings({ ...settings, duplicateCheck: e.target.checked })}
                    className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {t('ocr.checkDuplicates')}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enhanceImage}
                    onChange={(e) => setSettings({ ...settings, enhanceImage: e.target.checked })}
                    className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {t('ocr.aiImageEnhancement')}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                {t('ocr.processingLanguage')}
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
                <option value="ar">العربية</option>
              </select>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-[var(--color-border)]">
            <button
              onClick={async () => {
                const base = ocrConfigRef.current;
                if (!base) { toast.error(t('ocr.configNotFound')); return; }
                const merged: OCRConfig = {
                  ...base,
                  autoValidate: settings.autoValidate,
                  confidenceThreshold: settings.confidenceThreshold,
                  defaultCurrency: settings.defaultCurrency,
                  defaultTaxRate: settings.defaultTaxRate,
                  extractLineItems: settings.extractLineItems,
                  duplicateCheck: settings.duplicateCheck,
                  enhanceImage: settings.enhanceImage,
                  language: settings.language,
                };
                ocrConfigRef.current = merged;
                setOcrConfig(merged);
                try {
                  await saveOCRConfig(adapter, merged);
                  toast.success(t('ocr.settingsSaved'));
                  setShowSettings(false);
                } catch {
                  toast.error(t('ocr.saveFailed'));
                }
              }}
              className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              {t('ocr.saveSettings')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRInvoices;