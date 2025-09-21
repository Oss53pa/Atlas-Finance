import React, { useState, useRef } from 'react';
import {
  Signature, FileText, CheckCircle, Clock, XCircle,
  Send, Download, Upload, Eye, Edit, Trash2,
  User, Users, Calendar, Shield, Lock, AlertTriangle,
  Mail, MessageSquare, Hash, Building2, Phone,
  MapPin, CreditCard, Key, RefreshCw, Search,
  Filter, ChevronRight, PenTool, FileCheck, Award
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface Document {
  id: string;
  name: string;
  type: 'invoice' | 'contract' | 'purchase_order' | 'quote' | 'other';
  uploadDate: Date;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'completed' | 'rejected';
  signatories: Signatory[];
  currentSigner?: string;
  completedSignatures: number;
  totalSignatures: number;
  expiryDate: Date;
  size: string;
  hash: string;
  certificateId?: string;
  auditTrail: AuditEntry[];
}

interface Signatory {
  id: string;
  name: string;
  email: string;
  role: string;
  company?: string;
  phone?: string;
  status: 'pending' | 'signed' | 'rejected' | 'delegated';
  signedAt?: Date;
  ipAddress?: string;
  signature?: string;
  certificate?: string;
  order: number;
}

interface AuditEntry {
  id: string;
  action: string;
  user: string;
  timestamp: Date;
  ipAddress: string;
  details?: string;
}

interface SignatureTemplate {
  id: string;
  name: string;
  type: 'draw' | 'type' | 'upload' | 'certificate';
  data: string;
  isDefault: boolean;
}

const ElectronicSignature: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [signatureMethod, setSignatureMethod] = useState<'draw' | 'type' | 'upload' | 'certificate'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSignModal, setShowSignModal] = useState(false);

  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'Contrat-2024-001.pdf',
      type: 'contract',
      uploadDate: new Date(Date.now() - 86400000),
      status: 'signed',
      signatories: [
        {
          id: 's1',
          name: 'Marie Dupont',
          email: 'marie.dupont@company.com',
          role: 'Directeur Général',
          company: 'Tech Solutions',
          status: 'signed',
          signedAt: new Date(Date.now() - 3600000),
          ipAddress: '192.168.1.1',
          order: 1
        },
        {
          id: 's2',
          name: 'Jean Martin',
          email: 'jean.martin@client.com',
          role: 'Responsable Achats',
          company: 'Client Corp',
          status: 'signed',
          signedAt: new Date(Date.now() - 1800000),
          ipAddress: '192.168.1.2',
          order: 2
        }
      ],
      completedSignatures: 2,
      totalSignatures: 2,
      expiryDate: new Date(Date.now() + 7 * 86400000),
      size: '2.5 MB',
      hash: 'a1b2c3d4e5f6g7h8i9j0',
      certificateId: 'CERT-2024-001',
      auditTrail: [
        {
          id: 'a1',
          action: 'Document créé',
          user: 'Admin',
          timestamp: new Date(Date.now() - 86400000),
          ipAddress: '192.168.1.100'
        },
        {
          id: 'a2',
          action: 'Document signé',
          user: 'Marie Dupont',
          timestamp: new Date(Date.now() - 3600000),
          ipAddress: '192.168.1.1'
        },
        {
          id: 'a3',
          action: 'Document signé',
          user: 'Jean Martin',
          timestamp: new Date(Date.now() - 1800000),
          ipAddress: '192.168.1.2'
        }
      ]
    },
    {
      id: '2',
      name: 'Facture-INV-2024-002.pdf',
      type: 'invoice',
      uploadDate: new Date(Date.now() - 172800000),
      status: 'sent',
      currentSigner: 'Pierre Durand',
      signatories: [
        {
          id: 's3',
          name: 'Pierre Durand',
          email: 'pierre.durand@finance.com',
          role: 'Directeur Financier',
          status: 'pending',
          order: 1
        }
      ],
      completedSignatures: 0,
      totalSignatures: 1,
      expiryDate: new Date(Date.now() + 5 * 86400000),
      size: '850 KB',
      hash: 'b2c3d4e5f6g7h8i9j0k1',
      auditTrail: [
        {
          id: 'a4',
          action: 'Document envoyé',
          user: 'Admin',
          timestamp: new Date(Date.now() - 172800000),
          ipAddress: '192.168.1.100'
        },
        {
          id: 'a5',
          action: 'Document consulté',
          user: 'Pierre Durand',
          timestamp: new Date(Date.now() - 86400000),
          ipAddress: '192.168.1.3',
          details: 'Ouvert depuis email'
        }
      ]
    },
    {
      id: '3',
      name: 'Bon-Commande-PO-2024-003.pdf',
      type: 'purchase_order',
      uploadDate: new Date(Date.now() - 259200000),
      status: 'viewed',
      currentSigner: 'Sophie Lambert',
      signatories: [
        {
          id: 's4',
          name: 'Sophie Lambert',
          email: 'sophie.lambert@procurement.com',
          role: 'Responsable Achats',
          status: 'pending',
          order: 1
        },
        {
          id: 's5',
          name: 'Marc Dubois',
          email: 'marc.dubois@direction.com',
          role: 'Directeur Opérations',
          status: 'pending',
          order: 2
        }
      ],
      completedSignatures: 0,
      totalSignatures: 2,
      expiryDate: new Date(Date.now() + 3 * 86400000),
      size: '1.2 MB',
      hash: 'c3d4e5f6g7h8i9j0k1l2',
      auditTrail: []
    }
  ]);

  const [signatureTemplates] = useState<SignatureTemplate[]>([
    {
      id: 't1',
      name: 'Ma signature',
      type: 'draw',
      data: 'signature_data_1',
      isDefault: true
    },
    {
      id: 't2',
      name: 'Signature formelle',
      type: 'type',
      data: 'John Doe',
      isDefault: false
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'signed':
        return 'bg-green-100 text-green-700';
      case 'sent':
      case 'viewed':
        return 'bg-blue-100 text-blue-700';
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'invoice': return <FileText className="w-5 h-5 text-blue-600" />;
      case 'contract': return <FileCheck className="w-5 h-5 text-purple-600" />;
      case 'purchase_order': return <CreditCard className="w-5 h-5 text-green-600" />;
      case 'quote': return <Hash className="w-5 h-5 text-orange-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const sendDocument = (docId: string) => {
    setDocuments(prev => prev.map(doc =>
      doc.id === docId ? { ...doc, status: 'sent' } : doc
    ));
  };

  const signDocument = (docId: string) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        const updatedSignatories = doc.signatories.map((sig, index) => {
          if (index === 0 && sig.status === 'pending') {
            return {
              ...sig,
              status: 'signed' as const,
              signedAt: new Date(),
              ipAddress: '192.168.1.100'
            };
          }
          return sig;
        });

        const completedSignatures = updatedSignatories.filter(s => s.status === 'signed').length;

        return {
          ...doc,
          signatories: updatedSignatories,
          completedSignatures,
          status: completedSignatures === doc.totalSignatures ? 'completed' : doc.status,
          auditTrail: [
            ...doc.auditTrail,
            {
              id: `a${Date.now()}`,
              action: 'Document signé',
              user: 'Utilisateur actuel',
              timestamp: new Date(),
              ipAddress: '192.168.1.100'
            }
          ]
        };
      }
      return doc;
    }));
    setShowSignModal(false);
  };

  const filteredDocuments = documents.filter(doc => {
    if (filter !== 'all' && doc.status !== filter) return false;
    if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: documents.length,
    signed: documents.filter(d => d.status === 'signed' || d.status === 'completed').length,
    pending: documents.filter(d => d.status === 'sent' || d.status === 'viewed').length,
    draft: documents.filter(d => d.status === 'draft').length
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Signature className="w-8 h-8 text-blue-600" />
            Signature Électronique
          </h1>
          <p className="text-gray-600 mt-1">Signez et gérez vos documents en toute sécurité</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Upload className="w-4 h-4" />
            Nouveau Document
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <PenTool className="w-4 h-4" />
            Créer Signature
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Documents</span>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Signés</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.signed}</p>
        </div>

        <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-700">En attente</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
        </div>

        <div className="bg-gray-50 rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Brouillons</span>
            <Edit className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-gray-700">{stats.draft}</p>
        </div>
      </div>

      {/* Security Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <Shield className="w-8 h-8 text-blue-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Sécurité maximale</h3>
            <p className="text-sm text-gray-600">Tous les documents sont chiffrés et horodatés avec certificat légal</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-700">Chiffrement AES-256</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-700">Certifié eIDAS</span>
            </div>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-gray-700">PKI Infrastructure</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            {['all', 'signed', 'sent', 'draft'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all",
                  filter === status ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {status === 'all' ? 'Tous' :
                 status === 'signed' ? 'Signés' :
                 status === 'sent' ? 'Envoyés' : 'Brouillons'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocuments.map((document) => (
          <div
            key={document.id}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-all"
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {getDocumentTypeIcon(document.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{document.name}</h3>
                      <span className={cn("px-2 py-1 text-xs rounded-full font-medium", getStatusColor(document.status))}>
                        {document.status === 'signed' ? 'Signé' :
                         document.status === 'sent' ? 'Envoyé' :
                         document.status === 'viewed' ? 'Consulté' :
                         document.status === 'completed' ? 'Complété' :
                         document.status === 'draft' ? 'Brouillon' : 'Rejeté'}
                      </span>
                      {document.certificateId && (
                        <div className="flex items-center gap-1">
                          <Award className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-600">Certifié</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(document.uploadDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Expire: {new Date(document.expiryDate).toLocaleDateString()}
                      </span>
                      <span>{document.size}</span>
                    </div>

                    {/* Signatories */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          Signatures: {document.completedSignatures}/{document.totalSignatures}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {document.signatories.map((signatory, index) => (
                          <div
                            key={signatory.id}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1 rounded-full text-xs",
                              signatory.status === 'signed' ? "bg-green-100 text-green-700" :
                              signatory.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                              signatory.status === 'rejected' ? "bg-red-100 text-red-700" :
                              "bg-gray-100 text-gray-700"
                            )}
                          >
                            <User className="w-3 h-3" />
                            <span>{signatory.name}</span>
                            {signatory.status === 'signed' && <CheckCircle className="w-3 h-3" />}
                            {signatory.status === 'pending' && <Clock className="w-3 h-3" />}
                            {signatory.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${(document.completedSignatures / document.totalSignatures) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedDocument(document)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Voir détails"
                  >
                    <Eye className="w-5 h-5 text-gray-600" />
                  </button>
                  {(document.status === 'sent' || document.status === 'viewed') && (
                    <button
                      onClick={() => {
                        setSelectedDocument(document);
                        setShowSignModal(true);
                      }}
                      className="p-2 hover:bg-blue-100 rounded-lg"
                      title="Signer"
                    >
                      <PenTool className="w-5 h-5 text-blue-600" />
                    </button>
                  )}
                  {document.status === 'draft' && (
                    <button
                      onClick={() => sendDocument(document.id)}
                      className="p-2 hover:bg-green-100 rounded-lg"
                      title="Envoyer"
                    >
                      <Send className="w-5 h-5 text-green-600" />
                    </button>
                  )}
                  <button
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Télécharger"
                  >
                    <Download className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Audit Trail */}
            {document.auditTrail.length > 0 && (
              <div className="px-6 pb-4">
                <details className="cursor-pointer">
                  <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                    Historique des actions
                  </summary>
                  <div className="mt-3 space-y-2">
                    {document.auditTrail.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 text-sm">
                        <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{entry.action}</span>
                            <span className="text-gray-500">par {entry.user}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleString()} - IP: {entry.ipAddress}
                            {entry.details && ` - ${entry.details}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sign Modal */}
      {showSignModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Signer le document</h2>
              <p className="text-sm text-gray-600 mt-1">{selectedDocument.name}</p>
            </div>

            <div className="p-6">
              {/* Signature Methods */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setSignatureMethod('draw')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg font-medium transition-all",
                    signatureMethod === 'draw' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  )}
                >
                  Dessiner
                </button>
                <button
                  onClick={() => setSignatureMethod('type')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg font-medium transition-all",
                    signatureMethod === 'type' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  )}
                >
                  Taper
                </button>
                <button
                  onClick={() => setSignatureMethod('upload')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg font-medium transition-all",
                    signatureMethod === 'upload' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  )}
                >
                  Importer
                </button>
                <button
                  onClick={() => setSignatureMethod('certificate')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg font-medium transition-all",
                    signatureMethod === 'certificate' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  )}
                >
                  Certificat
                </button>
              </div>

              {/* Signature Area */}
              {signatureMethod === 'draw' && (
                <div>
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={200}
                    className="border-2 border-gray-300 rounded-lg w-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                  <button
                    onClick={clearCanvas}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Effacer
                  </button>
                </div>
              )}

              {signatureMethod === 'type' && (
                <div>
                  <input
                    type="text"
                    placeholder="Tapez votre nom complet"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg text-xl font-signature focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'cursive' }}
                  />
                </div>
              )}

              {signatureMethod === 'upload' && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Cliquez pour télécharger une image de votre signature</p>
                  <input type="file" accept="image/*" className="hidden" />
                </div>
              )}

              {signatureMethod === 'certificate' && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Certificat numérique détecté</p>
                        <p className="text-sm text-green-700">CN=John Doe, O=Company, C=FR</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="consent" className="rounded" />
                    <label htmlFor="consent" className="text-sm text-gray-600">
                      J'accepte d'apposer ma signature électronique certifiée sur ce document
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowSignModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  onClick={() => signDocument(selectedDocument.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Signer le document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElectronicSignature;