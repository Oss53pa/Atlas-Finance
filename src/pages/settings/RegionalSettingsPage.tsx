import React, { useState } from 'react';
import {
  Globe,
  MapPin,
  DollarSign,
  Calculator,
  Settings,
  Save,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Info,
  Building,
  Calendar,
  Percent,
  CreditCard,
  FileText,
  AlertCircle,
  ChevronDown,
  Search
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Switch,
  Label,
  Alert,
  AlertDescription
} from '../../components/ui';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface Country {
  code: string;
  name: string;
  currency: string;
  phoneCode: string;
  timezone: string;
  language: string;
  taxSystem: string;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  exchangeRate: number;
  countries: string[];
}

interface TaxRate {
  id: string;
  name: string;
  code: string;
  rate: number;
  type: 'TVA' | 'IRPP' | 'IS' | 'TSR' | 'AUTRES';
  applicable: string;
  deductible: boolean;
  active: boolean;
}

const RegionalSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('countries');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [isAddingTax, setIsAddingTax] = useState(false);

  // Pays d'Afrique avec leurs configurations
  const africanCountries: Country[] = [
    // Zone CEMAC
    { code: 'CM', name: 'Cameroun', currency: 'XAF', phoneCode: '+237', timezone: 'WAT', language: 'Français', taxSystem: 'SYSCOHADA' },
    { code: 'CF', name: 'République Centrafricaine', currency: 'XAF', phoneCode: '+236', timezone: 'WAT', language: 'Français', taxSystem: 'SYSCOHADA' },
    { code: 'TD', name: 'Tchad', currency: 'XAF', phoneCode: '+235', timezone: 'WAT', language: 'Français', taxSystem: 'SYSCOHADA' },
    { code: 'CG', name: 'Congo', currency: 'XAF', phoneCode: '+242', timezone: 'WAT', language: 'Français', taxSystem: 'SYSCOHADA' },
    { code: 'GA', name: 'Gabon', currency: 'XAF', phoneCode: '+241', timezone: 'WAT', language: 'Français', taxSystem: 'SYSCOHADA' },
    { code: 'GQ', name: 'Guinée Équatoriale', currency: 'XAF', phoneCode: '+240', timezone: 'WAT', language: 'Espagnol/Français', taxSystem: 'SYSCOHADA' },

    // Zone UEMOA
    { code: 'BJ', name: 'Bénin', currency: 'XOF', phoneCode: '+229', timezone: 'WAT', language: 'Français', taxSystem: 'SYSCOHADA' },
    { code: 'BF', name: 'Burkina Faso', currency: 'XOF', phoneCode: '+226', timezone: 'GMT', language: 'Français', taxSystem: 'SYSCOHADA' },
    { code: 'CI', name: 'Côte d\'Ivoire', currency: 'XOF', phoneCode: '+225', timezone: 'GMT', language: 'Français', taxSystem: 'SYSCOHADA' },
    { code: 'GW', name: 'Guinée-Bissau', currency: 'XOF', phoneCode: '+245', timezone: 'GMT', language: 'Portugais', taxSystem: 'SYSCOHADA' },
    { code: 'ML', name: 'Mali', currency: 'XOF', phoneCode: '+223', timezone: 'GMT', language: 'Français', taxSystem: 'SYSCOHADA' },
    { code: 'NE', name: 'Niger', currency: 'XOF', phoneCode: '+227', timezone: 'WAT', language: 'Français', taxSystem: 'SYSCOHADA' },
    { code: 'SN', name: 'Sénégal', currency: 'XOF', phoneCode: '+221', timezone: 'GMT', language: 'Français', taxSystem: 'SYSCOHADA' },
    { code: 'TG', name: 'Togo', currency: 'XOF', phoneCode: '+228', timezone: 'GMT', language: 'Français', taxSystem: 'SYSCOHADA' },

    // Autres pays OHADA
    { code: 'KM', name: 'Comores', currency: 'KMF', phoneCode: '+269', timezone: 'EAT', language: 'Français/Arabe', taxSystem: 'SYSCOHADA' },
    { code: 'CD', name: 'RD Congo', currency: 'CDF', phoneCode: '+243', timezone: 'WAT/CAT', language: 'Français', taxSystem: 'SYSCOHADA' },
    { code: 'GN', name: 'Guinée', currency: 'GNF', phoneCode: '+224', timezone: 'GMT', language: 'Français', taxSystem: 'SYSCOHADA' },

    // Afrique de l'Est
    { code: 'KE', name: 'Kenya', currency: 'KES', phoneCode: '+254', timezone: 'EAT', language: 'Anglais/Swahili', taxSystem: 'National' },
    { code: 'TZ', name: 'Tanzanie', currency: 'TZS', phoneCode: '+255', timezone: 'EAT', language: 'Anglais/Swahili', taxSystem: 'National' },
    { code: 'UG', name: 'Ouganda', currency: 'UGX', phoneCode: '+256', timezone: 'EAT', language: 'Anglais', taxSystem: 'National' },
    { code: 'RW', name: 'Rwanda', currency: 'RWF', phoneCode: '+250', timezone: 'CAT', language: 'Anglais/Français', taxSystem: 'National' },
    { code: 'BI', name: 'Burundi', currency: 'BIF', phoneCode: '+257', timezone: 'CAT', language: 'Français/Kirundi', taxSystem: 'National' },
    { code: 'ET', name: 'Éthiopie', currency: 'ETB', phoneCode: '+251', timezone: 'EAT', language: 'Amharique', taxSystem: 'National' },

    // Afrique du Nord
    { code: 'DZ', name: 'Algérie', currency: 'DZD', phoneCode: '+213', timezone: 'CET', language: 'Arabe/Français', taxSystem: 'National' },
    { code: 'EG', name: 'Égypte', currency: 'EGP', phoneCode: '+20', timezone: 'EET', language: 'Arabe', taxSystem: 'National' },
    { code: 'LY', name: 'Libye', currency: 'LYD', phoneCode: '+218', timezone: 'EET', language: 'Arabe', taxSystem: 'National' },
    { code: 'MA', name: 'Maroc', currency: 'MAD', phoneCode: '+212', timezone: 'WET', language: 'Arabe/Français', taxSystem: 'National' },
    { code: 'TN', name: 'Tunisie', currency: 'TND', phoneCode: '+216', timezone: 'CET', language: 'Arabe/Français', taxSystem: 'National' },

    // Afrique Australe
    { code: 'ZA', name: 'Afrique du Sud', currency: 'ZAR', phoneCode: '+27', timezone: 'SAST', language: 'Anglais/Afrikaans', taxSystem: 'National' },
    { code: 'AO', name: 'Angola', currency: 'AOA', phoneCode: '+244', timezone: 'WAT', language: 'Portugais', taxSystem: 'National' },
    { code: 'BW', name: 'Botswana', currency: 'BWP', phoneCode: '+267', timezone: 'CAT', language: 'Anglais', taxSystem: 'National' },
    { code: 'MZ', name: 'Mozambique', currency: 'MZN', phoneCode: '+258', timezone: 'CAT', language: 'Portugais', taxSystem: 'National' },
    { code: 'NA', name: 'Namibie', currency: 'NAD', phoneCode: '+264', timezone: 'CAT', language: 'Anglais', taxSystem: 'National' },
    { code: 'ZM', name: 'Zambie', currency: 'ZMW', phoneCode: '+260', timezone: 'CAT', language: 'Anglais', taxSystem: 'National' },
    { code: 'ZW', name: 'Zimbabwe', currency: 'ZWL', phoneCode: '+263', timezone: 'CAT', language: 'Anglais', taxSystem: 'National' },

    // Afrique de l'Ouest (non-UEMOA)
    { code: 'NG', name: 'Nigeria', currency: 'NGN', phoneCode: '+234', timezone: 'WAT', language: 'Anglais', taxSystem: 'National' },
    { code: 'GH', name: 'Ghana', currency: 'GHS', phoneCode: '+233', timezone: 'GMT', language: 'Anglais', taxSystem: 'National' },
    { code: 'LR', name: 'Liberia', currency: 'LRD', phoneCode: '+231', timezone: 'GMT', language: 'Anglais', taxSystem: 'National' },
    { code: 'SL', name: 'Sierra Leone', currency: 'SLL', phoneCode: '+232', timezone: 'GMT', language: 'Anglais', taxSystem: 'National' },
    { code: 'GM', name: 'Gambie', currency: 'GMD', phoneCode: '+220', timezone: 'GMT', language: 'Anglais', taxSystem: 'National' },
    { code: 'MR', name: 'Mauritanie', currency: 'MRU', phoneCode: '+222', timezone: 'GMT', language: 'Arabe/Français', taxSystem: 'National' },
    { code: 'CV', name: 'Cap-Vert', currency: 'CVE', phoneCode: '+238', timezone: 'CVT', language: 'Portugais', taxSystem: 'National' }
  ];

  // Devises africaines
  const africanCurrencies: Currency[] = [
    { code: 'XAF', name: 'Franc CFA BEAC', symbol: 'FCFA', decimals: 0, exchangeRate: 655.957, countries: ['Cameroun', 'RCA', 'Tchad', 'Congo', 'Gabon', 'Guinée Équatoriale'] },
    { code: 'XOF', name: 'Franc CFA BCEAO', symbol: 'FCFA', decimals: 0, exchangeRate: 655.957, countries: ['Bénin', 'Burkina Faso', 'Côte d\'Ivoire', 'Guinée-Bissau', 'Mali', 'Niger', 'Sénégal', 'Togo'] },
    { code: 'NGN', name: 'Naira', symbol: '₦', decimals: 2, exchangeRate: 1520.50, countries: ['Nigeria'] },
    { code: 'GHS', name: 'Cedi ghanéen', symbol: '₵', decimals: 2, exchangeRate: 12.45, countries: ['Ghana'] },
    { code: 'KES', name: 'Shilling kenyan', symbol: 'KSh', decimals: 2, exchangeRate: 152.75, countries: ['Kenya'] },
    { code: 'TZS', name: 'Shilling tanzanien', symbol: 'TSh', decimals: 2, exchangeRate: 2520.00, countries: ['Tanzanie'] },
    { code: 'UGX', name: 'Shilling ougandais', symbol: 'USh', decimals: 0, exchangeRate: 3750.00, countries: ['Ouganda'] },
    { code: 'RWF', name: 'Franc rwandais', symbol: 'FRw', decimals: 0, exchangeRate: 1275.00, countries: ['Rwanda'] },
    { code: 'ETB', name: 'Birr éthiopien', symbol: 'Br', decimals: 2, exchangeRate: 56.25, countries: ['Éthiopie'] },
    { code: 'ZAR', name: 'Rand', symbol: 'R', decimals: 2, exchangeRate: 18.75, countries: ['Afrique du Sud', 'Namibie', 'Lesotho', 'Eswatini'] },
    { code: 'EGP', name: 'Livre égyptienne', symbol: 'E£', decimals: 2, exchangeRate: 30.90, countries: ['Égypte'] },
    { code: 'MAD', name: 'Dirham marocain', symbol: 'DH', decimals: 2, exchangeRate: 10.15, countries: ['Maroc'] },
    { code: 'TND', name: 'Dinar tunisien', symbol: 'DT', decimals: 3, exchangeRate: 3.14, countries: ['Tunisie'] },
    { code: 'DZD', name: 'Dinar algérien', symbol: 'DA', decimals: 2, exchangeRate: 134.50, countries: ['Algérie'] },
    { code: 'AOA', name: 'Kwanza', symbol: 'Kz', decimals: 2, exchangeRate: 830.00, countries: ['Angola'] },
    { code: 'MZN', name: 'Metical', symbol: 'MT', decimals: 2, exchangeRate: 63.50, countries: ['Mozambique'] },
    { code: 'ZMW', name: 'Kwacha zambien', symbol: 'ZK', decimals: 2, exchangeRate: 26.85, countries: ['Zambie'] },
    { code: 'BWP', name: 'Pula', symbol: 'P', decimals: 2, exchangeRate: 13.65, countries: ['Botswana'] },
    { code: 'GNF', name: 'Franc guinéen', symbol: 'FG', decimals: 0, exchangeRate: 8575.00, countries: ['Guinée'] },
    { code: 'CDF', name: 'Franc congolais', symbol: 'FC', decimals: 2, exchangeRate: 2785.00, countries: ['RD Congo'] },
    { code: 'KMF', name: 'Franc comorien', symbol: 'FC', decimals: 0, exchangeRate: 492.00, countries: ['Comores'] },
    { code: 'MRU', name: 'Ouguiya', symbol: 'UM', decimals: 2, exchangeRate: 39.50, countries: ['Mauritanie'] },
    { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, exchangeRate: 1.00, countries: ['Usage international'] },
    { code: 'USD', name: 'Dollar américain', symbol: '$', decimals: 2, exchangeRate: 0.92, countries: ['Usage international'] }
  ];

  // Configuration des taxes
  const [taxRates, setTaxRates] = useState<TaxRate[]>([
    // TVA
    { id: '1', name: 'TVA Standard', code: 'TVA_19', rate: 19.25, type: 'TVA', applicable: 'Ventes/Achats', deductible: true, active: true },
    { id: '2', name: 'TVA Réduite', code: 'TVA_5', rate: 5, type: 'TVA', applicable: 'Produits de base', deductible: true, active: true },
    { id: '3', name: 'TVA Export', code: 'TVA_0', rate: 0, type: 'TVA', applicable: 'Exportations', deductible: false, active: true },

    // IRPP
    { id: '4', name: 'IRPP 10%', code: 'IRPP_10', rate: 10, type: 'IRPP', applicable: 'Salaires < 2M', deductible: false, active: true },
    { id: '5', name: 'IRPP 15%', code: 'IRPP_15', rate: 15, type: 'IRPP', applicable: 'Salaires 2M-5M', deductible: false, active: true },
    { id: '6', name: 'IRPP 25%', code: 'IRPP_25', rate: 25, type: 'IRPP', applicable: 'Salaires 5M-10M', deductible: false, active: true },
    { id: '7', name: 'IRPP 35%', code: 'IRPP_35', rate: 35, type: 'IRPP', applicable: 'Salaires > 10M', deductible: false, active: true },

    // IS
    { id: '8', name: 'Impôt sur les Sociétés', code: 'IS_30', rate: 30, type: 'IS', applicable: 'Bénéfices', deductible: false, active: true },
    { id: '9', name: 'IS Réduit', code: 'IS_25', rate: 25, type: 'IS', applicable: 'PME', deductible: false, active: true },

    // TSR
    { id: '10', name: 'Taxe Spéciale sur Revenu', code: 'TSR_5', rate: 5, type: 'TSR', applicable: 'Prestations', deductible: false, active: true },

    // Autres taxes
    { id: '11', name: 'Taxe professionnelle', code: 'TP_0.5', rate: 0.5, type: 'AUTRES', applicable: 'Chiffre d\'affaires', deductible: false, active: true },
    { id: '12', name: 'Taxe foncière', code: 'TF_0.1', rate: 0.1, type: 'AUTRES', applicable: 'Propriétés', deductible: false, active: true }
  ]);

  const filteredCountries = africanCountries.filter(country => {
    const matchesSearch = country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          country.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = selectedRegion === 'all' ||
                          (selectedRegion === 'cemac' && country.currency === 'XAF') ||
                          (selectedRegion === 'uemoa' && country.currency === 'XOF') ||
                          (selectedRegion === 'ohada' && country.taxSystem === 'SYSCOHADA');
    return matchesSearch && matchesRegion;
  });

  const handleSaveTax = () => {
    toast.success('Paramètres fiscaux enregistrés avec succès');
    setIsAddingTax(false);
  };

  const handleDeleteTax = (id: string) => {
    setTaxRates(taxRates.filter(tax => tax.id !== id));
    toast.success('Taxe supprimée');
  };

  const handleToggleTax = (id: string) => {
    setTaxRates(taxRates.map(tax =>
      tax.id === id ? { ...tax, active: !tax.active } : tax
    ));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-gray-200 pb-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Globe className="mr-3 h-7 w-7 text-blue-600" />
              Paramètres Régionaux & Fiscaux
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Configuration des pays, devises, taxes et paramètres comptables pour l'Afrique
            </p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" />
            Enregistrer tout
          </Button>
        </div>
      </motion.div>

      {/* Alert SYSCOHADA */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <strong>Conformité SYSCOHADA/OHADA :</strong> Cette configuration respecte les normes comptables
          de l'Organisation pour l'Harmonisation en Afrique du Droit des Affaires (OHADA) et du Système Comptable OHADA (SYSCOHADA).
        </AlertDescription>
      </Alert>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="countries">Pays</TabsTrigger>
          <TabsTrigger value="currencies">Devises</TabsTrigger>
          <TabsTrigger value="taxes">Taxes & TVA</TabsTrigger>
          <TabsTrigger value="accounting">Comptabilité</TabsTrigger>
        </TabsList>

        {/* Countries Tab */}
        <TabsContent value="countries" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  Pays d'Afrique ({africanCountries.length} pays)
                </CardTitle>
                <div className="flex space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Rechercher un pays..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les pays</SelectItem>
                      <SelectItem value="cemac">Zone CEMAC</SelectItem>
                      <SelectItem value="uemoa">Zone UEMOA</SelectItem>
                      <SelectItem value="ohada">Pays OHADA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Pays</TableHead>
                      <TableHead>Devise</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Langue</TableHead>
                      <TableHead>Système fiscal</TableHead>
                      <TableHead>Fuseau horaire</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCountries.map((country) => (
                      <TableRow key={country.code}>
                        <TableCell className="font-mono">{country.code}</TableCell>
                        <TableCell className="font-medium">{country.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{country.currency}</Badge>
                        </TableCell>
                        <TableCell>{country.phoneCode}</TableCell>
                        <TableCell>{country.language}</TableCell>
                        <TableCell>
                          <Badge className={country.taxSystem === 'SYSCOHADA' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                            {country.taxSystem}
                          </Badge>
                        </TableCell>
                        <TableCell>{country.timezone}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currencies Tab */}
        <TabsContent value="currencies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Devises Africaines
                </CardTitle>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter devise
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Symbole</TableHead>
                      <TableHead>Décimales</TableHead>
                      <TableHead>Taux (vs EUR)</TableHead>
                      <TableHead>Pays utilisateurs</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {africanCurrencies.map((currency) => (
                      <TableRow key={currency.code}>
                        <TableCell className="font-mono font-bold">{currency.code}</TableCell>
                        <TableCell>{currency.name}</TableCell>
                        <TableCell className="text-lg">{currency.symbol}</TableCell>
                        <TableCell>{currency.decimals}</TableCell>
                        <TableCell className="font-mono">{currency.exchangeRate.toFixed(3)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {currency.countries.slice(0, 3).map(country => (
                              <Badge key={country} variant="outline" className="text-xs">
                                {country}
                              </Badge>
                            ))}
                            {currency.countries.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{currency.countries.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Exchange Rates Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Configuration des taux de change
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Devise de base</Label>
                  <Select defaultValue="EUR">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="USD">Dollar US (USD)</SelectItem>
                      <SelectItem value="XAF">Franc CFA BEAC (XAF)</SelectItem>
                      <SelectItem value="XOF">Franc CFA BCEAO (XOF)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mise à jour automatique</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Switch defaultChecked />
                    <span className="text-sm text-gray-600">Actualiser quotidiennement</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Taxes Tab */}
        <TabsContent value="taxes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Calculator className="mr-2 h-5 w-5" />
                  Configuration des Taxes
                </CardTitle>
                <Button onClick={() => setIsAddingTax(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle taxe
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Active</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Taux (%)</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Application</TableHead>
                    <TableHead>Déductible</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxRates.map((tax) => (
                    <TableRow key={tax.id}>
                      <TableCell>
                        <Switch
                          checked={tax.active}
                          onCheckedChange={() => handleToggleTax(tax.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{tax.name}</TableCell>
                      <TableCell className="font-mono">{tax.code}</TableCell>
                      <TableCell>
                        <Badge variant={tax.rate > 20 ? 'destructive' : 'default'}>
                          {tax.rate}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tax.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{tax.applicable}</TableCell>
                      <TableCell>
                        {tax.deductible ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTax(tax.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tax Groups */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Paramètres TVA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Régime TVA</Label>
                  <Select defaultValue="reel">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reel">Régime réel</SelectItem>
                      <SelectItem value="simplifie">Régime simplifié</SelectItem>
                      <SelectItem value="franchise">Franchise de TVA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Périodicité déclaration</Label>
                  <Select defaultValue="mensuelle">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensuelle">Mensuelle</SelectItem>
                      <SelectItem value="trimestrielle">Trimestrielle</SelectItem>
                      <SelectItem value="annuelle">Annuelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <Label>TVA sur encaissements</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Paramètres IS/IRPP</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Exercice fiscal</Label>
                  <Select defaultValue="civil">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="civil">Année civile</SelectItem>
                      <SelectItem value="decale">Exercice décalé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Acomptes provisionnels</Label>
                  <Select defaultValue="trimestriels">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensuels">Mensuels</SelectItem>
                      <SelectItem value="trimestriels">Trimestriels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <Label>Calcul automatique des provisions</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Accounting Tab */}
        <TabsContent value="accounting" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Plan comptable */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Plan Comptable
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Référentiel comptable</Label>
                  <Select defaultValue="syscohada">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="syscohada">SYSCOHADA Révisé</SelectItem>
                      <SelectItem value="ohada">Plan OHADA</SelectItem>
                      <SelectItem value="pcg">Plan Comptable Général</SelectItem>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Longueur des comptes</Label>
                  <Select defaultValue="variable">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixe8">Fixe - 8 caractères</SelectItem>
                      <SelectItem value="fixe10">Fixe - 10 caractères</SelectItem>
                      <SelectItem value="variable">Variable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <Label>Comptes auxiliaires obligatoires</Label>
                </div>
              </CardContent>
            </Card>

            {/* Journaux */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Journaux Comptables
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Journal Achats (AC)</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Journal Ventes (VE)</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Journal Banque (BQ)</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Journal Caisse (CA)</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Journal OD (OD)</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Journal Paie (PA)</span>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Périodes comptables */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Périodes Comptables
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Début exercice</Label>
                  <Select defaultValue="janvier">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="janvier">1er Janvier</SelectItem>
                      <SelectItem value="avril">1er Avril</SelectItem>
                      <SelectItem value="juillet">1er Juillet</SelectItem>
                      <SelectItem value="octobre">1er Octobre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Durée exercice</Label>
                  <Select defaultValue="12">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 mois</SelectItem>
                      <SelectItem value="15">15 mois (premier exercice)</SelectItem>
                      <SelectItem value="9">9 mois (exercice court)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch />
                  <Label>Clôture mensuelle automatique</Label>
                </div>
              </CardContent>
            </Card>

            {/* Amortissements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Percent className="mr-2 h-5 w-5" />
                  Amortissements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Méthode par défaut</Label>
                  <Select defaultValue="lineaire">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lineaire">Linéaire</SelectItem>
                      <SelectItem value="degressif">Dégressif</SelectItem>
                      <SelectItem value="variable">Variable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Base de calcul</Label>
                  <Select defaultValue="365">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="365">365 jours</SelectItem>
                      <SelectItem value="360">360 jours</SelectItem>
                      <SelectItem value="mois">Mois complets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <Label>Calcul automatique mensuel</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conformité */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="mr-2 h-5 w-5 text-blue-600" />
                Conformité & Réglementation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <Label>Conformité SYSCOHADA</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <Label>FEC (Fichier des Écritures Comptables)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <Label>Piste d'audit fiable</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <Label>Archivage légal (10 ans)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <Label>Signature électronique</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <Label>Coffre-fort numérique</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RegionalSettingsPage;