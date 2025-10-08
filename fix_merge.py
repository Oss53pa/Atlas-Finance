#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Read the broken merged file
with open('frontend/src/pages/assets/AssetsListComplete.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Add the missing closing tags
closing_tags = """                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditing(false);
                    setEditingAsset(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <ModernButton onClick={() => {
                  const assetToSave = isEditing && editingAsset
                    ? { ...editingAsset, ...newAssetForm }
                    : newAssetForm;

                  handleSaveAsset(assetToSave);
                  setIsModalOpen(false);
                  setIsEditing(false);
                  setEditingAsset(null);
                }}>
                  Enregistrer les modifications
                </ModernButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetsListComplete;
"""

# Append the closing tags
lines.extend(closing_tags.split('\n'))

# Write the fixed file
with open('frontend/src/pages/assets/AssetsListComplete.tsx', 'w', encoding='utf-8') as f:
    for line in lines:
        if line and not line.endswith('\n'):
            f.write(line + '\n')
        else:
            f.write(line)

print(f"Fixed file with {len(lines)} lines")