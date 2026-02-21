import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
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
import { Progress } from '../../../components/ui/Progress';
import { db } from '../../../lib/db';
import type { DBFiscalYear } from '../../../lib/db';
import { canClose } from '../../../services/closureService';

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
  const { t } = useLanguage();
  const [selectedPeriode, setSelectedPeriode] = useState<string>('2025-01');
  const [showClotureModal, setShowClotureModal] = useState(false);
  const [showForceClotureModal, setShowForceClotureModal] = useState(false);
  const [fiscalYears, setFiscalYears] = useState<DBFiscalYear[]>([]);

  const dateActuelle = new Date();

  // Load fiscal years from Dexie
  useEffect(() => {
    db.fiscalYears.toArray().then(fys => {
      setFiscalYears(fys.sort((a, b) => b.startDate.localeCompare(a.startDate)));
    });
  }, []);

  // Map fiscal years to PeriodeComptable interface
  const periodes: PeriodeComptable[] = fiscalYears.map(fy => {
    const isClosed = fy.isClosed;
    const isActive = fy.isActive;
    const statut: PeriodeComptable['statut'] = isClosed
      ? 'fermee'
      : isActive ? 'ouverte' : 'en_cloture';

    return {
      id: fy.id,
      periode: fy.code || fy.name,
      type: 'annuelle',
      dateDebut: new Date(fy.startDate),
      dateFin: new Date(fy.endDate),
      statut,
      dateOuverture: new Date(fy.startDate),
      dateCloture: isClosed ? new Date(fy.endDate) : undefined,
      responsable: 'Comptable',
      progression: isClosed ? 100 : isActive ? 50 : 0,
      blocages: [],
      validations: {
        comptable: isClosed,
        fiscal: isClosed,
        audit: isClosed,
        direction: isClosed,
      },
      etapesObligatoires: [
        { id: '1', nom: 'Saisie des écritures', statut: isClosed ? 'complete' : isActive ? 'en_cours' : 'en_attente', obligatoire: true },
        { id: '2', nom: 'Rapprochement bancaire', statut: isClosed ? 'complete' : 'en_attente', obligatoire: true },
        { id: '3', nom: 'Contrôles cohérence', statut: isClosed ? 'complete' : 'en_attente', obligatoire: true },
        { id: '4', nom: 'Validation finale', statut: isClosed ? 'complete' : 'en_attente', obligatoire: true },
      ],
    };
  });

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
      case 'ouverte': return <PlayCircle className="w-4 h-4 text-[var(--color-success)]" />;
      case 'en_cloture': return <PauseCircle className="w-4 h-4 text-yellow-500" />;
      case 'fermee': return <StopCircle className="w-4 h-4 text-[var(--color-primary)]" />;
      case 'verrouillee': return <Lock className="w-4 h-4 text-[var(--color-error)]" />;
      case 'archivee': return <Archive className="w-4 h-4 text-[var(--color-text-secondary)]" />;
      default: return <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />;
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'ouverte': return 'bg-[var(--color-success-lighter)] text-[var(--color-success-dark)] border-[var(--color-success-light)]';
      case 'en_cloture': return 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)] border-yellow-200';
      case 'fermee': return 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)] border-[var(--color-primary-light)]';
      case 'verrouillee': return 'bg-[var(--color-error-lighter)] text-[var(--color-error-dark)] border-[var(--color-error-light)]';
      case 'archivee': return 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)] border-[var(--color-border)]';
      default: return 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)] border-[var(--color-border)]';
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
            <h2 className="text-lg font-bold text-[#191919] flex items-center space-x-2">
              <Shield className="w-6 h-6 text-[#6A8A82]" />
              <span>Contrôle des Périodes de Clôture</span>
            </h2>
            <p className="text-sm text-[#767676] mt-1">
              Date système: {dateActuelle.toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 border border-[#E8E8E8] rounded-lg hover:bg-[var(--color-background-secondary)] flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>Historique</span>
            </button>
            <button className="px-4 py-2 border border-[#E8E8E8] rounded-lg hover:bg-[var(--color-background-secondary)] flex items-center space-x-2" aria-label="Paramètres">
              <Settings className="w-4 h-4" />
              <span>{t('navigation.settings')}</span>
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-6 gap-4">
          <div className="p-4 bg-[var(--color-background-secondary)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-primary)]">Total</span>
              <Calendar className="w-4 h-4 text-[var(--color-text-secondary)]" />
            </div>
            <p className="text-lg font-bold">{stats.totalPeriodes}</p>
          </div>
          <div className="p-4 bg-[var(--color-success-lightest)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-success-dark)]">Ouvertes</span>
              <PlayCircle className="w-4 h-4 text-[var(--color-success)]" />
            </div>
            <p className="text-lg font-bold text-[var(--color-success-darker)]">{stats.ouvertes}</p>
          </div>
          <div className="p-4 bg-[var(--color-warning-lightest)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-warning-dark)]">En clôture</span>
              <PauseCircle className="w-4 h-4 text-[var(--color-warning)]" />
            </div>
            <p className="text-lg font-bold text-yellow-800">{stats.enCloture}</p>
          </div>
          <div className="p-4 bg-[var(--color-primary-lightest)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-primary-dark)]">Fermées</span>
              <StopCircle className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <p className="text-lg font-bold text-[var(--color-primary-darker)]">{stats.fermees}</p>
          </div>
          <div className="p-4 bg-[var(--color-error-lightest)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-error-dark)]">Verrouillées</span>
              <Lock className="w-4 h-4 text-[var(--color-error)]" />
            </div>
            <p className="text-lg font-bold text-red-800">{stats.verrouillees}</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-warning-dark)]">Retards</span>
              <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
            </div>
            <p className="text-lg font-bold text-orange-800">{stats.retards}</p>
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
                      className={`w-full text-left p-3 hover:bg-[var(--color-background-secondary)] border-l-4 transition-colors ${
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
                            <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
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
                              <CheckSquare className="w-4 h-4 text-[var(--color-success)]" />
                            ) : etape.statut === 'en_cours' ? (
                              <Clock className="w-4 h-4 text-yellow-500" />
                            ) : etape.statut === 'bloque' ? (
                              <XCircle className="w-4 h-4 text-[var(--color-error)]" />
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
                    <Alert className="border-[var(--color-success-light)] bg-[var(--color-success-lightest)]">
                      <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                      <AlertDescription className="text-[var(--color-success-darker)]">
                        Cette période peut être clôturée. Toutes les conditions sont remplies.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      <Alert className="border-[var(--color-error-light)] bg-[var(--color-error-lightest)]">
                        <Ban className="h-4 w-4 text-[var(--color-error)]" />
                        <AlertDescription className="text-red-800">
                          Cette période ne peut pas être clôturée pour les raisons suivantes :
                        </AlertDescription>
                      </Alert>
                      <div className="space-y-2">
                        {clotureCheck.reasons.map((reason, index) => (
                          <div key={index} className="flex items-start space-x-2 p-2 bg-[var(--color-background-secondary)] rounded">
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
                              : 'bg-[var(--color-border)] text-[var(--color-text-secondary)] cursor-not-allowed'
                          }`}
                        >
                          <Lock className="w-4 h-4" />
                          <span>Lancer la clôture</span>
                        </button>
                        {!clotureCheck.canClose && (
                          <button
                            onClick={() => setShowForceClotureModal(true)}
                            className="px-4 py-2 border border-orange-300 text-[var(--color-warning)] rounded-lg hover:bg-orange-50 flex items-center space-x-2"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            <span>Forcer la clôture</span>
                          </button>
                        )}
                      </>
                    )}
                    {selectedPeriodeData.statut === 'fermee' && canReopenPeriod(selectedPeriodeData) && (
                      <button className="px-4 py-2 border border-blue-300 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-lightest)] flex items-center space-x-2">
                        <Unlock className="w-4 h-4" />
                        <span>Rouvrir la période</span>
                      </button>
                    )}
                    {selectedPeriodeData.statut === 'verrouillee' && (
                      <div className="flex items-center space-x-2 text-[var(--color-error)]">
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
                        ? 'border-[var(--color-error-light)] bg-[var(--color-error-lightest)]'
                        : regle.type === 'avertissement'
                        ? 'border-yellow-200 bg-[var(--color-warning-lightest)]'
                        : 'border-[var(--color-primary-light)] bg-[var(--color-primary-lightest)]'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {regle.type === 'blocage' ? (
                        <Ban className="w-4 h-4 text-[var(--color-error)] mt-0.5" />
                      ) : regle.type === 'avertissement' ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-[var(--color-primary)] mt-0.5" />
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

      {/* Cloture Modal */}
      {showClotureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-primary-lighter)] rounded-lg flex items-center justify-center">
                    <Lock className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Clôturer la période</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Procédure de clôture comptable</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClotureModal(false)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                <div className="bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded-lg p-4">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-primary-darker)]">Clôture de période</p>
                      <p className="text-sm text-[var(--color-primary-dark)] mt-1">
                        La clôture empêchera toute modification des écritures de cette période
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Période à clôturer <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="2025-01">Janvier 2025</option>
                    <option value="2024-12">Décembre 2024</option>
                    <option value="2024-11">Novembre 2024</option>
                  </select>
                </div>

                <div className="border border-[var(--color-border)] rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm text-[var(--color-text-primary)] mb-3">Validations obligatoires</h4>

                  <div className="flex items-center justify-between p-3 bg-[var(--color-success-lightest)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">Validation comptable</span>
                    </div>
                    <Badge variant="success">{t('accounting.validated')}</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[var(--color-success-lightest)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">Validation fiscale</span>
                    </div>
                    <Badge variant="success">{t('accounting.validated')}</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[var(--color-warning-lightest)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[var(--color-warning)]" />
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">Validation audit</span>
                    </div>
                    <Badge variant="warning">{t('status.pending')}</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[var(--color-success-lightest)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">Validation direction</span>
                    </div>
                    <Badge variant="success">{t('accounting.validated')}</Badge>
                  </div>
                </div>

                <div className="border border-[var(--color-border)] rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-[var(--color-text-primary)] mb-3">Progression des étapes</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[var(--color-text-primary)]">Étapes complétées</span>
                        <span className="font-medium">8/10 (80%)</span>
                      </div>
                      <Progress value={80} className="h-2" />
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      <p>✓ Saisie des écritures</p>
                      <p>✓ Lettrage des comptes</p>
                      <p>✓ Rapprochements bancaires</p>
                      <p className="text-[var(--color-warning)]">⏳ Contrôles de cohérence (90%)</p>
                      <p className="text-[var(--color-warning)]">⏳ Validation des provisions (50%)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Commentaire de clôture
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Notes ou remarques sur cette clôture..."
                  />
                </div>

                <div className="flex items-start gap-2 p-3 bg-[var(--color-background-secondary)] rounded-lg">
                  <input
                    type="checkbox"
                    id="confirm-cloture"
                    className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-border-dark)] rounded focus:ring-blue-500 mt-0.5"
                  />
                  <label htmlFor="confirm-cloture" className="text-sm text-[var(--color-text-primary)] cursor-pointer">
                    Je confirme avoir vérifié tous les contrôles et souhaite procéder à la clôture de cette période
                  </label>
                </div>

                <div className="bg-[var(--color-warning-lightest)] border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Attention</p>
                      <p className="text-sm text-[var(--color-warning-dark)] mt-1">
                        La clôture peut être annulée uniquement par un administrateur
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] px-6 py-4 rounded-b-lg border-t border-[var(--color-border)] flex justify-end gap-3">
              <button
                onClick={() => setShowClotureModal(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-hover)] rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] rounded-lg transition-colors flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Clôturer la période
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force Cloture Modal */}
      {showForceClotureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-error-lighter)] rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-[var(--color-error)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Clôture forcée</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Clôture sans validation complète</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForceClotureModal(false)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                <div className="bg-[var(--color-error-lightest)] border border-[var(--color-error-light)] rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Action administrative sensible</p>
                      <p className="text-sm text-[var(--color-error-dark)] mt-1">
                        La clôture forcée permet de clôturer malgré des validations incomplètes. Cette action est tracée et auditable.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Période à clôturer <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent">
                    <option value="2025-01">Janvier 2025</option>
                    <option value="2024-12">Décembre 2024</option>
                  </select>
                </div>

                <div className="border border-[var(--color-error-light)] rounded-lg p-4 bg-[var(--color-error-lightest)]">
                  <h4 className="font-semibold text-sm text-red-900 mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Blocages identifiés
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-error)]">•</span>
                      <span className="text-red-800">Validation audit non complétée</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-error)]">•</span>
                      <span className="text-red-800">2 étapes obligatoires en attente</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-error)]">•</span>
                      <span className="text-red-800">Provisions non validées (50% complété)</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Mot de passe administrateur <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    type="password"
                    className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Entrez votre mot de passe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Justification <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <textarea
                    rows={4}
                    className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Expliquez pourquoi cette clôture forcée est nécessaire. Cette justification sera enregistrée dans l'historique d'audit."
                  />
                </div>

                <div className="flex items-start gap-2 p-3 bg-[var(--color-background-secondary)] rounded-lg border border-[var(--color-border-dark)]">
                  <input
                    type="checkbox"
                    id="confirm-force"
                    className="w-4 h-4 text-[var(--color-error)] border-[var(--color-border-dark)] rounded focus:ring-red-500 mt-0.5"
                  />
                  <label htmlFor="confirm-force" className="text-sm text-[var(--color-text-primary)] cursor-pointer">
                    Je comprends les risques et assume la responsabilité de cette clôture forcée
                  </label>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-900">Traçabilité</p>
                      <p className="text-sm text-[var(--color-warning-dark)] mt-1">
                        Cette action sera enregistrée avec: horodatage, utilisateur, adresse IP et justification
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] px-6 py-4 rounded-b-lg border-t border-[var(--color-border)] flex justify-end gap-3">
              <button
                onClick={() => setShowForceClotureModal(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-hover)] rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-error)] hover:bg-[var(--color-error-dark)] rounded-lg transition-colors flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Forcer la clôture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlePeriodes;