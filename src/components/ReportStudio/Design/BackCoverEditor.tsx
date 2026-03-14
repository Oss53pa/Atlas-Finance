/**
 * BackCoverEditor - Editor for back cover settings
 */

import React from 'react';
import { BookOpen, Mail, Phone, Globe, MapPin, User } from 'lucide-react';
import { useReportDesignStore } from '@/stores/reportDesignStore';
import type { BackCoverContent } from '@/types/reportDesign';

const BackCoverEditor: React.FC = () => {
  const { settings, updateBackCover } = useReportDesignStore();
  const { backCover } = settings;

  const contentTypes: { id: BackCoverContent; label: string; description: string }[] = [
    { id: 'contact', label: 'Coordonnees', description: 'Afficher les informations de contact' },
    { id: 'legal', label: 'Mentions legales', description: 'Confidentialite et droits d\'auteur' },
    { id: 'notes', label: 'Notes', description: 'Espace pour notes manuscrites' },
    { id: 'custom', label: 'Personnalise', description: 'Contenu libre' },
  ];

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h4 className="font-medium text-gray-900">Couverture de dos</h4>
          <p className="text-sm text-gray-500">Ajouter une page de fin au rapport</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={backCover.enabled}
            onChange={(e) => updateBackCover({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {backCover.enabled && (
        <>
          {/* Content type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <BookOpen className="w-4 h-4 inline mr-1" />
              Type de contenu
            </label>
            <div className="space-y-2">
              {contentTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => updateBackCover({ content: type.id })}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                    backCover.content === type.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                      backCover.content === type.id ? 'border-indigo-600' : 'border-gray-300'
                    }`}
                  >
                    {backCover.content === type.id && (
                      <div className="w-2 h-2 rounded-full bg-indigo-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-sm text-gray-500">{type.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Contact info (if contact or custom) */}
          {(backCover.content === 'contact' || backCover.showContact) && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">Informations de contact</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Nom
                </label>
                <input
                  type="text"
                  value={backCover.contactInfo?.name || ''}
                  onChange={(e) =>
                    updateBackCover({
                      contactInfo: { ...backCover.contactInfo, name: e.target.value },
                    })
                  }
                  placeholder="Nom ou raison sociale"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={backCover.contactInfo?.email || ''}
                  onChange={(e) =>
                    updateBackCover({
                      contactInfo: { ...backCover.contactInfo, email: e.target.value },
                    })
                  }
                  placeholder="contact@entreprise.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Telephone
                </label>
                <input
                  type="tel"
                  value={backCover.contactInfo?.phone || ''}
                  onChange={(e) =>
                    updateBackCover({
                      contactInfo: { ...backCover.contactInfo, phone: e.target.value },
                    })
                  }
                  placeholder="+33 1 23 45 67 89"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Adresse
                </label>
                <textarea
                  value={backCover.contactInfo?.address || ''}
                  onChange={(e) =>
                    updateBackCover({
                      contactInfo: { ...backCover.contactInfo, address: e.target.value },
                    })
                  }
                  placeholder="Adresse complete"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Site web
                </label>
                <input
                  type="url"
                  value={backCover.contactInfo?.website || ''}
                  onChange={(e) =>
                    updateBackCover({
                      contactInfo: { ...backCover.contactInfo, website: e.target.value },
                    })
                  }
                  placeholder="https://www.entreprise.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Custom content */}
          {backCover.content === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contenu personnalise
              </label>
              <textarea
                value={backCover.customContent || ''}
                onChange={(e) => updateBackCover({ customContent: e.target.value })}
                placeholder="Saisissez votre contenu personnalise..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Afficher le logo</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={backCover.showLogo}
                  onChange={(e) => updateBackCover({ showLogo: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {backCover.content !== 'contact' && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  Afficher les coordonnees
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={backCover.showContact}
                    onChange={(e) => updateBackCover({ showContact: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BackCoverEditor;
