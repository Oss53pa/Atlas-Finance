import {
  Phone, Mail, FileText, MessageSquare, Users, AlertTriangle, Award,
} from 'lucide-react';

export const getStatutColor = (statut: string): string => {
  const colors: Record<string, string> = {
    'EN_COURS': 'bg-[#6A8A82]/10 text-[#6A8A82]',
    'RESOLU': 'bg-green-100 text-green-800',
    'CONTENTIEUX': 'bg-red-100 text-red-800',
    'IRRECUPERABLE': 'bg-gray-100 text-gray-800',
    'actif': 'bg-blue-100 text-blue-800',
    'suspendu': 'bg-orange-100 text-orange-800',
    'cloture': 'bg-gray-100 text-gray-800',
    'juridique': 'bg-purple-100 text-purple-800',
  };
  return colors[statut] || 'bg-gray-100 text-gray-800';
};

export const getStatutLabel = (statut: string): string => {
  const labels: Record<string, string> = {
    'actif': 'Actif',
    'suspendu': 'Suspendu',
    'cloture': 'Clôturé',
    'juridique': 'Juridique',
    'EN_COURS': 'En cours',
    'RESOLU': 'Résolu',
    'CONTENTIEUX': 'Contentieux',
    'IRRECUPERABLE': 'Irrécupérable',
  };
  return labels[statut] || statut;
};

export const getNiveauColor = (niveau: string): string => {
  const colors: Record<string, string> = {
    'AUCUNE': 'bg-gray-100 text-gray-800',
    'RELANCE_1': 'bg-yellow-100 text-yellow-800',
    'RELANCE_2': 'bg-orange-100 text-orange-800',
    'RELANCE_3': 'bg-red-100 text-red-800',
    'MISE_EN_DEMEURE': 'bg-[#B87333]/10 text-[#B87333]',
    'CONTENTIEUX': 'bg-red-200 text-red-900',
  };
  return colors[niveau] || 'bg-gray-100 text-gray-800';
};

export const getUrgenceColor = (joursRetard: number): string => {
  if (joursRetard <= 0) return 'text-green-600';
  if (joursRetard <= 15) return 'text-yellow-600';
  if (joursRetard <= 30) return 'text-orange-600';
  return 'text-red-600';
};

export const getActionIcon = (type: string) => {
  const icons: Record<string, typeof Phone> = {
    'APPEL': Phone,
    'EMAIL': Mail,
    'COURRIER': FileText,
    'SMS': MessageSquare,
    'VISITE': Users,
    'MISE_EN_DEMEURE': AlertTriangle,
    'PROCEDURE_JUDICIAIRE': Award,
  };
  return icons[type] || MessageSquare;
};

export const formatCurrencyXAF = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDateFR = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR');
};

/** Chart color palette */
export const CHART_COLORS = [
  '#6A8A82', '#B87333', '#171717', '#737373',
  '#404040', '#A3A3A3', '#525252', '#D4D4D4',
];
