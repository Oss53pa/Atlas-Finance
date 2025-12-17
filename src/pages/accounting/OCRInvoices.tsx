import React, { useState, useRef, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
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

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  total: number;
  accountCode?: string;
  analyticalCode?: string;
}

interface ExtractedData {
  // Document Information
  documentType: 'invoice' | 'credit_note' | 'receipt' | 'purchase_order';
  documentNumber: string;
  documentDate: string;
  dueDate: string;

  // Supplier Information
  supplierName: string;
  supplierAddress: string;
  supplierCountry: string;
  supplierTaxId: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierIBAN?: string;

  // Customer Information
  customerName?: string;
  customerAddress?: string;
  customerTaxId?: string;

  // Financial Information
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
  currency: string;
  exchangeRate?: number;

  // Payment Information
  paymentTerms?: string;
  paymentMethod?: string;
  bankDetails?: string;

  // Line Items
  items: InvoiceItem[];

  // References
  purchaseOrderRef?: string;
  deliveryNoteRef?: string;
  contractRef?: string;

  // Compliance
  taxBreakdown?: {
    rate: number;
    base: number;
    amount: number;
  }[];
}

interface ScannedInvoice {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: Date;
  processedDate?: Date;
  status: 'uploading' | 'processing' | 'review' | 'validated' | 'rejected' | 'error' | 'archived';
  confidence: number;
  extractedData: ExtractedData;
  originalFileUrl: string;
  ocrText?: string;
  validationErrors?: {
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }[];
  validatedBy?: string;
  validatedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  accountingEntryId?: string;
  tags?: string[];
  notes?: string;
  auditLog?: {
    action: string;
    user: string;
    timestamp: Date;
    details?: string;
  }[];
}

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

  // Mock data for demonstration
  const [scannedInvoices, setScannedInvoices] = useState<ScannedInvoice[]>([
    {
      id: '1',
      fileName: 'FACT-2024-001.pdf',
      fileSize: 245000,
      fileType: 'application/pdf',
      uploadDate: new Date(Date.now() - 3600000),
      processedDate: new Date(Date.now() - 3000000),
      status: 'validated',
      confidence: 95,
      extractedData: {
        documentType: 'invoice',
        documentNumber: 'FACT-2024-001',
        documentDate: '2024-01-15',
        dueDate: '2024-02-15',
        supplierName: 'TECH SOLUTIONS SARL',
        supplierAddress: 'Avenue de la République, Douala, Cameroun',
        supplierCountry: 'CM',
        supplierTaxId: 'M012345678901A',
        supplierEmail: 'contact@techsolutions.cm',
        supplierPhone: '+237 233 456 789',
        customerName: 'WISEBOOK ENTERPRISE',
        customerAddress: 'Rue du Commerce, Yaoundé, Cameroun',
        customerTaxId: 'M098765432109B',
        subtotal: 5000000,
        taxAmount: 962500,
        discountAmount: 0,
        shippingAmount: 50000,
        totalAmount: 6012500,
        currency: 'XAF',
        paymentTerms: '30 jours',
        paymentMethod: 'Virement bancaire',
        items: [
          {
            id: '1',
            description: 'Ordinateurs portables HP ProBook',
            quantity: 10,
            unitPrice: 450000,
            taxRate: 19.25,
            discount: 0,
            total: 4500000,
            accountCode: '2244',
            analyticalCode: 'IT-001'
          },
          {
            id: '2',
            description: 'Licences Microsoft Office',
            quantity: 10,
            unitPrice: 50000,
            taxRate: 19.25,
            discount: 0,
            total: 500000,
            accountCode: '2113',
            analyticalCode: 'IT-002'
          }
        ],
        purchaseOrderRef: 'PO-2024-0089',
        taxBreakdown: [
          {
            rate: 19.25,
            base: 5000000,
            amount: 962500
          }
        ]
      },
      originalFileUrl: '/documents/invoices/FACT-2024-001.pdf',
      validatedBy: 'Jean Dupont',
      validatedAt: new Date(Date.now() - 1800000),
      tags: ['IT', 'Equipment', 'Q1-2024'],
      auditLog: [
        {
          action: 'uploaded',
          user: 'System',
          timestamp: new Date(Date.now() - 3600000)
        },
        {
          action: 'processed',
          user: 'OCR Engine',
          timestamp: new Date(Date.now() - 3000000)
        },
        {
          action: 'validated',
          user: 'Jean Dupont',
          timestamp: new Date(Date.now() - 1800000)
        }
      ]
    },
    {
      id: '2',
      fileName: 'INV-SUPPLIER-2024-002.jpg',
      fileSize: 1250000,
      fileType: 'image/jpeg',
      uploadDate: new Date(Date.now() - 7200000),
      processedDate: new Date(Date.now() - 6600000),
      status: 'review',
      confidence: 78,
      extractedData: {
        documentType: 'invoice',
        documentNumber: 'INV-2024-002',
        documentDate: '2024-01-18',
        dueDate: '2024-02-18',
        supplierName: 'OFFICE PRO CAMEROUN',
        supplierAddress: 'Boulevard de la Liberté, Douala',
        supplierCountry: 'CM',
        supplierTaxId: 'M987654321098C',
        subtotal: 2500000,
        taxAmount: 481250,
        discountAmount: 100000,
        shippingAmount: 0,
        totalAmount: 2881250,
        currency: 'XAF',
        items: [
          {
            id: '1',
            description: 'Fournitures de bureau diverses',
            quantity: 1,
            unitPrice: 2500000,
            taxRate: 19.25,
            discount: 100000,
            total: 2400000,
            accountCode: '6068'
          }
        ]
      },
      originalFileUrl: '/documents/invoices/INV-SUPPLIER-2024-002.jpg',
      validationErrors: [
        {
          field: 'supplierTaxId',
          message: 'Format du numéro de contribuable à vérifier',
          severity: 'warning'
        },
        {
          field: 'items',
          message: 'Description des articles peu détaillée',
          severity: 'info'
        }
      ],
      tags: ['Office', 'Supplies'],
      auditLog: [
        {
          action: 'uploaded',
          user: 'Marie Martin',
          timestamp: new Date(Date.now() - 7200000)
        },
        {
          action: 'processed',
          user: 'OCR Engine',
          timestamp: new Date(Date.now() - 6600000),
          details: 'Confidence faible - révision manuelle requise'
        }
      ]
    }
  ]);

  const stats = {
    total: scannedInvoices.length,
    pending: scannedInvoices.filter(i => i.status === 'review').length,
    validated: scannedInvoices.filter(i => i.status === 'validated').length,
    errors: scannedInvoices.filter(i => i.status === 'error').length,
    totalAmount: scannedInvoices
      .filter(i => i.status === 'validated')
      .reduce((sum, i) => sum + i.extractedData.totalAmount, 0),
    averageConfidence: Math.round(
      scannedInvoices.reduce((sum, i) => sum + i.confidence, 0) / scannedInvoices.length
    ),
    processingTime: '2.3s',
    successRate: 92
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
        console.error(`Type de fichier non supporté: ${file.type}`);
      }
    });
  };

  const processFile = async (file: File) => {
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setProcessingFiles(prev => [...prev, fileId]);

    // Simulation du traitement OCR
    setTimeout(() => {
      const newInvoice: ScannedInvoice = {
        id: fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadDate: new Date(),
        processedDate: new Date(),
        status: 'review',
        confidence: Math.floor(Math.random() * 30) + 70,
        extractedData: {
          documentType: 'invoice',
          documentNumber: `INV-${Date.now()}`,
          documentDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          supplierName: 'Nouveau Fournisseur',
          supplierAddress: 'Adresse à confirmer',
          supplierCountry: 'CM',
          supplierTaxId: 'À vérifier',
          subtotal: 0,
          taxAmount: 0,
          discountAmount: 0,
          shippingAmount: 0,
          totalAmount: 0,
          currency: settings.defaultCurrency,
          items: []
        },
        originalFileUrl: URL.createObjectURL(file),
        tags: [],
        auditLog: [
          {
            action: 'uploaded',
            user: 'Current User',
            timestamp: new Date()
          }
        ]
      };

      setScannedInvoices(prev => [newInvoice, ...prev]);
      setProcessingFiles(prev => prev.filter(id => id !== fileId));
    }, 3000);
  };

  const validateInvoice = (invoice: ScannedInvoice) => {
    const updatedInvoice = {
      ...invoice,
      status: 'validated' as const,
      validatedBy: 'Current User',
      validatedAt: new Date()
    };

    setScannedInvoices(prev =>
      prev.map(i => i.id === invoice.id ? updatedInvoice : i)
    );

    // Create accounting entry
    console.log('Creating accounting entry for invoice:', invoice.id);
  };

  const rejectInvoice = (invoice: ScannedInvoice, reason: string) => {
    const updatedInvoice = {
      ...invoice,
      status: 'rejected' as const,
      rejectedBy: 'Current User',
      rejectedAt: new Date(),
      rejectionReason: reason
    };

    setScannedInvoices(prev =>
      prev.map(i => i.id === invoice.id ? updatedInvoice : i)
    );
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

  const formatCurrency = (amount: number, currency: string = 'XAF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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
        {/* Header */}
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
                <ScanLine className="w-8 h-8 text-[var(--color-primary)]" />
                OCR Factures Intelligent
              </h1>
              <p className="text-[var(--color-text-secondary)] mt-1">
                Extraction automatique avec IA - Standards internationaux (UBL, PEPPOL, Factur-X)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Paramètres OCR
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
                Mode Batch
              </button>
              <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Scanner
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-t border-[var(--color-border)] -mx-6 px-6 pt-3">
            {[
              { id: 'scan', label: 'Numérisation', icon: ScanLine, count: processingFiles.length },
              { id: 'review', label: 'À Réviser', icon: Eye, count: stats.pending },
              { id: 'validated', label: 'Validées', icon: CheckCircle, count: stats.validated },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
                <p className="text-xs text-[var(--color-text-secondary)]">Total</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{stats.total}</p>
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
                <p className="text-xs text-[var(--color-text-secondary)]">Validées</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{stats.validated}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-info-light)] rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-[var(--color-info)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Confiance moy.</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{stats.averageConfidence}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-success-light)] rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-[var(--color-success)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Temps moy.</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{stats.processingTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-accent-light)] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[var(--color-accent)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Taux succès</p>
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
                  <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                    Glissez vos factures ici
                  </h3>
                  <p className="text-[var(--color-text-secondary)] mb-4">
                    ou cliquez pour sélectionner des fichiers (PDF, JPG, PNG)
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors inline-flex items-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Sélectionner des fichiers
                  </button>
                  <div className="mt-6 flex items-center justify-center gap-8 text-sm text-[var(--color-text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>RGPD Compliant</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span>Multi-langues</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      <span>IA Avancée</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Processing Files */}
              {processingFiles.length > 0 && (
                <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                    Traitement en cours
                  </h3>
                  <div className="space-y-3">
                    {processingFiles.map(fileId => (
                      <div key={fileId} className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 text-[var(--color-primary)] animate-spin" />
                          <div>
                            <p className="font-medium text-[var(--color-text-primary)]">
                              Extraction en cours...
                            </p>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              Analyse avec Intelligence Artificielle
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
                    placeholder="Rechercher par nom de fichier ou fournisseur..."
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
                  <option value="all">Tous les statuts</option>
                  <option value="review">À réviser</option>
                  <option value="validated">Validées</option>
                  <option value="rejected">Rejetées</option>
                  <option value="error">Erreurs</option>
                </select>
                {batchMode && selectedInvoices.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {selectedInvoices.length} sélectionnées
                    </span>
                    <button className="px-3 py-1.5 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] transition-colors text-sm">
                      Valider la sélection
                    </button>
                    <button className="px-3 py-1.5 bg-[var(--color-error)] text-white rounded-lg hover:bg-[var(--color-error-dark)] transition-colors text-sm">
                      Rejeter
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
                          {invoice.status === 'review' ? 'À réviser' :
                           invoice.status === 'validated' ? 'Validée' :
                           invoice.status === 'rejected' ? 'Rejetée' : invoice.status}
                        </span>
                      </div>

                      {/* Confidence Score */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-[var(--color-text-secondary)]">Confiance IA</span>
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

                    {/* Invoice Amount */}
                    <div className="px-4 py-3 bg-[var(--color-background)]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">Montant total</span>
                        <span className="text-lg font-bold text-[var(--color-text-primary)]">
                          {formatCurrency(invoice.extractedData.totalAmount, invoice.extractedData.currency)}
                        </span>
                      </div>
                      {invoice.extractedData.items.length > 0 && (
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                          {invoice.extractedData.items.length} ligne{invoice.extractedData.items.length > 1 ? 's' : ''} d'articles
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
                              {invoice.validationErrors.length} point{invoice.validationErrors.length > 1 ? 's' : ''} à vérifier
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
                            Valider
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              rejectInvoice(invoice, 'Données incorrectes');
                            }}
                            className="px-3 py-1.5 bg-[var(--color-error)] text-white rounded-lg hover:bg-[var(--color-error-dark)] transition-colors text-sm flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Rejeter
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
                          Éditer
                        </button>
                      </div>
                    )}

                    {/* Validated Info */}
                    {invoice.status === 'validated' && invoice.validatedBy && (
                      <div className="px-4 py-2 bg-green-50 border-t border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <p className="text-xs text-green-800">
                            Validée par {invoice.validatedBy} le {invoice.validatedAt?.toLocaleDateString('fr-FR')}
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
                    <h3 className="font-semibold text-[var(--color-text-primary)]">Volume mensuel</h3>
                    <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
                  </div>
                  <div className="text-3xl font-bold text-[var(--color-text-primary)]">234</div>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                    +12% vs mois dernier
                  </p>
                  <div className="mt-4 h-20 bg-[var(--color-background)] rounded-lg flex items-end justify-around p-2">
                    {[40, 65, 45, 70, 85, 75, 90].map((height, i) => (
                      <div
                        key={i}
                        className="w-4 bg-[var(--color-primary)] rounded-t"
                        style={{ height: `${height}%` }}
                      ></div>
                    ))}
                  </div>
                </div>

                <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">Montant total</h3>
                    <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <div className="text-3xl font-bold text-[var(--color-text-primary)]">
                    {formatCurrency(stats.totalAmount)}
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                    Ce mois-ci
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--color-text-secondary)]">Achats</span>
                      <span className="text-[var(--color-text-primary)] font-medium">65%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--color-text-secondary)]">Services</span>
                      <span className="text-[var(--color-text-primary)] font-medium">35%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">Top Fournisseurs</h3>
                    <Users className="w-5 h-5 text-[var(--color-info)]" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-primary)]">Tech Solutions</span>
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">18</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-primary)]">Office Pro</span>
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">15</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-primary)]">Supply Co</span>
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">12</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">Performance IA</h3>
                    <Brain className="w-5 h-5 text-[var(--color-accent)]" />
                  </div>
                  <div className="text-3xl font-bold text-[var(--color-text-primary)]">
                    {stats.averageConfidence}%
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                    Précision moyenne
                  </p>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--color-text-secondary)]">Temps traitement</span>
                      <span className="text-[var(--color-text-primary)] font-medium">{stats.processingTime}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--color-text-secondary)]">Taux succès</span>
                      <span className="text-[var(--color-text-primary)] font-medium">{stats.successRate}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Section */}
              <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                  Conformité & Standards
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)]">RGPD Compliant</h4>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                        Données chiffrées et anonymisées
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)]">Standards UBL 2.1</h4>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                        Format international d'échange
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileCheck className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)]">PEPPOL Ready</h4>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                        Compatible réseau européen
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
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
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
                  <h3 className="font-semibold text-[var(--color-text-primary)]">Aperçu du document</h3>
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
                        <p className="text-[var(--color-text-secondary)]">PDF Document</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Extracted Data */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-[var(--color-text-primary)]">Données extraites</h3>

                  {/* Supplier Section */}
                  <div className="bg-[var(--color-background)] rounded-lg p-4">
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Fournisseur</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">Nom</span>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {selectedInvoice.extractedData.supplierName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">N° Contribuable</span>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {selectedInvoice.extractedData.supplierTaxId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">Adresse</span>
                        <span className="text-sm font-medium text-[var(--color-text-primary)] text-right max-w-[200px]">
                          {selectedInvoice.extractedData.supplierAddress}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="bg-[var(--color-background)] rounded-lg p-4">
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Détails financiers</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">Sous-total</span>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {formatCurrency(selectedInvoice.extractedData.subtotal, selectedInvoice.extractedData.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">TVA (19.25%)</span>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {formatCurrency(selectedInvoice.extractedData.taxAmount, selectedInvoice.extractedData.currency)}
                        </span>
                      </div>
                      {selectedInvoice.extractedData.discountAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-[var(--color-text-secondary)]">Remise</span>
                          <span className="text-sm font-medium text-red-600">
                            -{formatCurrency(selectedInvoice.extractedData.discountAmount, selectedInvoice.extractedData.currency)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-[var(--color-border)]">
                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">Total</span>
                        <span className="text-lg font-bold text-[var(--color-text-primary)]">
                          {formatCurrency(selectedInvoice.extractedData.totalAmount, selectedInvoice.extractedData.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  {selectedInvoice.extractedData.items.length > 0 && (
                    <div className="bg-[var(--color-background)] rounded-lg p-4">
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Articles</h4>
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
                <span className="text-sm text-[var(--color-text-secondary)]">Confiance IA:</span>
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
                  Annuler
                </button>
                {selectedInvoice.status === 'review' && (
                  <>
                    <button
                      onClick={() => {
                        rejectInvoice(selectedInvoice, 'Données incorrectes');
                        setSelectedInvoice(null);
                      }}
                      className="px-4 py-2 bg-[var(--color-error)] text-white rounded-lg hover:bg-[var(--color-error-dark)] transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Rejeter
                    </button>
                    <button
                      onClick={() => {
                        validateInvoice(selectedInvoice);
                        setSelectedInvoice(null);
                      }}
                      className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] transition-colors flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Valider et Comptabiliser
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
              Paramètres OCR
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
                Validation automatique
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoValidate}
                  onChange={(e) => setSettings({ ...settings, autoValidate: e.target.checked })}
                  className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--color-text-secondary)]">
                  Valider automatiquement si confiance &gt; {settings.confidenceThreshold}%
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Seuil de confiance: {settings.confidenceThreshold}%
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
                Devise par défaut
              </label>
              <select
                value={settings.defaultCurrency}
                onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="XAF">FCFA (XAF)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="USD">Dollar US (USD)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Taux TVA par défaut
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
                Options d'extraction
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
                    Extraire les lignes d'articles
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
                    Vérifier les doublons
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
                    Amélioration d'image IA
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Langue de traitement
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
            <button className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors">
              Enregistrer les paramètres
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRInvoices;