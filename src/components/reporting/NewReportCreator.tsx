import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  X, Plus, Trash2, GripVertical, ChevronRight, ChevronDown,
  FileText, Database, BarChart3, MessageSquare, Download, Share2,
  Save, Printer, Edit, HelpCircle, Settings, Type, Upload, Sparkles,
  Eye, FolderOpen, Hash, User, Calendar, Shield, Edit2, Building2,
  Mail, Phone, Globe, MessageCircle, Building, LifeBuoy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Alert, AlertDescription } from '../ui/Alert';

interface ReportSection {
  id: string;
  title: string;
  type: 'module' | 'rubrique' | 'sous-rubrique';
  level: number;
  parentId?: string;
  children?: ReportSection[];
  content?: Array<{
    id: string;
    type: 'text' | 'table' | 'dashboard' | 'comment';
    data?: unknown;
  }>;
  isExpanded?: boolean;
}

interface NewReportCreatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewReportCreator: React.FC<NewReportCreatorProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  // Ajouter les styles pour l'impression
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        .page-break-after {
          page-break-after: always;
        }
        @page {
          margin: 2cm;
          size: A4;
        }
        body {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [activeView, setActiveView] = useState<'cover' | 'backcover' | 'content' | 'preview'>('cover');
  const [reportTitle, setReportTitle] = useState('Rapport Financier 2025');
  const [reportSubtitle, setReportSubtitle] = useState('Analyse Trimestrielle');
  const [reportPeriod, setReportPeriod] = useState('T1 2025');
  const [companyName, setCompanyName] = useState('Atlas Finance Entreprise');
  const [primaryColor, setPrimaryColor] = useState('#171717');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTemplate] = useState({
    id: 'professional',
    name: 'Professionnel',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  });
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backCoverSummary, setBackCoverSummary] = useState('Ce rapport présente une analyse complète de la période');
  const [contactEmail, setContactEmail] = useState('contact@atlasfinance.com');
  const [contactPhone, setContactPhone] = useState('+33 1 23 45 67 89');
  const [contactWebsite, setContactWebsite] = useState('www.atlasfinance.com');
  const [backCoverStyle, setBackCoverStyle] = useState('professional');
  const [showStats, setShowStats] = useState(true);
  const [showContact, setShowContact] = useState(true);
  const [showBorderBack, setShowBorderBack] = useState(true);
  const [logoPosition, setLogoPosition] = useState('top');
  const [showContentSelector, setShowContentSelector] = useState(false);
  const [contentSelectorType, setContentSelectorType] = useState<'table' | 'dashboard' | null>(null);
  const [reportStartDate, setReportStartDate] = useState('2025-01-01');
  const [reportEndDate, setReportEndDate] = useState('2025-03-31');
  const [selectedContentPeriod, setSelectedContentPeriod] = useState({ start: '', end: '' });
  const [sections, setSections] = useState<ReportSection[]>([
    {
      id: '1',
      title: 'Page de garde',
      type: 'module',
      level: 0,
      isExpanded: true,
      content: []
    },
    {
      id: '2',
      title: 'Synthèse Exécutive',
      type: 'module',
      level: 0,
      isExpanded: true,
      children: [
        {
          id: '2.1',
          title: 'Points Clés',
          type: 'rubrique',
          level: 1,
          parentId: '2',
          content: []
        }
      ]
    }
  ]);

  const handleAddSection = (parentId?: string, type: 'module' | 'rubrique' | 'sous-rubrique' = 'module') => {
    const newSection: ReportSection = {
      id: Date.now().toString(),
      title: `Nouvelle ${type}`,
      type,
      level: parentId ? 1 : 0,
      parentId,
      isExpanded: false,
      content: []
    };

    if (parentId) {
      setSections(prev => prev.map(section => {
        if (section.id === parentId) {
          return {
            ...section,
            children: [...(section.children || []), newSection]
          };
        }
        return section;
      }));
    } else {
      setSections(prev => [...prev, newSection]);
    }
  };

  const handleInsertContent = (sectionId: string, contentType: 'text' | 'table' | 'dashboard' | 'comment', selectedContent?: { id?: string; name?: string; description?: string }) => {
    const newContent = {
      id: Date.now().toString(),
      type: contentType,
      data: selectedContent ? selectedContent.name : `Nouveau ${contentType}...`,
      sourceId: selectedContent?.id,
      description: selectedContent?.description
    };

    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          content: [...(section.content || []), newContent]
        };
      }
      if (section.children) {
        return {
          ...section,
          children: section.children.map(child => {
            if (child.id === sectionId) {
              return {
                ...child,
                content: [...(child.content || []), newContent]
              };
            }
            return child;
          })
        };
      }
      return section;
    }));
    setActiveView('content');
  };

  const handleDeleteSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id).map(section => ({
      ...section,
      children: section.children?.filter(child => child.id !== id)
    })));
  };

  const handleUpdateSectionTitle = (id: string, newTitle: string) => {
    setSections(prev => prev.map(section => {
      if (section.id === id) {
        return { ...section, title: newTitle };
      }
      if (section.children) {
        return {
          ...section,
          children: section.children.map(child =>
            child.id === id ? { ...child, title: newTitle } : child
          )
        };
      }
      return section;
    }));
    setEditingSectionId(null);
  };

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(section =>
      section.id === id ? { ...section, isExpanded: !section.isExpanded } : section
    ));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderSectionItem = (section: ReportSection, depth: number = 0) => {
    const hasChildren = section.children && section.children.length > 0;
    const isSelected = selectedSectionId === section.id;
    const isEditing = editingSectionId === section.id;

    return (
      <div key={section.id}>
        <div
          className={`flex items-center justify-between p-2 rounded cursor-pointer group ${
            isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => setSelectedSectionId(section.id)}
        >
          <div className="flex items-center space-x-2 flex-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSection(section.id);
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {hasChildren && (
                section.isExpanded ?
                  <ChevronDown className="w-4 h-4" /> :
                  <ChevronRight className="w-4 h-4" />
              )}
              {!hasChildren && <div className="w-4" />}
            </button>

            <GripVertical className="w-4 h-4 text-gray-700 cursor-move" />

            {section.type === 'module' && <FolderOpen className="w-4 h-4 text-blue-600" />}
            {section.type === 'rubrique' && <FileText className="w-4 h-4 text-green-600" />}
            {section.type === 'sous-rubrique' && <Hash className="w-4 h-4 text-gray-600" />}

            {isEditing ? (
              <input
                type="text"
                defaultValue={section.title}
                className="flex-1 px-2 py-0.5 border border-blue-400 rounded text-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateSectionTitle(section.id, e.currentTarget.value);
                  } else if (e.key === 'Escape') {
                    setEditingSectionId(null);
                  }
                }}
                onBlur={(e) => handleUpdateSectionTitle(section.id, e.target.value)}
              />
            ) : (
              <span className="text-sm font-medium flex-1">{section.title}</span>
            )}

            {section.content && section.content.length > 0 && (
              <div className="flex items-center space-x-1">
                {section.content.map((item, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                    {item.type === 'text' && '📝'}
                    {item.type === 'table' && '📊'}
                    {item.type === 'dashboard' && '📈'}
                    {item.type === 'comment' && '💬'}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingSectionId(section.id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddSection(section.id, 'rubrique');
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSection(section.id);
              }}
              className="p-1 hover:bg-red-100 text-red-600 rounded"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {section.isExpanded && section.children?.map(child =>
          renderSectionItem(child, depth + 1)
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (activeView === 'cover') {
      return (
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations du rapport</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Titre</label>
                  <input
                    type="text"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Sous-titre</label>
                  <input
                    type="text"
                    value={reportSubtitle}
                    onChange={(e) => setReportSubtitle(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Période</label>
                  <input
                    type="text"
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Date de début</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Date de fin</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nom de l'entreprise</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personnalisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Couleur principale</label>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full mt-1 h-10 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Template</label>
                  <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="professional">Professionnel</option>
                    <option value="modern">Moderne</option>
                    <option value="classic">Classique</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="showLogo" className="rounded" />
                  <label htmlFor="showLogo" className="text-sm text-gray-700">Afficher le logo</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="showBorder" className="rounded" defaultChecked />
                  <label htmlFor="showBorder" className="text-sm text-gray-700">Bordure supérieure</label>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Image de fond</label>
                  <div className="mt-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    {backgroundImage && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-green-600">Image chargée</span>
                        <button
                          onClick={() => setBackgroundImage(null)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aperçu de la page de garde</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg shadow-lg min-h-[600px] flex flex-col p-12"
                     style={{ borderTop: `4px solid ${primaryColor}` }}>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center mb-8">
                      <Building2 className="w-8 h-8 text-gray-700" />
                    </div>

                    <h1 className="text-lg font-bold text-center mb-4" style={{ color: primaryColor }}>
                      {reportTitle}
                    </h1>

                    <h2 className="text-xl text-gray-700 text-center mb-6">
                      {reportSubtitle}
                    </h2>

                    <div className="flex items-center space-x-2 text-gray-600 mb-8">
                      <Calendar className="w-5 h-5" />
                      <span className="text-lg">{reportPeriod}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 flex items-center justify-between text-xs text-gray-700">
                    <div className="flex items-center space-x-4">
                      <span>{companyName}</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Shield className="w-3 h-3" />
                        <span>Document Confidentiel</span>
                      </div>
                    </div>
                    <div>Page {currentPage}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (activeView === 'backcover') {
      return (
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Résumé de la couverture de dos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Résumé exécutif</label>
                  <textarea
                    value={backCoverSummary}
                    onChange={(e) => setBackCoverSummary(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                    placeholder="Décrivez brièvement le contenu du rapport..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations de contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Téléphone</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Site web</label>
                  <input
                    type="url"
                    value={contactWebsite}
                    onChange={(e) => setContactWebsite(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personnalisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Couleur principale</label>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full mt-1 h-10 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Template</label>
                  <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="professional">Professionnel</option>
                    <option value="modern">Moderne</option>
                    <option value="classic">Classique</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="showLogoBack" className="rounded" />
                  <label htmlFor="showLogoBack" className="text-sm text-gray-700">Afficher le logo</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showBorderBack"
                    className="rounded"
                    checked={showBorderBack}
                    onChange={(e) => setShowBorderBack(e.target.checked)}
                  />
                  <label htmlFor="showBorderBack" className="text-sm text-gray-700">Bordure supérieure</label>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Image de fond</label>
                  <div className="mt-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    {backgroundImage && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-green-600">Image chargée</span>
                        <button
                          onClick={() => setBackgroundImage(null)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aperçu de la couverture de dos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg shadow-lg min-h-[600px] flex flex-col p-12"
                     style={{ borderTop: showBorderBack ? `4px solid ${primaryColor}` : 'none' }}>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="text-center">
                      <div className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center mx-auto mb-6">
                        <Building2 className="w-8 h-8 text-gray-700" />
                      </div>
                      <h2 className="text-lg font-bold mb-2" style={{ color: primaryColor }}>
                        {companyName}
                      </h2>
                    </div>

                    <div className="flex-1 flex flex-col justify-center space-y-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Résumé Exécutif</h3>
                        <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
                          {backCoverSummary} {reportPeriod}.
                        </p>
                      </div>

                      {showStats && (
                        <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto mt-8">
                          <div className="text-center p-4 border rounded-lg">
                            <h4 className="font-medium text-gray-700">Sections</h4>
                            <p className="text-lg font-bold" style={{ color: primaryColor }}>
                              {sections.filter(s => s.title !== 'Page de garde').length}
                            </p>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <h4 className="font-medium text-gray-700">Pages</h4>
                            <p className="text-lg font-bold" style={{ color: primaryColor }}>
                              {sections.filter(s => s.title !== 'Page de garde').length + 2}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {showContact && (
                      <div className="text-center text-sm text-gray-600 space-y-2">
                        <div className="flex items-center justify-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Mail className="w-4 h-4" />
                            <span>{contactEmail}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Phone className="w-4 h-4" />
                            <span>{contactPhone}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-center space-x-1">
                          <Globe className="w-4 h-4" />
                          <span>{contactWebsite}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-4 flex items-center justify-between text-xs text-gray-700">
                    <div className="flex items-center space-x-4">
                      <span>{companyName}</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Shield className="w-3 h-3" />
                        <span>Document Confidentiel</span>
                      </div>
                    </div>
                    <div>Couverture de dos</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (activeView === 'content') {
      const selectedSection = sections.find(s => s.id === selectedSectionId) ||
        sections.flatMap(s => s.children || []).find(c => c.id === selectedSectionId);

      return (
        <div className="space-y-4">
          {selectedSectionId && selectedSection ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedSection.title}</span>
                  <Badge>{selectedSection.type}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedSection.content && selectedSection.content.length > 0 ? (
                  <div className="space-y-4">
                    {selectedSection.content.map((item, idx) => (
                      <div key={item.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{item.type} {idx + 1}</span>
                          <button className="text-red-500" aria-label="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {item.type === 'text' && (
                          <textarea
                            className="w-full p-3 border rounded"
                            rows={4}
                            placeholder="Saisissez votre texte..."
                            defaultValue={item.data}
                          />
                        )}
                        {item.type === 'table' && (
                          <div className="bg-gray-50 p-4 rounded border-l-4 border-blue-400">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-700">{item.data}</h4>
                              <Database className="w-5 h-5 text-blue-600" />
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                            )}
                            {item.periodStart && item.periodEnd && (
                              <div className="flex items-center space-x-2 text-xs text-gray-700">
                                <Calendar className="w-3 h-3" />
                                <span>Période: {item.periodStart} au {item.periodEnd}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {item.type === 'dashboard' && (
                          <div className="bg-gray-50 p-4 rounded border-l-4 border-green-400">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-700">{item.data}</h4>
                              <BarChart3 className="w-5 h-5 text-green-600" />
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                            )}
                            {item.periodStart && item.periodEnd && (
                              <div className="flex items-center space-x-2 text-xs text-gray-700">
                                <Calendar className="w-3 h-3" />
                                <span>Période: {item.periodStart} au {item.periodEnd}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {item.type === 'comment' && (
                          <div className="bg-orange-50 p-4 rounded border-l-4 border-orange-400">
                            <textarea
                              className="w-full p-2 border rounded"
                              rows={2}
                              placeholder="Commentaire..."
                              defaultValue={item.data}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-gray-700">Aucun contenu dans cette section</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertDescription>
                Sélectionnez une rubrique dans le sommaire pour voir ou ajouter du contenu.
              </AlertDescription>
            </Alert>
          )}
        </div>
      );
    }

    if (activeView === 'preview') {
      return (
        <div className="max-w-4xl mx-auto space-y-8 print:space-y-0">
          {/* Page de garde */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden print:shadow-none print:rounded-none page-break-after">
            <div className="bg-white rounded-lg min-h-[297mm] flex flex-col p-12 bg-cover bg-center relative"
                 style={{
                   borderTop: `4px solid ${primaryColor}`,
                   backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none'
                 }}>
              {backgroundImage && <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg"></div>}
              <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                <div className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center mb-8">
                  <Building2 className="w-8 h-8 text-gray-700" />
                </div>

                <h1 className={`text-lg font-bold text-center mb-4 ${backgroundImage ? 'text-white' : ''}`}
                    style={{ color: backgroundImage ? 'white' : primaryColor }}>
                  {reportTitle}
                </h1>

                <h2 className={`text-xl text-center mb-6 ${backgroundImage ? 'text-gray-100' : 'text-gray-700'}`}>
                  {reportSubtitle}
                </h2>

                <div className={`flex items-center space-x-2 mb-8 ${backgroundImage ? 'text-gray-200' : 'text-gray-600'}`}>
                  <Calendar className="w-5 h-5" />
                  <span className="text-lg">{reportPeriod}</span>
                </div>
              </div>

              <div className={`border-t pt-4 flex items-center justify-between text-xs relative z-10 ${backgroundImage ? 'border-gray-400 text-gray-200' : 'border-gray-200 text-gray-700'}`}>
                <div className="flex items-center space-x-4">
                  <span>{companyName}</span>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3" />
                    <span>Document Confidentiel</span>
                  </div>
                </div>
                <div>Page 1</div>
              </div>
            </div>
          </div>

          {/* Page du sommaire */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden print:shadow-none print:rounded-none page-break-after">
            <div className="min-h-[297mm] flex flex-col">
              <div className="p-8 flex-1">
                <h1 className="text-lg font-bold mb-8" style={{ color: primaryColor }}>
                  Sommaire
                </h1>

                <div className="space-y-3">
                  {sections.filter(section => section.title !== 'Page de garde').map((section, idx) => (
                    <div key={section.id}>
                      <div className="flex justify-between items-center py-2 border-b border-dotted">
                        <span className="font-medium">
                          {idx + 1}. {section.title}
                        </span>
                        <span className="text-gray-700">{idx + 3}</span>
                      </div>

                      {section.children?.map((child, childIdx) => (
                        <div key={child.id} className="flex justify-between items-center py-1 ml-6 border-b border-dotted border-gray-200">
                          <span className="text-sm">
                            {idx + 1}.{childIdx + 1} {child.title}
                          </span>
                          <span className="text-gray-700 text-sm">{idx + 3}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pied de page du sommaire */}
              <div className="border-t px-8 py-4 flex justify-between text-sm text-gray-700">
                <div className="flex items-center space-x-4">
                  <span>{companyName}</span>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Shield className="w-4 h-4" />
                    <span>Document Confidentiel</span>
                  </div>
                </div>
                <div>Page 2</div>
              </div>
            </div>
          </div>

          {/* Pages de contenu */}
          {sections.filter(section => section.title !== 'Page de garde').map((section, idx) => (
            <div key={section.id} className="bg-white rounded-lg shadow-lg overflow-hidden print:shadow-none print:rounded-none page-break-after">
              <div className="min-h-[297mm] flex flex-col">
                <div className="p-8 flex-1">
                  <h1 className="text-lg font-bold mb-6" style={{ color: primaryColor }}>
                    {idx + 1}. {section.title}
                  </h1>

                  {/* Contenu de la section principale */}
                  {section.content && section.content.length > 0 && (
                    <div className="space-y-6 mb-8">
                      {section.content.map((item) => (
                        <div key={item.id} className="border rounded-lg overflow-hidden">
                          {item.type === 'text' && (
                            <div className="p-6">
                              <div className="prose max-w-none">
                                <p className="text-gray-800 leading-relaxed">
                                  {item.data || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."}
                                </p>
                              </div>
                            </div>
                          )}
                          {item.type === 'table' && (
                            <div className="p-6">
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-gray-300">
                                  <thead>
                                    <tr className="bg-gray-50">
                                      <th className="border border-gray-300 p-3 text-left">Paramètre</th>
                                      <th className="border border-gray-300 p-3 text-left">Valeur</th>
                                      <th className="border border-gray-300 p-3 text-left">Statut</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td className="border border-gray-300 p-3">Revenue Q4</td>
                                      <td className="border border-gray-300 p-3">€125,000</td>
                                      <td className="border border-gray-300 p-3">
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                          En hausse
                                        </span>
                                      </td>
                                    </tr>
                                    <tr className="bg-gray-50">
                                      <td className="border border-gray-300 p-3">Clients actifs</td>
                                      <td className="border border-gray-300 p-3">2,847</td>
                                      <td className="border border-gray-300 p-3">
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                          Stable
                                        </span>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {item.type === 'dashboard' && (
                            <div className="p-6">
                              <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                  <div className="text-lg font-bold text-blue-800">€42.5K</div>
                                  <div className="text-sm text-blue-600">Chiffre d&apos;affaires</div>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                  <div className="text-lg font-bold text-green-800">+15%</div>
                                  <div className="text-sm text-green-600">Croissance</div>
                                </div>
                              </div>
                              <div className="bg-gray-100 h-32 rounded-lg flex items-center justify-center">
                                <span className="text-gray-700">Graphique Dashboard</span>
                              </div>
                            </div>
                          )}
                          {item.type === 'comment' && (
                            <div className="bg-orange-50 border-l-4 border-orange-400 p-6">
                              <div className="flex items-start space-x-3">
                                <MessageCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                                <div>
                                  <h4 className="font-medium text-orange-800">Note importante</h4>
                                  <p className="text-orange-700 mt-1">
                                    {item.data || "Ceci est un commentaire important à prendre en considération pour l&apos;analyse de cette section."}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sous-sections */}
                  {section.children?.map((child, childIdx) => (
                    <div key={child.id} className="mb-8">
                      <h2 className="text-lg font-semibold mb-4" style={{ color: primaryColor }}>
                        {idx + 1}.{childIdx + 1} {child.title}
                      </h2>

                      {child.content && child.content.length > 0 && (
                        <div className="space-y-4 ml-4">
                          {child.content.map((item) => (
                            <div key={item.id} className="border-l-2 border-gray-200 pl-4">
                              {item.type === 'text' && (
                                <p className="text-gray-700 leading-relaxed">
                                  {item.data || "Contenu de la sous-section avec des informations détaillées et pertinentes."}
                                </p>
                              )}
                              {item.type === 'table' && (
                                <div className="bg-gray-50 p-4 rounded">
                                  <p className="text-center text-gray-600">Tableau de données - Sous-section</p>
                                </div>
                              )}
                              {item.type === 'dashboard' && (
                                <div className="bg-gray-50 p-4 rounded">
                                  <p className="text-center text-gray-600">Dashboard KPI - Sous-section</p>
                                </div>
                              )}
                              {item.type === 'comment' && (
                                <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                                  <p className="text-yellow-800 text-sm">
                                    {item.data || "Commentaire pour cette sous-section"}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pied de page du contenu */}
                <div className="border-t px-8 py-4 flex justify-between text-sm text-gray-700">
                  <div className="flex items-center space-x-4">
                    <span>{companyName}</span>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Shield className="w-4 h-4" />
                      <span>Document Confidentiel</span>
                    </div>
                  </div>
                  <div>Page {idx + 3}</div>
                </div>
              </div>
            </div>
          ))}

          {/* Couverture de dos */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden print:shadow-none print:rounded-none page-break-after">
            <div className="bg-white rounded-lg min-h-[297mm] flex flex-col p-12"
                 style={{ borderTop: showBorderBack ? `4px solid ${primaryColor}` : 'none' }}>
              <div className="flex-1 flex flex-col justify-between">
                {/* Section supérieure avec logo et informations entreprise */}
                <div className="text-center">
                  <div className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center mx-auto mb-6">
                    <Building2 className="w-8 h-8 text-gray-700" />
                  </div>
                  <h2 className="text-lg font-bold mb-2" style={{ color: primaryColor }}>
                    {companyName}
                  </h2>
                </div>

                {/* Section centrale avec résumé du rapport */}
                <div className="flex-1 flex flex-col justify-center space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Résumé Exécutif</h3>
                    <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
                      {backCoverSummary} {reportPeriod}.
                    </p>
                  </div>

                  {showStats && (
                    <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto mt-8">
                      <div className="text-center p-4 border rounded-lg">
                        <h4 className="font-medium text-gray-700">Sections</h4>
                        <p className="text-lg font-bold" style={{ color: primaryColor }}>
                          {sections.filter(s => s.title !== 'Page de garde').length}
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <h4 className="font-medium text-gray-700">Pages</h4>
                        <p className="text-lg font-bold" style={{ color: primaryColor }}>
                          {sections.filter(s => s.title !== 'Page de garde').length + 2}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section inférieure avec contact */}
                {showContact && (
                  <div className="text-center text-sm text-gray-600 space-y-2">
                    <div className="flex items-center justify-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-4 h-4" />
                        <span>{contactEmail}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Phone className="w-4 h-4" />
                        <span>{contactPhone}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center space-x-1">
                      <Globe className="w-4 h-4" />
                      <span>{contactWebsite}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 flex items-center justify-between text-xs text-gray-700">
                <div className="flex items-center space-x-4">
                  <span>{companyName}</span>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3" />
                    <span>Document Confidentiel</span>
                  </div>
                </div>
                <div>Couverture de dos</div>
              </div>
            </div>
          </div>

          {/* Boutons d'action pour l'aperçu */}
          <div className="flex justify-center space-x-4 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>{t('common.print')}</span>
            </button>
            <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Exporter PDF</span>
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full h-[90vh] max-w-7xl flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-gray-50 border-r flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Sommaire du Rapport</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {sections.map(section => renderSectionItem(section))}
            </div>

            <button
              onClick={() => handleAddSection()}
              className="mt-4 w-full p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Ajouter un module</span>
            </button>

            {selectedSectionId && (
              <div className="mt-6 p-4 bg-white border-2 border-blue-200 rounded-lg">
                <p className="text-sm font-medium mb-3">
                  Insérer dans : {sections.find(s => s.id === selectedSectionId)?.title ||
                    sections.flatMap(s => s.children || []).find(c => c.id === selectedSectionId)?.title}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setContentSelectorType('table');
                      setShowContentSelector(true);
                    }}
                    className="p-2 border rounded-lg hover:bg-blue-50 flex items-center space-x-2"
                  >
                    <Database className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Tableau</span>
                  </button>
                  <button
                    onClick={() => {
                      setContentSelectorType('dashboard');
                      setShowContentSelector(true);
                    }}
                    className="p-2 border rounded-lg hover:bg-green-50 flex items-center space-x-2"
                  >
                    <BarChart3 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{t('dashboard.title')}</span>
                  </button>
                  <button
                    onClick={() => handleInsertContent(selectedSectionId, 'text')}
                    className="p-2 border rounded-lg hover:bg-purple-50 flex items-center space-x-2"
                  >
                    <Type className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Texte</span>
                  </button>
                  <button
                    onClick={() => handleInsertContent(selectedSectionId, 'comment')}
                    className="p-2 border rounded-lg hover:bg-orange-50 flex items-center space-x-2"
                  >
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                    <span className="text-sm">Commentaire</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t">
            <button className="w-full p-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg flex items-center justify-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Générer avec l'IA</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-bold">Nouveau Rapport</h2>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveView('cover')}
                  className={`px-3 py-1 rounded ${activeView === 'cover' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  Page de garde
                </button>
                <button
                  onClick={() => setActiveView('backcover')}
                  className={`px-3 py-1 rounded ${activeView === 'backcover' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  Couverture de dos
                </button>
                <button
                  onClick={() => setActiveView('content')}
                  className={`px-3 py-1 rounded ${activeView === 'content' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  Contenu
                </button>
                <button
                  onClick={() => setActiveView('preview')}
                  className={`px-3 py-1 rounded flex items-center space-x-1 ${activeView === 'preview' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  <Eye className="w-4 h-4" />
                  <span>Aperçu</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Actions</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-10">
                    <div className="p-1">
                      <button className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded flex items-center space-x-2">
                        <Eye className="w-4 h-4" />
                        <span>Voir le rapport</span>
                      </button>
                      <button className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded flex items-center space-x-2">
                        <Edit className="w-4 h-4" />
                        <span>{t('common.edit')}</span>
                      </button>
                      <button className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded flex items-center space-x-2" aria-label="Enregistrer">
                        <Save className="w-4 h-4" />
                        <span>{t('actions.save')}</span>
                      </button>
                      <hr className="my-1" />
                      <button className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded flex items-center space-x-2" aria-label="Télécharger">
                        <Download className="w-4 h-4" />
                        <span>{t('common.export')}</span>
                      </button>
                      <button className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded flex items-center space-x-2" aria-label="Imprimer">
                        <Printer className="w-4 h-4" />
                        <span>{t('common.print')}</span>
                      </button>
                      <button className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded flex items-center space-x-2">
                        <Share2 className="w-4 h-4" />
                        <span>Partager</span>
                      </button>
                      <hr className="my-1" />
                      <button className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded flex items-center space-x-2 text-red-600" aria-label="Supprimer">
                        <Trash2 className="w-4 h-4" />
                        <span>{t('common.delete')}</span>
                      </button>
                      <hr className="my-1" />
                      <button className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded flex items-center space-x-2">
                        <LifeBuoy className="w-4 h-4" />
                        <span>Support</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Fermer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {renderContent()}
          </div>
        </div>

        {/* Modal de sélection de contenu */}
        {showContentSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Sélectionner {contentSelectorType === 'table' ? 'un tableau' : 'un dashboard'}
                </h3>
                <button
                  onClick={() => {
                    setShowContentSelector(false);
                    setContentSelectorType(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Configuration de période */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-3">Période pour les données :</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Date de début</label>
                      <input
                        type="date"
                        value={selectedContentPeriod.start || reportStartDate}
                        onChange={(e) => setSelectedContentPeriod(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Date de fin</label>
                      <input
                        type="date"
                        value={selectedContentPeriod.end || reportEndDate}
                        onChange={(e) => setSelectedContentPeriod(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 mt-2">
                    Par défaut, la période du rapport ({reportStartDate} au {reportEndDate}) sera utilisée
                  </p>
                </div>

                <div className="space-y-6">
                  <h4 className="font-medium text-gray-700 text-lg">
                    {contentSelectorType === 'table' ? 'Sélectionner un tableau' : 'Sélectionner un dashboard'}
                  </h4>

                  <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <h5 className="font-medium text-gray-900">
                        {contentSelectorType === 'table' ? 'Tableaux disponibles' : 'Dashboards disponibles'} :
                      </h5>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Nom
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Type de données
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Période
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(contentSelectorType === 'table' ? [
                            {
                              id: 'balance_syscohada',
                              name: 'Balance SYSCOHADA',
                              description: 'Balance comptable selon les normes SYSCOHADA - Classes 1-7 détaillées',
                              dataRange: 'Données comptables'
                            },
                            {
                              id: 'grand_livre',
                              name: 'Grand Livre Général',
                              description: 'Mouvements détaillés par compte comptable',
                              dataRange: 'Données comptables'
                            },
                            {
                              id: 'etats_financiers',
                              name: 'États Financiers SYSCOHADA',
                              description: 'Bilan et compte de résultat conformes SYSCOHADA',
                              dataRange: 'Données annuelles'
                            },
                            {
                              id: 'sig_cascade',
                              name: 'Soldes Intermédiaires de Gestion (SIG)',
                              description: 'Cascade des SIG - Marge commerciale, VA, EBE, Résultat',
                              dataRange: 'Données financières'
                            },
                            {
                              id: 'tafire',
                              name: 'TAFIRE - Tableau des Flux',
                              description: 'Tableau Financier des Ressources et Emplois',
                              dataRange: 'Données de flux'
                            },
                            {
                              id: 'bilan_fonctionnel',
                              name: 'Bilan Fonctionnel',
                              description: 'FRNG, BFR et Trésorerie nette',
                              dataRange: 'Données fonctionnelles'
                            },
                            {
                              id: 'ratios_financiers',
                              name: 'Ratios Financiers',
                              description: 'Ratios de liquidité, solvabilité, rentabilité et activité',
                              dataRange: 'Données d&apos;analyse'
                            },
                            {
                              id: 'budget_vs_realise',
                              name: 'Budget vs Réalisé',
                              description: 'Comparaison budget et réalisations par poste',
                              dataRange: 'Données budgétaires'
                            },
                            {
                              id: 'execution_budgetaire',
                              name: 'Exécution Budgétaire',
                              description: 'Suivi détaillé de l&apos;exécution budgétaire par responsable',
                              dataRange: 'Données de suivi'
                            },
                            {
                              id: 'tresorerie_position',
                              name: 'Position de Trésorerie',
                              description: 'Position consolidée temps réel des comptes bancaires',
                              dataRange: 'Données temps réel'
                            },
                            {
                              id: 'mouvements_bancaires',
                              name: 'Mouvements Bancaires',
                              description: 'Historique des mouvements par compte bancaire',
                              dataRange: 'Données quotidiennes'
                            },
                            {
                              id: 'clients_encours',
                              name: 'Encours Clients',
                              description: 'Position créances clients et recouvrement',
                              dataRange: 'Données clients'
                            },
                            {
                              id: 'balance_agee',
                              name: 'Balance Âgée Clients',
                              description: 'Ancienneté des créances par tranche',
                              dataRange: 'Données d&apos;ancienneté'
                            },
                            {
                              id: 'plan_comptable',
                              name: 'Plan Comptable SYSCOHADA',
                              description: 'Plan comptable à 9 positions conforme SYSCOHADA',
                              dataRange: 'Données de référence'
                            },
                          ] : contentSelectorType === 'dashboard' ? [
                            {
                              id: 'executive_dashboard',
                              name: 'Dashboard Exécutif',
                              description: 'Vue stratégique et performance globale de l&apos;entreprise',
                              dataRange: 'KPIs consolidés'
                            },
                            {
                              id: 'financial_analysis_dashboard',
                              name: 'Analyse Financière Avancée',
                              description: 'TAFIRE, SIG, Bilan Fonctionnel et Ratios SYSCOHADA',
                              dataRange: 'Analyses financières'
                            },
                            {
                              id: 'treasury_dashboard',
                              name: 'Centre de Trésorerie',
                              description: 'Gestion financière temps réel et position bancaire',
                              dataRange: 'Données de trésorerie'
                            },
                            {
                              id: 'accounting_dashboard',
                              name: 'Module Comptabilité SYSCOHADA',
                              description: 'Gestion comptable selon les normes SYSCOHADA',
                              dataRange: 'Données comptables'
                            },
                            {
                              id: 'budgeting_dashboard',
                              name: 'Tableau de Bord Budgétaire',
                              description: 'Suivi et contrôle budgétaire en temps réel',
                              dataRange: 'Contrôle budgétaire'
                            },
                            {
                              id: 'customer_dashboard',
                              name: 'Dashboard Clients',
                              description: 'CRM et gestion de la relation client',
                              dataRange: 'Données clients'
                            },
                            {
                              id: 'reporting_dashboards',
                              name: 'Tableaux de Bord Reporting',
                              description: 'Dashboards personnalisés et analytics',
                              dataRange: 'Reporting BI'
                            },
                            {
                              id: 'manager_workspace',
                              name: 'Espace Manager',
                              description: 'Dashboard consolidé pour managers avec KPIs',
                              dataRange: 'Données managériales'
                            },
                          ] : [
                            {
                              id: 'executive_dashboard',
                              name: 'Dashboard Exécutif',
                              description: 'Vue stratégique et performance globale de l&apos;entreprise',
                              dataRange: 'KPIs consolidés'
                            },
                            {
                              id: 'financial_analysis_dashboard',
                              name: 'Analyse Financière Avancée',
                              description: 'TAFIRE, SIG, Bilan Fonctionnel et Ratios SYSCOHADA',
                              dataRange: 'Analyses financières'
                            },
                            {
                              id: 'treasury_dashboard',
                              name: 'Centre de Trésorerie',
                              description: 'Gestion financière temps réel et position bancaire',
                              dataRange: 'Données de trésorerie'
                            },
                            {
                              id: 'accounting_dashboard',
                              name: 'Module Comptabilité SYSCOHADA',
                              description: 'Gestion comptable selon les normes SYSCOHADA',
                              dataRange: 'Données comptables'
                            },
                            {
                              id: 'budgeting_dashboard',
                              name: 'Tableau de Bord Budgétaire',
                              description: 'Suivi et contrôle budgétaire en temps réel',
                              dataRange: 'Contrôle budgétaire'
                            },
                            {
                              id: 'customer_dashboard',
                              name: 'Dashboard Clients',
                              description: 'CRM et gestion de la relation client',
                              dataRange: 'Données clients'
                            },
                            {
                              id: 'reporting_dashboards',
                              name: 'Tableaux de Bord Reporting',
                              description: 'Dashboards personnalisés et analytics',
                              dataRange: 'Reporting BI'
                            },
                            {
                              id: 'manager_workspace',
                              name: 'Espace Manager',
                              description: 'Dashboard consolidé pour managers avec KPIs',
                              dataRange: 'Données managériales'
                            },
                          ]).map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {contentSelectorType === 'table' ? (
                                    <Database className="w-5 h-5 text-blue-600 mr-3" />
                                  ) : (
                                    <BarChart3 className="w-5 h-5 text-green-600 mr-3" />
                                  )}
                                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-sm text-gray-600">{item.description}</span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                                  {item.dataRange}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                {selectedContentPeriod.start || reportStartDate} au {selectedContentPeriod.end || reportEndDate}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    onClick={() => {
                                      // Prévisualisation
                                    }}
                                    className="p-2 text-gray-700 hover:text-blue-600 transition-colors"
                                    title="Prévisualiser"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const contentWithPeriod = {
                                        ...item,
                                        periodStart: selectedContentPeriod.start || reportStartDate,
                                        periodEnd: selectedContentPeriod.end || reportEndDate
                                      };
                                      handleInsertContent(selectedSectionId, contentSelectorType, contentWithPeriod);
                                      setShowContentSelector(false);
                                      setContentSelectorType(null);
                                      setSelectedContentPeriod({ start: '', end: '' });
                                    }}
                                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                  >
                                    Sélectionner
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Cliquez sur {contentSelectorType === 'table' ? 'un tableau' : 'un dashboard'} pour l'ajouter à votre rapport
                  </p>
                  <button
                    onClick={() => {
                      setShowContentSelector(false);
                      setContentSelectorType(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewReportCreator;