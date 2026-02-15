import React, { useState } from 'react';
import { ChatBubbleLeftEllipsisIcon, UserCircleIcon } from '@heroicons/react/24/outline';

interface LedgerEntry {
  id: string;
  account_number: string;
  account_label: string;
}

interface CollaborativeAnnotationsProps {
  entry: LedgerEntry;
}

const CollaborativeAnnotations: React.FC<CollaborativeAnnotationsProps> = ({ entry }) => {
  const [newAnnotation, setNewAnnotation] = useState('');
  const [annotations] = useState([
    {
      id: '1',
      user: 'Marie Dubois',
      text: 'Vérifier ce virement avec le service trésorerie',
      date: '2024-01-20T10:30:00Z'
    }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAnnotation.trim()) {
      setNewAnnotation('');
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-gray-700" />
        <h3 className="font-semibold text-gray-900">Annotations</h3>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        {entry.account_number} - {entry.account_label}
      </div>

      {/* Liste des annotations */}
      <div className="space-y-3 mb-4">
        {annotations.map((annotation) => (
          <div key={annotation.id} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <UserCircleIcon className="h-4 w-4 text-gray-700" />
              <span className="text-xs font-medium text-gray-700">{annotation.user}</span>
              <span className="text-xs text-gray-700">
                {new Date(annotation.date).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <p className="text-sm text-gray-900">{annotation.text}</p>
          </div>
        ))}
      </div>

      {/* Formulaire nouvelle annotation */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newAnnotation}
          onChange={(e) => setNewAnnotation(e.target.value)}
          placeholder="Ajouter une annotation..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          Ajouter
        </button>
      </form>
    </div>
  );
};

export default CollaborativeAnnotations;