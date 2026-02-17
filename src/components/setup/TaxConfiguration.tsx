import React, { useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  CurrencyDollarIcon,
  CalculatorIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ChartBarIcon,
  AdjustmentsHorizontalIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  ReceiptPercentIcon
} from '@heroicons/react/24/outline';

// Schéma de validation
const taxSchema = z.object({
  taxes: z.array(z.object({
    id: z.string(),
    code: z.string().min(1, 'Code obligatoire'),
    libelle: z.string().min(1, 'Libellé obligatoire'),
    type: z.enum(['TVA', 'IS', 'IRPP', 'CSS', 'CAC', 'TAXE_SPECIALE', 'DROIT_ACCISE', 'PRECOMPTE', 'AUTRE']),
    taux: z.number().min(0).max(100),
    compteCollecte: z.string().min(6, 'Compte obligatoire'),
    compteDeductible: z.string().optional(),
    base: z.enum(['HT', 'TTC', 'BRUT', 'NET']),
    zone: z.enum(['CEMAC', 'UEMOA', 'NATIONAL', 'LOCAL', 'TOUS']),
    actif: z.boolean(),
    dateApplication: z.string(),
    exonerable: z.boolean(),
    recuperable: z.boolean(),
    declarationType: z.enum(['MENSUELLE', 'TRIMESTRIELLE', 'ANNUELLE']),
    seuil: z.number().optional()
  })),

  regimesTVA: z.object({
    regime: z.enum(['REEL_NORMAL', 'REEL_SIMPLIFIE', 'LIBERATOIRE', 'EXONERE']),
    seuil: z.number(),
    periodicite: z.enum(['MENSUELLE', 'TRIMESTRIELLE', 'ANNUELLE']),
    delaiDeclaration: z.number()
  }),

  parametresGlobaux: z.object({
    methodeCalcul: z.enum(['DEDANS', 'DEHORS']),
    arrondissement: z.enum(['UNITE', 'DIZAINE', 'CENTAINE', 'MILLIER']),
    prorataTVA: z.boolean(),
    coefficientProrata: z.number().min(0).max(100).optional(),
    autoliquidation: z.boolean(),
    tvaIntracommunautaire: z.boolean()
  })
});

type TaxFormData = z.infer<typeof taxSchema>;

// Configurations de taxes par zone
const zoneConfigurations = {
  CEMAC: {
    name: 'Zone CEMAC',
    countries: ['Cameroun', 'Gabon', 'Tchad', 'RCA', 'Congo', 'Guinée Équatoriale'],
    taxes: [
      { code: 'TVA', libelle: 'Taxe sur la Valeur Ajoutée', taux: 19.25, description: 'TVA standard CEMAC' },
      { code: 'CSS', libelle: 'Centimes Spéciaux Supplémentaires', taux: 1.25, description: 'CSS obligatoire' },
      { code: 'DA', libelle: 'Droits d\'Accises', taux: 25, description: 'Sur produits spécifiques' },
      { code: 'IS', libelle: 'Impôt sur les Sociétés', taux: 30, description: 'IS standard' },
      { code: 'IRPP', libelle: 'Impôt sur le Revenu', taux: 35, description: 'Taux maximum' },
      { code: 'CAC', libelle: 'Centimes Additionnels Communaux', taux: 10, description: 'Sur IS' }
    ]
  },
  UEMOA: {
    name: 'Zone UEMOA',
    countries: ['Côte d\'Ivoire', 'Sénégal', 'Mali', 'Burkina Faso', 'Niger', 'Bénin', 'Togo', 'Guinée-Bissau'],
    taxes: [
      { code: 'TVA', libelle: 'Taxe sur la Valeur Ajoutée', taux: 18, description: 'TVA standard UEMOA' },
      { code: 'BIC', libelle: 'Bénéfices Industriels et Commerciaux', taux: 25, description: 'Impôt sur les bénéfices' },
      { code: 'IMF', libelle: 'Impôt Minimum Forfaitaire', taux: 0.5, description: 'Sur le CA' },
      { code: 'IRVM', libelle: 'Impôt sur Revenus Valeurs Mobilières', taux: 10, description: 'Sur dividendes' },
      { code: 'TOB', libelle: 'Taxe sur Opérations Bancaires', taux: 17, description: 'Sur services bancaires' }
    ]
  }
};

