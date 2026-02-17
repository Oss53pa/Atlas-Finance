import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileText } from 'lucide-react';
import JournalEntryModal from './JournalEntryModal';

const FloatingJournalButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Bouton flottant */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-8 right-8 z-40"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 group"
        >
          <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-all">
            <FileText className="h-6 w-6" />
          </div>
          <span className="font-semibold hidden sm:block">Nouvelle Écriture</span>
          <Plus className="h-4 w-4 sm:hidden" />
        </motion.button>
      </motion.div>

      {/* Modal */}
      <JournalEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default FloatingJournalButton;