import React, { useState, useEffect } from 'react';
import {
  Calendar, Lock, Unlock, AlertTriangle, CheckCircle,
  Clock, Info, Shield, XCircle, AlertCircle, PlayCircle,
  StopCircle, PauseCircle, RefreshCw, ArrowRight,
  CalendarX, CalendarCheck, History, Timer, Ban,
  CheckSquare, Square, Activity, TrendingUp, Eye,
  FileWarning, UserCheck, Key, Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Progress } from '../../../components/ui/progress';

interface PeriodeComptable {
  id: string;
  periode: string;
  type: 'mensuelle' | 'trimestrielle' | 'annuelle';
  dateDebut: Date;
  dateFin: Date;
  statut: 'ouverte' | 'en_cloture' | 'fermee' | 'verrouillee' | 'archivee';
  dateOuverture: Date;
  dateCloture?: Date;
  dateVerrouillage?: Date;
  responsable: string;
  progression: number;
  blocages: string[];
  validations: {
    comptable: boolean;
    fiscal: boolean;
    audit: boolean;
    direction: boolean;
  };
  etapesObligatoires: {
    id: string;
    nom: string;
    statut: 'complete' | 'en_cours' | 'en_attente' | 'bloque';
    obligatoire: boolean;
    dateComplete?: Date;
  }[];
}

interface RegleCloture {
  id: string;
  nom: string;
  description: string;
  type: 'blocage' | 'avertissement' | 'information';
  active: boolean;
  condition: string;
}