const TaxConfiguration: React.FC = () => {
  const [activeTab, setActiveTab] = useState('taxes');
  const [selectedZone, setSelectedZone] = useState('CEMAC');
  const [showPreview, setShowPreview] = useState(false);

  const { control, handleSubmit, watch, formState: { errors }, setValue } = useForm<TaxFormData>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      taxes: [],
      regimesTVA: {
        regime: 'REEL_NORMAL',
        seuil: 50000000,
        periodicite: 'MENSUELLE',
        delaiDeclaration: 15
      },
      parametresGlobaux: {
        methodeCalcul: 'DEDANS',
        arrondissement: 'UNITE',
        prorataTVA: false,
        autoliquidation: false,
        tvaIntracommunautaire: false
      }
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'taxes'
  });

  const watchedValues = watch();

  const tabs = [
    { id: 'taxes', label: 'Taxes et Impôts', icon: ReceiptPercentIcon },
    { id: 'tva', label: 'Configuration TVA', icon: CalculatorIcon },
    { id: 'regimes', label: 'Régimes Fiscaux', icon: BuildingOfficeIcon },
    { id: 'comptes', label: 'Comptes de Taxes', icon: DocumentTextIcon },
    { id: 'declarations', label: 'Déclarations', icon: CalendarDaysIcon }
  ];

  const addTax = (taxTemplate?: any) => {
    const newTax = {
      id: Date.now().toString(),
      code: taxTemplate?.code || '',
      libelle: taxTemplate?.libelle || '',
      type: 'TVA' as const,
      taux: taxTemplate?.taux || 0,
      compteCollecte: '',
      compteDeductible: '',
      base: 'HT' as const,
      zone: selectedZone as any,
      actif: true,
      dateApplication: new Date().toISOString().split('T')[0],
      exonerable: false,
      recuperable: true,
      declarationType: 'MENSUELLE' as const,
      seuil: 0
    };
    append(newTax);
  };

  const importZoneTaxes = () => {
    const zoneConfig = zoneConfigurations[selectedZone as keyof typeof zoneConfigurations];
    if (zoneConfig) {
      zoneConfig.taxes.forEach(tax => addTax(tax));
    }
  };

  const calculateTaxAmount = (montantBase: number, taux: number, methode: string) => {
    if (methode === 'DEDANS') {
      return (montantBase * taux) / (100 + taux);
    } else {
      return (montantBase * taux) / 100;
    }
  };

  const onSubmit = (data: TaxFormData) => {
    alert('Configuration enregistrée avec succès !');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* En-tête */}
      <div className="bg-[#6A8A82] rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 mr-3 text-white" />
              Configuration des Taxes et TVA
            </h1>
            <p className="text-[#F0F3F2] mt-2">
              Paramétrage complet des taxes selon SYSCOHADA et zones économiques
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
            >
              <option value="CEMAC">Zone CEMAC</option>
              <option value="UEMOA">Zone UEMOA</option>
              <option value="NATIONAL">National</option>
              <option value="TOUS">Toutes zones</option>
            </select>
            <button
              onClick={importZoneTaxes}
              className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#6A8A82] transition-colors flex items-center"
            >
              <GlobeAltIcon className="h-5 w-5 mr-2" />
              Importer config zone
            </button>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-[#F0F3F2] rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {/* Tab: Taxes et Impôts */}
          {activeTab === 'taxes' && (
            <div className="space-y-6">
              {/* Zone d'information */}
              {selectedZone && zoneConfigurations[selectedZone as keyof typeof zoneConfigurations] && (
                <div className="bg-[#ECECEC] border border-[#6A8A82] rounded-lg p-4">
                  <div className="flex items-start">
                    <InformationCircleIcon className="h-5 w-5 text-[#6A8A82] mr-2 flex-shrink-0" />
                    <div className="text-sm text-[#191919]">
                      <p className="font-medium">{zoneConfigurations[selectedZone as keyof typeof zoneConfigurations].name}</p>
                      <p>Pays: {zoneConfigurations[selectedZone as keyof typeof zoneConfigurations].countries.join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Liste des taxes */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Taxes configurées</h2>
                  <button
                    type="button"
                    onClick={() => addTax()}
                    className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#6A8A82] transition-colors flex items-center"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Ajouter une taxe
                  </button>
                </div>

                {fields.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <ReceiptPercentIcon className="h-12 w-12 mx-auto text-gray-700 mb-3" />
                    <p className="text-gray-600">Aucune taxe configurée</p>
                    <button
                      type="button"
                      onClick={importZoneTaxes}
                      className="mt-3 text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Importer les taxes de la zone {selectedZone}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="bg-[#ECECEC] border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Code *
                            </label>
                            <Controller
                              name={`taxes.${index}.code`}
                              control={control}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  type="text"
                                  placeholder="TVA"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                                />
                              )}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Libellé *
                            </label>
                            <Controller
                              name={`taxes.${index}.libelle`}
                              control={control}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  type="text"
                                  placeholder="Taxe sur la Valeur Ajoutée"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                                />
                              )}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Type *
                            </label>
                            <Controller
                              name={`taxes.${index}.type`}
                              control={control}
                              render={({ field }) => (
                                <select
                                  {...field}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                                >
                                  <option value="TVA">TVA</option>
                                  <option value="IS">Impôt sur les Sociétés</option>
                                  <option value="IRPP">IRPP</option>
                                  <option value="CSS">CSS</option>
                                  <option value="CAC">CAC</option>
                                  <option value="TAXE_SPECIALE">Taxe Spéciale</option>
                                  <option value="DROIT_ACCISE">Droit d'Accise</option>
                                  <option value="PRECOMPTE">Précompte</option>
                                  <option value="AUTRE">Autre</option>
                                </select>
                              )}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Taux (%) *
                            </label>
                            <Controller
                              name={`taxes.${index}.taux`}
                              control={control}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  placeholder="19.25"
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                                />
                              )}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Compte collecté *
                            </label>
                            <Controller
                              name={`taxes.${index}.compteCollecte`}
                              control={control}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  type="text"
                                  placeholder="445710"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                                />
                              )}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Compte déductible
                            </label>
                            <Controller
                              name={`taxes.${index}.compteDeductible`}
                              control={control}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  type="text"
                                  placeholder="445660"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                                />
                              )}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Base de calcul
                            </label>
                            <Controller
                              name={`taxes.${index}.base`}
                              control={control}
                              render={({ field }) => (
                                <select
                                  {...field}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                                >
                                  <option value="HT">Hors Taxes</option>
                                  <option value="TTC">Toutes Taxes Comprises</option>
                                  <option value="BRUT">Montant Brut</option>
                                  <option value="NET">Montant Net</option>
                                </select>
                              )}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Zone d'application
                            </label>
                            <Controller
                              name={`taxes.${index}.zone`}
                              control={control}
                              render={({ field }) => (
                                <select
                                  {...field}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                                >
                                  <option value="CEMAC">CEMAC</option>
                                  <option value="UEMOA">UEMOA</option>
                                  <option value="NATIONAL">National</option>
                                  <option value="LOCAL">Local</option>
                                  <option value="TOUS">Toutes zones</option>
                                </select>
                              )}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Date d'application
                            </label>
                            <Controller
                              name={`taxes.${index}.dateApplication`}
                              control={control}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  type="date"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                                />
                              )}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Périodicité déclaration
                            </label>
                            <Controller
                              name={`taxes.${index}.declarationType`}
                              control={control}
                              render={({ field }) => (
                                <select
                                  {...field}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                                >
                                  <option value="MENSUELLE">Mensuelle</option>
                                  <option value="TRIMESTRIELLE">Trimestrielle</option>
                                  <option value="ANNUELLE">Annuelle</option>
                                </select>
                              )}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <div className="flex items-center space-x-4">
                              <Controller
                                name={`taxes.${index}.actif`}
                                control={control}
                                render={({ field }) => (
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      {...field}
                                      value=""
                                      checked={field.value}
                                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Active</span>
                                  </label>
                                )}
                              />

                              <Controller
                                name={`taxes.${index}.exonerable`}
                                control={control}
                                render={({ field }) => (
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      {...field}
                                      value=""
                                      checked={field.value}
                                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Exonérable</span>
                                  </label>
                                )}
                              />

                              <Controller
                                name={`taxes.${index}.recuperable`}
                                control={control}
                                render={({ field }) => (
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      {...field}
                                      value=""
                                      checked={field.value}
                                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Récupérable</span>
                                  </label>
                                )}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Configuration TVA */}
          {activeTab === 'tva' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Paramètres de calcul TVA</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Méthode de calcul *
                  </label>
                  <Controller
                    name="parametresGlobaux.methodeCalcul"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                      >
                        <option value="DEDANS">TVA comprise (prix TTC)</option>
                        <option value="DEHORS">TVA en sus (prix HT)</option>
                      </select>
                    )}
                  />
                  <p className="text-xs text-gray-700 mt-1">
                    {watchedValues.parametresGlobaux?.methodeCalcul === 'DEDANS'
                      ? 'La TVA est incluse dans le prix affiché'
                      : 'La TVA s\'ajoute au prix affiché'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arrondissement *
                  </label>
                  <Controller
                    name="parametresGlobaux.arrondissement"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                      >
                        <option value="UNITE">À l'unité</option>
                        <option value="DIZAINE">À la dizaine</option>
                        <option value="CENTAINE">À la centaine</option>
                        <option value="MILLIER">Au millier</option>
                      </select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Controller
                    name="parametresGlobaux.prorataTVA"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        {...field}
                        value=""
                        checked={field.value}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    )}
                  />
                  <div>
                    <label className="text-sm font-medium text-gray-900">
                      Prorata de TVA
                    </label>
                    <p className="text-xs text-gray-600">
                      Appliquer un coefficient de déduction partielle
                    </p>
                  </div>
                </div>

                {watchedValues.parametresGlobaux?.prorataTVA && (
                  <div className="ml-7">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Coefficient de prorata (%)
                    </label>
                    <Controller
                      name="parametresGlobaux.coefficientProrata"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="85.00"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Controller
                    name="parametresGlobaux.autoliquidation"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        {...field}
                        value=""
                        checked={field.value}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    )}
                  />
                  <div>
                    <label className="text-sm font-medium text-gray-900">
                      Autoliquidation TVA
                    </label>
                    <p className="text-xs text-gray-600">
                      Mécanisme d'inversion du redevable
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Controller
                    name="parametresGlobaux.tvaIntracommunautaire"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        {...field}
                        value=""
                        checked={field.value}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    )}
                  />
                  <div>
                    <label className="text-sm font-medium text-gray-900">
                      TVA Intracommunautaire
                    </label>
                    <p className="text-xs text-gray-600">
                      Gérer les opérations entre pays de la zone
                    </p>
                  </div>
                </div>
              </div>

              {/* Simulateur de calcul */}
              <div className="bg-[#ECECEC] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CalculatorIcon className="h-5 w-5 mr-2" />
                  Simulateur de calcul TVA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant de base
                    </label>
                    <input
                      type="number"
                      defaultValue={100000}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Taux TVA (%)
                    </label>
                    <input
                      type="number"
                      defaultValue={19.25}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Résultat
                    </label>
                    <div className="bg-white border border-gray-300 rounded-md px-3 py-2">
                      <div className="text-sm text-gray-600">HT: 100,000 XAF</div>
                      <div className="text-sm text-gray-600">TVA: 19,250 XAF</div>
                      <div className="text-sm font-medium">TTC: 119,250 XAF</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Régimes Fiscaux */}
          {activeTab === 'regimes' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Configuration des régimes fiscaux</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Régime fiscal *
                  </label>
                  <Controller
                    name="regimesTVA.regime"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                      >
                        <option value="REEL_NORMAL">Régime Réel Normal</option>
                        <option value="REEL_SIMPLIFIE">Régime Réel Simplifié</option>
                        <option value="LIBERATOIRE">Régime Libératoire</option>
                        <option value="EXONERE">Régime Exonéré</option>
                      </select>
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seuil de CA (XAF)
                  </label>
                  <Controller
                    name="regimesTVA.seuil"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="number"
                        min="0"
                        placeholder="50000000"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Périodicité de déclaration
                  </label>
                  <Controller
                    name="regimesTVA.periodicite"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                      >
                        <option value="MENSUELLE">Mensuelle</option>
                        <option value="TRIMESTRIELLE">Trimestrielle</option>
                        <option value="ANNUELLE">Annuelle</option>
                      </select>
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Délai de déclaration (jours)
                  </label>
                  <Controller
                    name="regimesTVA.delaiDeclaration"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="number"
                        min="1"
                        max="30"
                        placeholder="15"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 15)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                      />
                    )}
                  />
                </div>
              </div>

              {/* Tableau récapitulatif des régimes */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Régime
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Seuil CA
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        TVA
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Déclaration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Obligations
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Réel Normal
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {'>'} 100M XAF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        Facturation obligatoire
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        Mensuelle
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        Comptabilité complète
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Réel Simplifié
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        30M - 100M XAF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        Facturation obligatoire
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        Trimestrielle
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        Comptabilité allégée
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Libératoire
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {'<'} 30M XAF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        Impôt forfaitaire
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        Annuelle
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        Livre de recettes
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Comptes de Taxes */}
          {activeTab === 'comptes' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Paramétrage des comptes de taxes</h2>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Configuration des comptes SYSCOHADA</p>
                    <p>Les comptes doivent respecter la nomenclature SYSCOHADA pour les taxes.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Type de taxe
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Compte collecté
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Compte déductible
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Compte à payer
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        TVA collectée
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        445710 - État, TVA collectée
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        445700 - État, TVA à décaisser
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        TVA déductible
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        445660 - État, TVA déductible
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        445670 - État, crédit de TVA
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Impôt sur les sociétés
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        891000 - Impôts sur les bénéfices
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        441000 - État, impôt sur les bénéfices
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        IRPP/Salaires
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        447100 - État, impôts retenus à la source
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        447000 - État, autres impôts
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Déclarations */}
          {activeTab === 'declarations' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Calendrier des déclarations fiscales</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: 'TVA',
                    icon: ReceiptPercentIcon,
                    color: 'blue',
                    declarations: [
                      { type: 'Mensuelle', echeance: 'Avant le 15 du mois suivant', montant: '2,450,000 XAF' },
                      { type: 'Trimestrielle', echeance: 'Avant le 15 du trimestre suivant', montant: '-' }
                    ]
                  },
                  {
                    title: 'Impôt sur les Sociétés',
                    icon: BuildingOfficeIcon,
                    color: 'green',
                    declarations: [
                      { type: 'Acomptes', echeance: '15 mars, 15 juin, 15 septembre', montant: '1,500,000 XAF' },
                      { type: 'Solde', echeance: '15 mars N+1', montant: '500,000 XAF' }
                    ]
                  },
                  {
                    title: 'IRPP/Salaires',
                    icon: UserGroupIcon,
                    color: 'purple',
                    declarations: [
                      { type: 'Mensuelle', echeance: 'Avant le 15 du mois suivant', montant: '350,000 XAF' },
                      { type: 'DADS', echeance: '31 janvier N+1', montant: '-' }
                    ]
                  },
                  {
                    title: 'Taxes diverses',
                    icon: BanknotesIcon,
                    color: 'orange',
                    declarations: [
                      { type: 'CSS', echeance: 'Avec la TVA', montant: '125,000 XAF' },
                      { type: 'CAC', echeance: 'Avec l\'IS', montant: '150,000 XAF' }
                    ]
                  }
                ].map((taxCategory) => (
                  <div key={taxCategory.title} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <taxCategory.icon className={`h-6 w-6 text-${taxCategory.color}-600`} />
                      <h3 className="font-medium text-gray-900">{taxCategory.title}</h3>
                    </div>
                    <div className="space-y-2">
                      {taxCategory.declarations.map((decl, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{decl.type}</div>
                            <div className="text-xs text-gray-700">{decl.echeance}</div>
                          </div>
                          <div className="text-sm font-medium text-gray-900">{decl.montant}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#F0F3F2] border border-[#6A8A82] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[#191919] mb-4">
                  Prochaines échéances
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center">
                      <CalendarDaysIcon className="h-5 w-5 text-indigo-600 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">TVA Novembre 2024</div>
                        <div className="text-xs text-gray-700">Échéance: 15 décembre 2024</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Dans 5 jours
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center">
                      <CalendarDaysIcon className="h-5 w-5 text-green-600 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Acompte IS 4e trimestre</div>
                        <div className="text-xs text-gray-700">Échéance: 15 décembre 2024</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Dans 5 jours
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Boutons de soumission */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Aperçu
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#6A8A82] transition-colors flex items-center"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Enregistrer la configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaxConfiguration;