// @ts-nocheck

import React from 'react';
import { motion } from 'framer-motion';
import { FileCheck, ExternalLink, Info } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from '../../components/ui';

/**
 * LiasseFiscalePage
 *
 * La génération de la liasse fiscale est déléguée à Liass'Pilot, l'outil
 * spécialisé d'Atlas Studio. Atlas Finance produit les états financiers
 * (Bilan, Compte de Résultat, TFT) qui servent de base à Liass'Pilot.
 *
 * Cette page conserve son emplacement dans la navigation mais présente
 * uniquement une redirection vers Liass'Pilot — les anciens écrans de
 * génération/export sont supprimés.
 */
const LIASS_PILOT_URL = 'https://liass-pilot.atlas-studio.org';

const LiasseFiscalePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b border-gray-200 pb-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center">
              <FileCheck className="mr-3 h-7 w-7 text-blue-600" />
              Liasse Fiscale
            </h1>
            <p className="mt-2 text-gray-600">
              Génération et gestion de la liasse fiscale selon les normes SYSCOHADA
            </p>
          </div>
        </div>
      </motion.div>

      {/* Info Card — Liass'Pilot delegation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Info className="mr-2 h-5 w-5" />
              Liasse fiscale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm leading-relaxed text-neutral-700">
              La liasse fiscale est générée par{' '}
              <span className="font-semibold text-blue-800">Liass'Pilot</span>,
              l'outil spécialisé d'Atlas Studio pour la production de liasses
              fiscales conformes DGI. Atlas Finance produit les états financiers
              (Bilan, Compte de Résultat, TFT) qui servent de base à Liass'Pilot.
            </p>

            <div className="flex items-center gap-3">
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => window.open(LIASS_PILOT_URL, '_blank', 'noopener,noreferrer')}
              >
                Ouvrir Liass'Pilot
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
              <span className="text-xs text-neutral-500">
                Ouvre l'application externe dans un nouvel onglet
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default LiasseFiscalePage;
