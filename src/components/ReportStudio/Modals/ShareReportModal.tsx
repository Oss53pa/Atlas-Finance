/**
 * ShareReportModal - Modal for sharing reports via link, PDF, or email
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Link2,
  FileDown,
  Mail,
  Copy,
  Check,
  Calendar,
  Eye,
  Lock,
  ExternalLink,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { reportShareService } from '@/services/reportShareService';
import type { ReportShareLink, ShareFormat, CreateShareLinkData } from '@/types/reportDesign';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportTitle: string;
}

type TabType = 'link' | 'pdf' | 'email';

const ShareReportModal: React.FC<ShareReportModalProps> = ({
  isOpen,
  onClose,
  reportId,
  reportTitle,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('link');
  const [isLoading, setIsLoading] = useState(false);
  const [existingLinks, setExistingLinks] = useState<ReportShareLink[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Link creation form state
  const [linkFormat, setLinkFormat] = useState<ShareFormat>('html');
  const [expiresIn, setExpiresIn] = useState<string>('7');
  const [maxViews, setMaxViews] = useState<string>('');
  const [password, setPassword] = useState('');
  const [canDownload, setCanDownload] = useState(true);

  // Email form state
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailSubject, setEmailSubject] = useState(`Rapport: ${reportTitle}`);
  const [emailMessage, setEmailMessage] = useState('');
  const [attachPdf, setAttachPdf] = useState(true);
  const [includeLink, setIncludeLink] = useState(true);

  // Load existing links
  useEffect(() => {
    if (isOpen) {
      loadExistingLinks();
    }
  }, [isOpen, reportId]);

  const loadExistingLinks = async () => {
    try {
      const links = await reportShareService.getShareLinks(reportId);
      setExistingLinks(links);
    } catch (err) {
      console.error('Failed to load share links:', err);
    }
  };

  const handleCreateLink = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const expiresAt = expiresIn
        ? new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const data: CreateShareLinkData = {
        reportId,
        format: linkFormat,
        expiresAt,
        maxViews: maxViews ? parseInt(maxViews) : undefined,
        password: password || undefined,
        canDownload,
      };

      const newLink = await reportShareService.createShareLink(data);
      setExistingLinks([newLink, ...existingLinks]);
      setSuccess('Lien cree avec succes');

      // Copy to clipboard
      await reportShareService.copyToClipboard(newLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la creation du lien');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async (url: string) => {
    const success = await reportShareService.copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      await reportShareService.deleteShareLink(id);
      setExistingLinks(existingLinks.filter((l) => l.id !== id));
      setSuccess('Lien supprime');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleDownloadPdf = async () => {
    setIsLoading(true);
    try {
      const url = await reportShareService.getPdfDownloadUrl(reportId);
      window.open(url, '_blank');
    } catch (err: any) {
      setError(err.message || 'Erreur lors du telechargement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailRecipients.trim()) {
      setError('Veuillez saisir au moins un destinataire');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const recipients = emailRecipients.split(',').map((r) => r.trim());
      const result = await reportShareService.sendByEmail({
        reportId,
        recipients,
        subject: emailSubject,
        message: emailMessage,
        format: attachPdf ? 'pdf' : 'html',
        includeLink,
        attachPdf,
      });

      if (result.success) {
        setSuccess(result.message);
        setEmailRecipients('');
        setEmailMessage('');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Partager le rapport</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'link' as TabType, label: 'Lien de partage', icon: Link2 },
            { id: 'pdf' as TabType, label: 'Telecharger PDF', icon: FileDown },
            { id: 'email' as TabType, label: 'Envoyer par email', icon: Mail },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
              <Check className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Link Tab */}
          {activeTab === 'link' && (
            <div className="space-y-6">
              {/* Create new link */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Creer un nouveau lien</h3>

                {/* Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <div className="flex gap-3">
                    {[
                      { id: 'html', label: 'Page web (HTML)' },
                      { id: 'pdf', label: 'Document PDF' },
                      { id: 'both', label: 'Les deux' },
                    ].map((format) => (
                      <button
                        key={format.id}
                        onClick={() => setLinkFormat(format.id as ShareFormat)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          linkFormat === format.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {format.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expiration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Expiration
                    </label>
                    <select
                      value={expiresIn}
                      onChange={(e) => setExpiresIn(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="1">1 jour</option>
                      <option value="7">7 jours</option>
                      <option value="30">30 jours</option>
                      <option value="90">90 jours</option>
                      <option value="">Sans expiration</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Eye className="w-4 h-4 inline mr-1" />
                      Limite de vues
                    </label>
                    <input
                      type="number"
                      value={maxViews}
                      onChange={(e) => setMaxViews(e.target.value)}
                      placeholder="Illimite"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Mot de passe (optionnel)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Laisser vide pour acces libre"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Options */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canDownload}
                      onChange={(e) => setCanDownload(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Autoriser le telechargement</span>
                  </label>
                </div>

                {/* Create button */}
                <button
                  onClick={handleCreateLink}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Lien copie!
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      Creer et copier le lien
                    </>
                  )}
                </button>
              </div>

              {/* Existing links */}
              {existingLinks.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Liens existants</h3>
                  <div className="space-y-2">
                    {existingLinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {link.url}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                link.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {link.format.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{link.viewCount} vues</span>
                            {link.expiresAt && <span>Expire le {formatDate(link.expiresAt)}</span>}
                            {link.password && (
                              <span className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Protege
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopyLink(link.url)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Copier"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Ouvrir"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteLink(link.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PDF Tab */}
          {activeTab === 'pdf' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <FileDown className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Telecharger en PDF</h3>
                <p className="text-gray-500 mb-6">
                  Exportez le rapport complet au format PDF avec le design personnalise.
                </p>
                <button
                  onClick={handleDownloadPdf}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileDown className="w-5 h-5" />
                  )}
                  Telecharger le PDF
                </button>
              </div>
            </div>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destinataires
                </label>
                <input
                  type="text"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  placeholder="email@example.com, autre@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Separez les adresses par des virgules
                </p>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sujet</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (optionnel)
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={4}
                  placeholder="Ajoutez un message personnalise..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachPdf}
                    onChange={(e) => setAttachPdf(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Joindre le PDF en piece jointe</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLink}
                    onChange={(e) => setIncludeLink(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    Inclure un lien vers la version en ligne
                  </span>
                </label>
              </div>

              {/* Send button */}
              <button
                onClick={handleSendEmail}
                disabled={isLoading || !emailRecipients.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Envoyer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareReportModal;
