import { AssetClassificationService } from '../data/assetClassification';

export interface AssetDetectionRule {
  accountCodes: string[];
  minimumAmount?: number;
  keywords?: string[];
  supplierPatterns?: string[];
  description: string;
  category: string;
  suggestedUsefulLife: number;
  suggestedDepreciationMethod: string;
}

export const assetDetectionRules: AssetDetectionRule[] = [
  {
    accountCodes: ['2183', '218300', '21830'],
    minimumAmount: 500,
    keywords: ['ordinateur', 'serveur', 'laptop', 'pc', 'matériel informatique', 'hardware'],
    supplierPatterns: ['dell', 'hp', 'lenovo', 'apple', 'microsoft'],
    description: 'Matériel informatique',
    category: '213-LA',
    suggestedUsefulLife: 3,
    suggestedDepreciationMethod: 'lineaire'
  },
  {
    accountCodes: ['2135', '213500', '21350'],
    minimumAmount: 100,
    keywords: ['logiciel', 'licence', 'software', 'application', 'saas'],
    supplierPatterns: ['microsoft', 'adobe', 'oracle', 'sap'],
    description: 'Logiciels et licences',
    category: '212-DL',
    suggestedUsefulLife: 3,
    suggestedDepreciationMethod: 'lineaire'
  },
  {
    accountCodes: ['2154', '215400', '21540'],
    minimumAmount: 1000,
    keywords: ['mobilier', 'bureau', 'chaise', 'table', 'armoire', 'meuble'],
    description: 'Mobilier de bureau',
    category: '244-MOB',
    suggestedUsefulLife: 10,
    suggestedDepreciationMethod: 'lineaire'
  },
  {
    accountCodes: ['2182', '218200', '21820'],
    minimumAmount: 2000,
    keywords: ['véhicule', 'voiture', 'camion', 'utilitaire', 'auto'],
    description: 'Matériel de transport',
    category: '245-VHL',
    suggestedUsefulLife: 5,
    suggestedDepreciationMethod: 'degressive'
  },
  {
    accountCodes: ['2184', '218400', '21840'],
    minimumAmount: 500,
    keywords: ['équipement', 'matériel', 'machine', 'outil', 'appareil'],
    description: 'Matériel et outillage',
    category: '241-MT',
    suggestedUsefulLife: 5,
    suggestedDepreciationMethod: 'lineaire'
  },
  {
    accountCodes: ['2313', '231300', '23130'],
    minimumAmount: 10000,
    keywords: ['installation', 'aménagement', 'agencement', 'travaux'],
    description: 'Installations et aménagements',
    category: '234-AGT',
    suggestedUsefulLife: 10,
    suggestedDepreciationMethod: 'lineaire'
  },
  {
    accountCodes: ['2315', '231500', '23150'],
    minimumAmount: 1000,
    keywords: ['sécurité', 'alarme', 'caméra', 'surveillance', 'protection'],
    description: 'Équipements de sécurité',
    category: '234-SS',
    suggestedUsefulLife: 8,
    suggestedDepreciationMethod: 'lineaire'
  }
];

export interface InvoiceData {
  id: string;
  amount: number;
  supplier: string;
  description: string;
  account: string;
  date: string;
}

export interface AssetDetectionResult {
  isAsset: boolean;
  confidence: number;
  matchedRules: AssetDetectionRule[];
  suggestions: {
    category: string;
    usefulLife: number;
    depreciationMethod: string;
    reasoning: string[];
  };
}

export class AssetDetectionEngine {
  private static normalizeText(text: string): string {
    return text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private static matchKeywords(description: string, keywords: string[]): number {
    const normalizedDescription = this.normalizeText(description);
    const matches = keywords.filter(keyword =>
      normalizedDescription.includes(this.normalizeText(keyword))
    );
    return matches.length / keywords.length;
  }

  private static matchSupplier(supplier: string, patterns: string[]): boolean {
    const normalizedSupplier = this.normalizeText(supplier);
    return patterns.some(pattern =>
      normalizedSupplier.includes(this.normalizeText(pattern))
    );
  }

  static detectAsset(invoice: InvoiceData): AssetDetectionResult {
    let maxConfidence = 0;
    let bestClassification: { category: string; account: string; confidence: number } | null = null;

    // Recherche par classification d'actifs
    const classifications = AssetClassificationService.getAllClassifications();

    for (const classification of classifications) {
      let confidence = 0;
      const reasoning: string[] = [];

      // Vérification du compte comptable principal
      if (invoice.account === classification.syscohadaAccount ||
          invoice.account.startsWith(classification.syscohadaAccount)) {
        confidence += 0.5;
        reasoning.push(`Compte ${invoice.account} correspond à ${classification.assetCategory}`);
      }

      // Vérification des mots-clés dans la description
      if (classification.examples.length > 0) {
        const keywordMatch = this.matchKeywords(invoice.description, classification.examples);
        if (keywordMatch > 0) {
          confidence += keywordMatch * 0.4;
          reasoning.push(`Mots-clés trouvés: ${Math.round(keywordMatch * 100)}% de correspondance`);
        }
      }

      // Vérification du montant (seuil minimum de 500€)
      if (invoice.amount >= 500) {
        confidence += 0.1;
        reasoning.push(`Montant ${invoice.amount}€ > seuil de capitalisation`);
      }

      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        bestClassification = classification;
      }
    }

    // Fallback sur les règles anciennes si pas de correspondance
    if (!bestClassification || maxConfidence < 0.3) {
      return this.detectAssetLegacy(invoice);
    }

    const suggestions = {
      category: bestClassification.categoryCode,
      usefulLife: bestClassification.defaultUsefulLife,
      depreciationMethod: 'lineaire',
      reasoning: [
        `Catégorie: ${bestClassification.assetCategory}`,
        `Durée de vie: ${bestClassification.defaultUsefulLife} ans`,
        `Taux: ${bestClassification.defaultDepreciationRate}%`,
        `Classe: ${bestClassification.assetClass}`
      ]
    };

    return {
      isAsset: maxConfidence > 0.5,
      confidence: maxConfidence,
      matchedRules: [], // Deprecated for new system
      suggestions
    };
  }

