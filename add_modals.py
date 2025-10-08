#!/usr/bin/env python3
# -*- coding: utf-8 -*-

modals_content = """
      {/* Modal Dupliquer */}
      {showDuplicateModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <Copy className="w-5 h-5 mr-2 text-[#6A8A82]" />
                Dupliquer l'actif
              </h3>
              <button onClick={() => setShowDuplicateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Vous allez créer une copie de l'actif <strong>{selectedAsset.numeroActif}</strong>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau numéro d'actif</label>
                <input
                  type="text"
                  defaultValue={`${selectedAsset.numeroActif}-COPIE`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouvelle description</label>
                <input
                  type="text"
                  defaultValue={`${selectedAsset.description} (Copie)`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  alert(`Actif dupliqué avec succès`);
                  setShowDuplicateModal(false);
                }}
                className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72]"
              >
                Dupliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Archiver */}
      {showArchiveModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <Archive className="w-5 h-5 mr-2 text-orange-500" />
                Archiver l'actif
              </h3>
              <button onClick={() => setShowArchiveModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Êtes-vous sûr de vouloir archiver l'actif <strong>{selectedAsset.numeroActif}</strong> ?
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-800">
                L'actif sera déplacé dans les archives et ne sera plus visible dans la liste principale.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison de l'archivage</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Actif obsolète</option>
                  <option>Fin de vie</option>
                  <option>Remplacé</option>
                  <option>Plus utilisé</option>
                  <option>Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Ajoutez des notes..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  alert(`Actif archivé avec succès`);
                  setShowArchiveModal(false);
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Archiver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Imprimer Étiquette */}
      {showPrintLabelModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <Tag className="w-5 h-5 mr-2 text-blue-500" />
                Imprimer l'étiquette
              </h3>
              <button onClick={() => setShowPrintLabelModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-lg">{selectedAsset.numeroActif}</p>
                  <p className="text-sm text-gray-600">{selectedAsset.description}</p>
                  <p className="text-xs text-gray-500">Classe: {selectedAsset.classe}</p>
                </div>
                <div className="w-20 h-20 bg-gray-200 flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-gray-600" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format d'étiquette</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Standard (70x30mm)</option>
                  <option>Petit (50x25mm)</option>
                  <option>Grand (100x50mm)</option>
                  <option>Code-barres seulement</option>
                </select>
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">Inclure QR Code</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">Inclure description</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPrintLabelModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  window.print();
                  setShowPrintLabelModal(false);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {showHistoryModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center">
                  <History className="w-5 h-5 mr-2 text-purple-500" />
                  Historique de l'actif {selectedAsset.numeroActif}
                </h3>
                <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {[
                  { date: '15/03/2024', user: 'Jean Dupont', action: 'Maintenance', detail: 'Vidange effectuée', status: 'success' },
                  { date: '01/03/2024', user: 'Marie Martin', action: 'Modification', detail: 'Changement de localisation', status: 'info' },
                  { date: '15/02/2024', user: 'Tech Service', action: 'Inspection', detail: 'Contrôle technique OK', status: 'success' },
                  { date: '10/01/2024', user: 'Admin', action: 'Mise à jour', detail: 'Actualisation valeur comptable', status: 'warning' },
                  { date: '16/06/2017', user: 'System', action: 'Création', detail: 'Actif créé dans le système', status: 'info' }
                ].map((event, idx) => (
                  <div key={idx} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      event.status === 'success' ? 'bg-green-500' :
                      event.status === 'warning' ? 'bg-orange-500' :
                      event.status === 'info' ? 'bg-blue-500' : 'bg-gray-500'
                    }`} />
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{event.action}</span>
                          <span className="text-xs text-gray-500">{event.date}</span>
                        </div>
                        <p className="text-sm text-gray-700">{event.detail}</p>
                        <p className="text-xs text-gray-500 mt-1">Par {event.user}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Exporter */}
      {showExportModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <Download className="w-5 h-5 mr-2 text-green-500" />
                Exporter l'actif
              </h3>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Sélectionnez le format d'export pour l'actif <strong>{selectedAsset.numeroActif}</strong>
            </p>
            <div className="space-y-2">
              <button className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="w-5 h-5 mr-3 text-blue-500" />
                  <div>
                    <p className="font-medium">Excel (.xlsx)</p>
                    <p className="text-xs text-gray-500">Feuille de calcul avec toutes les données</p>
                  </div>
                </span>
              </button>
              <button className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="w-5 h-5 mr-3 text-green-500" />
                  <div>
                    <p className="font-medium">CSV (.csv)</p>
                    <p className="text-xs text-gray-500">Valeurs séparées par virgules</p>
                  </div>
                </span>
              </button>
              <button className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="w-5 h-5 mr-3 text-red-500" />
                  <div>
                    <p className="font-medium">PDF (.pdf)</p>
                    <p className="text-xs text-gray-500">Document formaté pour impression</p>
                  </div>
                </span>
              </button>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Supprimer */}
      {showDeleteModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-red-600">
                <Trash2 className="w-5 h-5 mr-2" />
                Supprimer l'actif
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>Attention!</strong> Cette action est irréversible. L'actif sera définitivement supprimé du système.
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Vous êtes sur le point de supprimer l'actif:
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="font-bold">{selectedAsset.numeroActif}</p>
              <p className="text-sm text-gray-600">{selectedAsset.description}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tapez <strong>SUPPRIMER</strong> pour confirmer
              </label>
              <input
                type="text"
                placeholder="SUPPRIMER"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  alert(`Actif supprimé avec succès`);
                  setShowDeleteModal(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
"""

# Read current file
with open('frontend/src/pages/assets/AssetsListComplete.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find where to insert (before the closing </div> and return)
insert_pos = -1
for i in range(len(lines) - 1, -1, -1):
    if '    </div>' in lines[i] and '  );' in lines[i+1]:
        insert_pos = i
        break

if insert_pos == -1:
    print("Could not find insertion point")
    exit(1)

# Build new content
new_content = []
new_content.extend(lines[:insert_pos])
new_content.append('\n' + modals_content + '\n')
new_content.extend(lines[insert_pos:])

# Write the file
with open('frontend/src/pages/assets/AssetsListComplete.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_content)

print(f"Added modals at line {insert_pos}")
print(f"New file has {len(new_content)} lines")