const ControlePeriodes: React.FC = () => {
  const [selectedPeriode, setSelectedPeriode] = useState<string>('2025-01');
  const [showClotureModal, setShowClotureModal] = useState(false);
  const [showForceClotureModal, setShowForceClotureModal] = useState(false);

  // Date actuelle simulée
  const dateActuelle = new Date('2025-02-15');

  // Périodes comptables
  const periodes: PeriodeComptable[] = [
    {
      id: '1',
      periode: '2025-02',
      type: 'mensuelle',
      dateDebut: new Date('2025-02-01'),
      dateFin: new Date('2025-02-28'),
      statut: 'ouverte',
      dateOuverture: new Date('2025-02-01'),
      responsable: 'Marie Kouadio',
      progression: 45,
      blocages: ['Période en cours'],
      validations: {
        comptable: false,
        fiscal: false,
        audit: false,
        direction: false
      },
      etapesObligatoires: [
        { id: '1', nom: 'Saisie des écritures', statut: 'en_cours', obligatoire: true },
        { id: '2', nom: 'Rapprochement bancaire', statut: 'en_attente', obligatoire: true },
        { id: '3', nom: 'Validation stocks', statut: 'en_attente', obligatoire: true },
        { id: '4', nom: 'Contrôles cohérence', statut: 'en_attente', obligatoire: true }
      ]
    },
    {
      id: '2',
      periode: '2025-01',
      type: 'mensuelle',
      dateDebut: new Date('2025-01-01'),
      dateFin: new Date('2025-01-31'),
      statut: 'en_cloture',
      dateOuverture: new Date('2025-01-01'),
      responsable: 'Marie Kouadio',
      progression: 85,
      blocages: [],
      validations: {
        comptable: true,
        fiscal: true,
        audit: false,
        direction: false
      },
      etapesObligatoires: [
        { id: '1', nom: 'Saisie des écritures', statut: 'complete', obligatoire: true, dateComplete: new Date('2025-02-05') },
        { id: '2', nom: 'Rapprochement bancaire', statut: 'complete', obligatoire: true, dateComplete: new Date('2025-02-08') },
        { id: '3', nom: 'Validation stocks', statut: 'complete', obligatoire: true, dateComplete: new Date('2025-02-10') },
        { id: '4', nom: 'Contrôles cohérence', statut: 'en_cours', obligatoire: true }
      ]
    },
    {
      id: '3',
      periode: '2024-12',
      type: 'mensuelle',
      dateDebut: new Date('2024-12-01'),
      dateFin: new Date('2024-12-31'),
      statut: 'fermee',
      dateOuverture: new Date('2024-12-01'),
      dateCloture: new Date('2025-01-15'),
      responsable: 'Jean Konan',
      progression: 100,
      blocages: [],
      validations: {
        comptable: true,
        fiscal: true,
        audit: true,
        direction: true
      },
      etapesObligatoires: [
        { id: '1', nom: 'Saisie des écritures', statut: 'complete', obligatoire: true, dateComplete: new Date('2025-01-05') },
        { id: '2', nom: 'Rapprochement bancaire', statut: 'complete', obligatoire: true, dateComplete: new Date('2025-01-08') },
        { id: '3', nom: 'Validation stocks', statut: 'complete', obligatoire: true, dateComplete: new Date('2025-01-10') },
        { id: '4', nom: 'Contrôles cohérence', statut: 'complete', obligatoire: true, dateComplete: new Date('2025-01-12') }
      ]
    },
    {
      id: '4',
      periode: '2024-11',
      type: 'mensuelle',
      dateDebut: new Date('2024-11-01'),
      dateFin: new Date('2024-11-30'),
      statut: 'verrouillee',
      dateOuverture: new Date('2024-11-01'),
      dateCloture: new Date('2024-12-15'),
      dateVerrouillage: new Date('2025-01-01'),
      responsable: 'Marie Kouadio',
      progression: 100,
      blocages: [],
      validations: {
        comptable: true,
        fiscal: true,
        audit: true,
        direction: true
      },
      etapesObligatoires: [
        { id: '1', nom: 'Saisie des écritures', statut: 'complete', obligatoire: true, dateComplete: new Date('2024-12-05') },
        { id: '2', nom: 'Rapprochement bancaire', statut: 'complete', obligatoire: true, dateComplete: new Date('2024-12-08') },
        { id: '3', nom: 'Validation stocks', statut: 'complete', obligatoire: true, dateComplete: new Date('2024-12-10') },
        { id: '4', nom: 'Contrôles cohérence', statut: 'complete', obligatoire: true, dateComplete: new Date('2024-12-12') }
      ]
    }
  ];

  // Règles de clôture
  const regles: RegleCloture[] = [
    {
      id: '1',
      nom: 'Ordre chronologique',
      description: 'Les périodes doivent être clôturées dans l\'ordre chronologique',
      type: 'blocage',
      active: true,
      condition: 'periode_precedente_fermee'
    },
    {
      id: '2',
      nom: 'Délai minimum',
      description: 'Une période ne peut être clôturée qu\'après sa date de fin',
      type: 'blocage',
      active: true,
      condition: 'date > date_fin_periode'
    },
    {
      id: '3',
      nom: 'Délai légal',
      description: 'Clôture mensuelle avant le 10 du mois suivant (OHADA)',
      type: 'avertissement',
      active: true,
      condition: 'date <= date_fin + 10j'
    },
    {
      id: '4',
      nom: 'Documents obligatoires',
      description: 'Tous les documents obligatoires doivent être présents',
      type: 'blocage',
      active: true,
      condition: 'documents_complets'
    },
    {
      id: '5',
      nom: 'Validation hiérarchique',
      description: 'Validation par le responsable comptable requise',
      type: 'blocage',
      active: true,
      condition: 'validation_responsable'
    },
    {
      id: '6',
      nom: 'Écritures non lettrées',
      description: 'Présence d\'écritures non lettrées',
      type: 'avertissement',
      active: true,
      condition: 'ecritures_lettrees'
    },
    {
      id: '7',
      nom: 'Verrouillage définitif',
      description: 'Après 3 mois, la période est verrouillée définitivement',
      type: 'information',
      active: true,
      condition: 'date > date_cloture + 3m'
    }
  ];

  // Vérifier si une période peut être clôturée
  const canClosePeriod = (periode: PeriodeComptable): { canClose: boolean; reasons: string[] } => {
    const reasons: string[] = [];

    // Vérifier que c'est pas une période future
    if (periode.dateFin > dateActuelle) {
      reasons.push('La période n\'est pas encore terminée');
    }

    // Vérifier l'ordre chronologique
    const periodesAnterieures = periodes.filter(p =>
      p.dateFin < periode.dateFin &&
      p.statut !== 'fermee' &&
      p.statut !== 'verrouillee' &&
      p.id !== periode.id
    );

    if (periodesAnterieures.length > 0) {
      reasons.push(`${periodesAnterieures.length} période(s) antérieure(s) non clôturée(s)`);
    }

    // Vérifier les étapes obligatoires
    const etapesIncompletes = periode.etapesObligatoires.filter(
      e => e.obligatoire && e.statut !== 'complete'
    );

    if (etapesIncompletes.length > 0) {
      reasons.push(`${etapesIncompletes.length} étape(s) obligatoire(s) incomplète(s)`);
    }

    // Vérifier les validations
    const validationsManquantes = Object.entries(periode.validations)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (validationsManquantes.length > 0) {
      reasons.push(`Validation(s) manquante(s): ${validationsManquantes.join(', ')}`);
    }

    return {
      canClose: reasons.length === 0,
      reasons
    };
  };

  // Vérifier si une période peut être rouverte
  const canReopenPeriod = (periode: PeriodeComptable): boolean => {
    // Seules les périodes fermées (non verrouillées) peuvent être rouvertes
    if (periode.statut !== 'fermee') return false;

    // Vérifier qu'aucune période ultérieure n'est fermée
    const periodesUlterieures = periodes.filter(p =>
      p.dateFin > periode.dateFin &&
      (p.statut === 'fermee' || p.statut === 'verrouillee')
    );

    return periodesUlterieures.length === 0;
  };

  // Calculer les statistiques
  const stats = {
    totalPeriodes: periodes.length,
    ouvertes: periodes.filter(p => p.statut === 'ouverte').length,
    enCloture: periodes.filter(p => p.statut === 'en_cloture').length,
    fermees: periodes.filter(p => p.statut === 'fermee').length,
    verrouillees: periodes.filter(p => p.statut === 'verrouillee').length,
    retards: periodes.filter(p => {
      const delaiLegal = new Date(p.dateFin);
      delaiLegal.setDate(delaiLegal.getDate() + 10);
      return p.statut === 'ouverte' && dateActuelle > delaiLegal;
    }).length
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'ouverte': return <PlayCircle className="w-4 h-4 text-green-500" />;
      case 'en_cloture': return <PauseCircle className="w-4 h-4 text-yellow-500" />;
      case 'fermee': return <StopCircle className="w-4 h-4 text-blue-500" />;
      case 'verrouillee': return <Lock className="w-4 h-4 text-red-500" />;
      case 'archivee': return <Archive className="w-4 h-4 text-gray-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'ouverte': return 'bg-green-100 text-green-700 border-green-200';
      case 'en_cloture': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'fermee': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'verrouillee': return 'bg-red-100 text-red-700 border-red-200';
      case 'archivee': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const selectedPeriodeData = periodes.find(p => p.periode === selectedPeriode);
  const clotureCheck = selectedPeriodeData ? canClosePeriod(selectedPeriodeData) : { canClose: false, reasons: [] };

  return (
    <div className="p-6 space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#191919] flex items-center space-x-2">
              <Shield className="w-6 h-6 text-[#6A8A82]" />
              <span>Contrôle des Périodes de Clôture</span>
            </h2>
            <p className="text-sm text-[#767676] mt-1">
              Date système: {dateActuelle.toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 border border-[#E8E8E8] rounded-lg hover:bg-gray-50 flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>Historique</span>
            </button>
            <button className="px-4 py-2 border border-[#E8E8E8] rounded-lg hover:bg-gray-50 flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Paramètres</span>
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-6 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total</span>
              <Calendar className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalPeriodes}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-700">Ouvertes</span>
              <PlayCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-800">{stats.ouvertes}</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-yellow-700">En clôture</span>
              <PauseCircle className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-800">{stats.enCloture}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700">Fermées</span>
              <StopCircle className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-800">{stats.fermees}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-red-700">Verrouillées</span>
              <Lock className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-800">{stats.verrouillees}</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-orange-700">Retards</span>
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-800">{stats.retards}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Liste des périodes */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Périodes Comptables</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {periodes.map(periode => {
                  const isRetard = periode.statut === 'ouverte' &&
                    dateActuelle > new Date(periode.dateFin.getTime() + 10 * 24 * 60 * 60 * 1000);

                  return (
                    <button
                      key={periode.id}
                      onClick={() => setSelectedPeriode(periode.periode)}
                      className={`w-full text-left p-3 hover:bg-gray-50 border-l-4 transition-colors ${
                        selectedPeriode === periode.periode
                          ? 'bg-[#6A8A82]/10 border-[#6A8A82]'
                          : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatutIcon(periode.statut)}
                          <span className="font-medium text-sm">{periode.periode}</span>
                        </div>
                        {isRetard && (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getStatutColor(periode.statut)}`}
                        >
                          {periode.statut.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-[#767676]">
                          {periode.progression}%
                        </span>
                      </div>
                      {periode.progression > 0 && periode.progression < 100 && (
                        <Progress value={periode.progression} className="h-1 mt-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Détails de la période sélectionnée */}
        <div className="col-span-2 space-y-6">
          {selectedPeriodeData && (
            <>
              {/* Informations générales */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Période {selectedPeriodeData.periode}</span>
                    <Badge variant="outline" className={getStatutColor(selectedPeriodeData.statut)}>
                      {selectedPeriodeData.statut.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-[#767676]">Période</p>
                      <p className="font-medium">
                        {selectedPeriodeData.dateDebut.toLocaleDateString('fr-FR')} -
                        {selectedPeriodeData.dateFin.toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#767676]">Responsable</p>
                      <p className="font-medium">{selectedPeriodeData.responsable}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#767676]">Date d'ouverture</p>
                      <p className="font-medium">
                        {selectedPeriodeData.dateOuverture.toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#767676]">Date de clôture</p>
                      <p className="font-medium">
                        {selectedPeriodeData.dateCloture
                          ? selectedPeriodeData.dateCloture.toLocaleDateString('fr-FR')
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Validations */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Validations requises</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedPeriodeData.validations).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          {value ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-300" />
                          )}
                          <span className="text-sm capitalize">{key}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Étapes obligatoires */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium mb-3">Étapes obligatoires</h4>
                    <div className="space-y-2">
                      {selectedPeriodeData.etapesObligatoires.map(etape => (
                        <div key={etape.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {etape.statut === 'complete' ? (
                              <CheckSquare className="w-4 h-4 text-green-500" />
                            ) : etape.statut === 'en_cours' ? (
                              <Clock className="w-4 h-4 text-yellow-500" />
                            ) : etape.statut === 'bloque' ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-300" />
                            )}
                            <span className="text-sm">{etape.nom}</span>
                          </div>
                          {etape.dateComplete && (
                            <span className="text-xs text-[#767676]">
                              {etape.dateComplete.toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contrôles et blocages */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-[#6A8A82]" />
                    <span>Contrôles de Clôture</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {clotureCheck.canClose ? (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Cette période peut être clôturée. Toutes les conditions sont remplies.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      <Alert className="border-red-200 bg-red-50">
                        <Ban className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          Cette période ne peut pas être clôturée pour les raisons suivantes :
                        </AlertDescription>
                      </Alert>
                      <div className="space-y-2">
                        {clotureCheck.reasons.map((reason, index) => (
                          <div key={index} className="flex items-start space-x-2 p-2 bg-gray-50 rounded">
                            <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                            <span className="text-sm">{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-3 mt-6">
                    {selectedPeriodeData.statut === 'ouverte' && (
                      <>
                        <button
                          onClick={() => setShowClotureModal(true)}
                          disabled={!clotureCheck.canClose}
                          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                            clotureCheck.canClose
                              ? 'bg-[#6A8A82] text-white hover:bg-[#5a7a72]'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <Lock className="w-4 h-4" />
                          <span>Lancer la clôture</span>
                        </button>
                        {!clotureCheck.canClose && (
                          <button
                            onClick={() => setShowForceClotureModal(true)}
                            className="px-4 py-2 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 flex items-center space-x-2"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            <span>Forcer la clôture</span>
                          </button>
                        )}
                      </>
                    )}
                    {selectedPeriodeData.statut === 'fermee' && canReopenPeriod(selectedPeriodeData) && (
                      <button className="px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center space-x-2">
                        <Unlock className="w-4 h-4" />
                        <span>Rouvrir la période</span>
                      </button>
                    )}
                    {selectedPeriodeData.statut === 'verrouillee' && (
                      <div className="flex items-center space-x-2 text-red-600">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm">Période verrouillée définitivement</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Règles de clôture */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileWarning className="w-5 h-5 text-[#767676]" />
                <span>Règles de Clôture Actives</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {regles.filter(r => r.active).map(regle => (
                  <div
                    key={regle.id}
                    className={`p-3 rounded-lg border ${
                      regle.type === 'blocage'
                        ? 'border-red-200 bg-red-50'
                        : regle.type === 'avertissement'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {regle.type === 'blocage' ? (
                        <Ban className="w-4 h-4 text-red-500 mt-0.5" />
                      ) : regle.type === 'avertissement' ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{regle.nom}</p>
                        <p className="text-xs text-[#767676] mt-1">{regle.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ControlePeriodes;