  // Méthode legacy pour la compatibilité
  private static detectAssetLegacy(invoice: InvoiceData): AssetDetectionResult {
    const matchedRules: AssetDetectionRule[] = [];
    let maxConfidence = 0;

    for (const rule of assetDetectionRules) {
      let confidence = 0;
      const reasoning: string[] = [];

      // Vérification du compte comptable
      const accountMatch = rule.accountCodes.some(code =>
        invoice.account.startsWith(code) || invoice.account === code
      );

      if (accountMatch) {
        confidence += 0.4;
        reasoning.push(`Compte comptable ${invoice.account} correspond à ${rule.description}`);
      }

      // Vérification du montant minimum
      if (rule.minimumAmount && invoice.amount >= rule.minimumAmount) {
        confidence += 0.2;
        reasoning.push(`Montant ${invoice.amount}€ > seuil ${rule.minimumAmount}€`);
      }

      // Vérification des mots-clés dans la description
      if (rule.keywords && rule.keywords.length > 0) {
        const keywordMatch = this.matchKeywords(invoice.description, rule.keywords);
        if (keywordMatch > 0) {
          confidence += keywordMatch * 0.3;
          reasoning.push(`Mots-clés trouvés: ${keywordMatch * 100}% de correspondance`);
        }
      }

      // Vérification du fournisseur
      if (rule.supplierPatterns && rule.supplierPatterns.length > 0) {
        const supplierMatch = this.matchSupplier(invoice.supplier, rule.supplierPatterns);
        if (supplierMatch) {
          confidence += 0.1;
          reasoning.push(`Fournisseur ${invoice.supplier} reconnu dans la catégorie`);
        }
      }

      if (confidence > 0.3) {
        matchedRules.push(rule);
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
        }
      }
    }

    // Déterminer la meilleure suggestion
    const bestRule = matchedRules.find(rule => {
      const ruleConfidence = this.calculateRuleConfidence(invoice, rule);
      return Math.abs(ruleConfidence - maxConfidence) < 0.01;
    }) || matchedRules[0];

    const suggestions = bestRule ? {
      category: bestRule.category,
      usefulLife: bestRule.suggestedUsefulLife,
      depreciationMethod: bestRule.suggestedDepreciationMethod,
      reasoning: [`Catégorie suggérée: ${bestRule.description}`,
                 `Durée de vie: ${bestRule.suggestedUsefulLife} ans`,
                 `Méthode: ${bestRule.suggestedDepreciationMethod}`]
    } : {
      category: '',
      usefulLife: 5,
      depreciationMethod: 'lineaire',
      reasoning: ['Aucune correspondance automatique trouvée']
    };

    return {
      isAsset: maxConfidence > 0.5,
      confidence: maxConfidence,
      matchedRules,
      suggestions
    };
  }

  private static calculateRuleConfidence(invoice: InvoiceData, rule: AssetDetectionRule): number {
    let confidence = 0;

    // Compte comptable
    if (rule.accountCodes.some(code => invoice.account.startsWith(code))) {
      confidence += 0.4;
    }

    // Montant
    if (rule.minimumAmount && invoice.amount >= rule.minimumAmount) {
      confidence += 0.2;
    }

    // Mots-clés
    if (rule.keywords) {
      confidence += this.matchKeywords(invoice.description, rule.keywords) * 0.3;
    }

    // Fournisseur
    if (rule.supplierPatterns && this.matchSupplier(invoice.supplier, rule.supplierPatterns)) {
      confidence += 0.1;
    }

    return confidence;
  }

  static shouldTriggerCapitalization(invoice: InvoiceData): boolean {
    const detection = this.detectAsset(invoice);
    return detection.isAsset && detection.confidence > 0.6;
  }

  static getCapitalizationThreshold(): number {
    return 500; // Seuil de capitalisation en euros
  }

  static isAboveThreshold(amount: number): boolean {
    return amount >= this.getCapitalizationThreshold();
  }
}

// Hook React pour la détection d'actifs
export const useAssetDetection = () => {
  const detectAsset = (invoice: InvoiceData) => {
    return AssetDetectionEngine.detectAsset(invoice);
  };

  const shouldTriggerCapitalization = (invoice: InvoiceData) => {
    return AssetDetectionEngine.shouldTriggerCapitalization(invoice);
  };

  const isAboveThreshold = (amount: number) => {
    return AssetDetectionEngine.isAboveThreshold(amount);
  };

  return {
    detectAsset,
    shouldTriggerCapitalization,
    isAboveThreshold,
    threshold: AssetDetectionEngine.getCapitalizationThreshold()
  };
};