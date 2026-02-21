import {
  BarChart3, UserCircle, Receipt, ScrollText, Bell,
  CreditCard, Percent, Banknote, History, FileText,
  Phone, Mail, MessageSquare, Users, AlertTriangle, Award
} from 'lucide-react';

export const dossierTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'client', label: 'Client', icon: UserCircle },
  { id: 'creances', label: 'Créances', icon: Receipt },
  { id: 'contract', label: 'Contract', icon: ScrollText },
  { id: 'reminders', label: 'Reminders history', icon: Bell },
  { id: 'payments', label: 'Payments history', icon: CreditCard },
  { id: 'interest', label: 'Interest and penalties', icon: Percent },
  { id: 'repayment', label: 'Repayment plan', icon: Banknote },
  { id: 'actions', label: 'Historique des actions', icon: History },
  { id: 'attachments', label: 'Attachments', icon: FileText }
];

export const getStatutColor = (statut: string) => {
  const colors = {
    'EN_COURS': 'bg-[#6A8A82]/10 text-[#6A8A82]',
    'RESOLU': 'bg-green-100 text-green-800',
    'CONTENTIEUX': 'bg-red-100 text-red-800',
    'IRRECUPERABLE': 'bg-gray-100 text-gray-800',
    'actif': 'bg-blue-100 text-blue-800',
    'suspendu': 'bg-orange-100 text-orange-800',
    'cloture': 'bg-gray-100 text-gray-800',
    'juridique': 'bg-purple-100 text-purple-800'
  };
  return colors[statut as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

export const getStatutLabel = (statut: string) => {
  const labels = {
    'actif': 'Actif',
    'suspendu': 'Suspendu',
    'cloture': 'Clôturé',
    'juridique': 'Juridique',
    'EN_COURS': 'En cours',
    'RESOLU': 'Résolu',
    'CONTENTIEUX': 'Contentieux',
    'IRRECUPERABLE': 'Irrécupérable'
  };
  return labels[statut as keyof typeof labels] || statut;
};

export const getNiveauColor = (niveau: string) => {
  const colors = {
    'AUCUNE': 'bg-gray-100 text-gray-800',
    'RELANCE_1': 'bg-yellow-100 text-yellow-800',
    'RELANCE_2': 'bg-orange-100 text-orange-800',
    'RELANCE_3': 'bg-red-100 text-red-800',
    'MISE_EN_DEMEURE': 'bg-[#B87333]/10 text-[#B87333]',
    'CONTENTIEUX': 'bg-red-200 text-red-900'
  };
  return colors[niveau as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

export const getUrgenceColor = (joursRetard: number) => {
  if (joursRetard <= 0) return 'text-green-600';
  if (joursRetard <= 15) return 'text-yellow-600';
  if (joursRetard <= 30) return 'text-orange-600';
  return 'text-red-600';
};

export const getActionIcon = (type: string) => {
  const icons = {
    'APPEL': Phone,
    'EMAIL': Mail,
    'COURRIER': FileText,
    'SMS': MessageSquare,
    'VISITE': Users,
    'MISE_EN_DEMEURE': AlertTriangle,
    'PROCEDURE_JUDICIAIRE': Award
  };
  return icons[type as keyof typeof icons] || MessageSquare;
};
