export interface CompteComptable {
  code: string;
  libelle: string;
  categorie: string;
  sousCategorie?: string;
  nature: 'debit' | 'credit';
  actif: boolean;
  keywords?: string[];
}

export const planComptableSYSCOHADA: CompteComptable[] = [
  // CLASSE 1 - COMPTES DE RESSOURCES DURABLES
  { code: '101', libelle: 'Capital social', categorie: 'Capitaux propres', nature: 'credit', actif: true },
  { code: '106', libelle: 'Réserves', categorie: 'Capitaux propres', nature: 'credit', actif: true },
  { code: '110', libelle: 'Report à nouveau créditeur', categorie: 'Capitaux propres', nature: 'credit', actif: true },
  { code: '119', libelle: 'Report à nouveau débiteur', categorie: 'Capitaux propres', nature: 'debit', actif: true },
  { code: '130', libelle: 'Résultat en instance d\'affectation', categorie: 'Capitaux propres', nature: 'credit', actif: true },
  { code: '131', libelle: 'Résultat net : Bénéfice', categorie: 'Résultat', nature: 'credit', actif: true },
  { code: '139', libelle: 'Résultat net : Perte', categorie: 'Résultat', nature: 'debit', actif: true },
  { code: '161', libelle: 'Emprunts et dettes assimilées', categorie: 'Dettes financières', nature: 'credit', actif: true },
  { code: '164', libelle: 'Emprunts et dettes auprès des établissements de crédit', categorie: 'Dettes financières', nature: 'credit', actif: true },
  { code: '168', libelle: 'Emprunts et dettes financières diverses', categorie: 'Dettes financières', nature: 'credit', actif: true },

  // CLASSE 2 - COMPTES D'ACTIF IMMOBILISE
  { code: '211', libelle: 'Frais de développement', categorie: 'Immobilisations incorporelles', nature: 'debit', actif: true, keywords: ['développement', 'recherche', 'R&D'] },
  { code: '212', libelle: 'Brevets, licences, logiciels', categorie: 'Immobilisations incorporelles', nature: 'debit', actif: true, keywords: ['logiciel', 'licence', 'brevet', 'software'] },
  { code: '213', libelle: 'Fonds commercial', categorie: 'Immobilisations incorporelles', nature: 'debit', actif: true },
  { code: '2135', libelle: 'Logiciels', categorie: 'Immobilisations incorporelles', nature: 'debit', actif: true, keywords: ['logiciel', 'software', 'application'] },

  { code: '221', libelle: 'Terrains', categorie: 'Immobilisations corporelles', nature: 'debit', actif: true, keywords: ['terrain', 'foncier'] },
  { code: '222', libelle: 'Terrains d\'exploitation', categorie: 'Immobilisations corporelles', nature: 'debit', actif: true },
  { code: '223', libelle: 'Bâtiments', categorie: 'Immobilisations corporelles', nature: 'debit', actif: true, keywords: ['bâtiment', 'construction', 'immeuble'] },
  { code: '231', libelle: 'Installations techniques', categorie: 'Immobilisations corporelles', nature: 'debit', actif: true, keywords: ['installation', 'technique'] },
  { code: '241', libelle: 'Matériel et outillage', categorie: 'Immobilisations corporelles', nature: 'debit', actif: true, keywords: ['matériel', 'outil', 'équipement'] },

  { code: '2183', libelle: 'Matériel informatique', categorie: 'Immobilisations corporelles', nature: 'debit', actif: true, keywords: ['ordinateur', 'serveur', 'informatique', 'PC', 'laptop'] },
  { code: '2154', libelle: 'Matériel et mobilier', categorie: 'Immobilisations corporelles', nature: 'debit', actif: true, keywords: ['mobilier', 'bureau', 'meuble', 'chaise'] },
  { code: '2182', libelle: 'Matériel de transport', categorie: 'Immobilisations corporelles', nature: 'debit', actif: true, keywords: ['véhicule', 'voiture', 'camion', 'transport'] },
  { code: '2184', libelle: 'Matériel technique', categorie: 'Immobilisations corporelles', nature: 'debit', actif: true, keywords: ['machine', 'technique'] },

  { code: '162', libelle: 'Emprunts et dettes auprès des établissements de crédit', categorie: 'Dettes financières', nature: 'credit', actif: true, keywords: ['emprunt', 'dette', 'banque', 'crédit'] },
  { code: '232', libelle: 'Immobilisations corporelles en cours', categorie: 'Immobilisations en cours', nature: 'debit', actif: true, keywords: ['en-cours', 'construction', 'chantier'] },
  { code: '237', libelle: 'Avances et acomptes versés sur immobilisations', categorie: 'Immobilisations en cours', nature: 'debit', actif: true },
  { code: '272', libelle: 'Prêts au personnel', categorie: 'Immobilisations financières', nature: 'debit', actif: true, keywords: ['prêt', 'personnel', 'salarié'] },
  { code: '275000', libelle: 'Dépôts et cautionnements reçus', categorie: 'Passif non courant', sousCategorie: 'Dettes diverses', nature: 'credit', actif: true, keywords: ['dépôt', 'garantie', 'caution', 'cautionnement'] },
  { code: '291', libelle: 'Dépréciation des immobilisations incorporelles', categorie: 'Dépréciations immobilisations', nature: 'credit', actif: true, keywords: ['dépréciation', 'immobilisation'] },
  { code: '292', libelle: 'Dépréciation des immobilisations corporelles', categorie: 'Dépréciations immobilisations', nature: 'credit', actif: true, keywords: ['dépréciation', 'immobilisation'] },

  // AMORTISSEMENTS
  { code: '281', libelle: 'Amortissements des immobilisations incorporelles', categorie: 'Amortissements', nature: 'credit', actif: true },
  { code: '2812', libelle: 'Amortissements brevets, licences, logiciels', categorie: 'Amortissements', nature: 'credit', actif: true },
  { code: '2813', libelle: 'Amortissements fonds commercial', categorie: 'Amortissements', nature: 'credit', actif: true },
  { code: '282', libelle: 'Amortissements des immobilisations corporelles', categorie: 'Amortissements', nature: 'credit', actif: true },
  { code: '2823', libelle: 'Amortissements bâtiments', categorie: 'Amortissements', nature: 'credit', actif: true },
  { code: '28183', libelle: 'Amortissements matériel informatique', categorie: 'Amortissements', nature: 'credit', actif: true },
  { code: '28154', libelle: 'Amortissements mobilier', categorie: 'Amortissements', nature: 'credit', actif: true },
  { code: '28182', libelle: 'Amortissements matériel de transport', categorie: 'Amortissements', nature: 'credit', actif: true },

  // CLASSE 3 - COMPTES DE STOCKS
  { code: '311', libelle: 'Marchandises', categorie: 'Stocks marchandises', nature: 'debit', actif: true, keywords: ['marchandise', 'stock'] },
  { code: '312', libelle: 'Marchandises B', categorie: 'Stocks marchandises', nature: 'debit', actif: true },
  { code: '321', libelle: 'Matières premières', categorie: 'Stocks matières premières', nature: 'debit', actif: true, keywords: ['matière', 'première', 'stock'] },
  { code: '322', libelle: 'Fournitures liées', categorie: 'Stocks matières premières', nature: 'debit', actif: true },
  { code: '331', libelle: 'Matières consommables', categorie: 'Autres approvisionnements', nature: 'debit', actif: true, keywords: ['consommable', 'approvisionnement'] },
  { code: '332', libelle: 'Fournitures d\'atelier et d\'usine', categorie: 'Autres approvisionnements', nature: 'debit', actif: true },
  { code: '334', libelle: 'Fournitures de bureau', categorie: 'Autres approvisionnements', nature: 'debit', actif: true },
  { code: '335', libelle: 'Emballages', categorie: 'Autres approvisionnements', nature: 'debit', actif: true, keywords: ['emballage'] },
  { code: '341', libelle: 'Produits en cours', categorie: 'Produits en cours', nature: 'debit', actif: true, keywords: ['en-cours', 'production'] },
  { code: '351', libelle: 'Études en cours', categorie: 'Services en cours', nature: 'debit', actif: true },
  { code: '361', libelle: 'Produits finis', categorie: 'Stocks produits finis', nature: 'debit', actif: true, keywords: ['produit', 'fini', 'stock'] },
  { code: '371', libelle: 'Produits intermédiaires', categorie: 'Produits intermédiaires', nature: 'debit', actif: true },
  { code: '372', libelle: 'Produits résiduels', categorie: 'Produits intermédiaires', nature: 'debit', actif: true },
  { code: '381', libelle: 'Marchandises en cours de route', categorie: 'Stocks en transit', nature: 'debit', actif: true },
  { code: '391', libelle: 'Dépréciation des marchandises', categorie: 'Dépréciations stocks', nature: 'credit', actif: true, keywords: ['dépréciation', 'provision', 'stock'] },
  { code: '392', libelle: 'Dépréciation des matières premières', categorie: 'Dépréciations stocks', nature: 'credit', actif: true },
  { code: '396', libelle: 'Dépréciation des produits finis', categorie: 'Dépréciations stocks', nature: 'credit', actif: true },

  // CLASSE 4 - COMPTES DE TIERS
  { code: '401', libelle: 'Fournisseurs', categorie: 'Dettes fournisseurs', nature: 'credit', actif: true, keywords: ['fournisseur', 'dette'] },
  { code: '4011', libelle: 'Fournisseurs - Factures non parvenues', categorie: 'Dettes fournisseurs', nature: 'credit', actif: true },
  { code: '4017', libelle: 'Fournisseurs - Retenues de garantie', categorie: 'Dettes fournisseurs', nature: 'credit', actif: true },
  { code: '403', libelle: 'Fournisseurs - Effets à payer', categorie: 'Dettes fournisseurs', nature: 'credit', actif: true },
  { code: '408', libelle: 'Fournisseurs - Factures non parvenues', categorie: 'Dettes fournisseurs', nature: 'credit', actif: true },
  { code: '409', libelle: 'Fournisseurs débiteurs', categorie: 'Créances', nature: 'debit', actif: true },

  { code: '411', libelle: 'Clients', categorie: 'Créances clients', nature: 'debit', actif: true, keywords: ['client', 'créance'] },
  { code: '4111', libelle: 'Clients - Factures à établir', categorie: 'Créances clients', nature: 'debit', actif: true },
  { code: '413', libelle: 'Clients - Effets à recevoir', categorie: 'Créances clients', nature: 'debit', actif: true },
  { code: '416', libelle: 'Clients douteux', categorie: 'Créances clients', nature: 'debit', actif: true },
  { code: '418', libelle: 'Clients - Produits non encore facturés', categorie: 'Créances clients', nature: 'debit', actif: true },

  { code: '421', libelle: 'Personnel - Rémunérations dues', categorie: 'Dettes sociales', nature: 'credit', actif: true, keywords: ['salaire', 'personnel', 'paie'] },
  { code: '4211', libelle: 'Personnel - Rémunérations dues', categorie: 'Dettes sociales', nature: 'credit', actif: true, keywords: ['salaire', 'net', 'paie'] },
  { code: '4212', libelle: 'Personnel - Avances et acomptes versés', categorie: 'Créances', nature: 'debit', actif: true, keywords: ['avance', 'acompte', 'personnel'] },
  { code: '422', libelle: 'Personnel - Œuvres sociales', categorie: 'Dettes sociales', nature: 'credit', actif: true },
  { code: '423', libelle: 'Personnel - Participation', categorie: 'Dettes sociales', nature: 'credit', actif: true },
  { code: '424', libelle: 'Personnel - Œuvres sociales du CE', categorie: 'Dettes sociales', nature: 'credit', actif: true },
  { code: '425', libelle: 'Personnel - Avances et acomptes', categorie: 'Créances', nature: 'debit', actif: true },
  { code: '426', libelle: 'Personnel - Dépôts', categorie: 'Dettes', nature: 'credit', actif: true },
  { code: '427', libelle: 'Personnel - Oppositions', categorie: 'Dettes sociales', nature: 'credit', actif: true },
  { code: '4282', libelle: 'Dettes provisionnées pour congés payés', categorie: 'Dettes sociales', nature: 'credit', actif: true, keywords: ['congés', 'provision', 'payés'] },
  { code: '4286', libelle: 'Dettes provisionnées pour 13ème mois', categorie: 'Dettes sociales', nature: 'credit', actif: true, keywords: ['13ème', 'gratification', 'provision'] },

  { code: '431', libelle: 'Sécurité Sociale', categorie: 'Dettes sociales', nature: 'credit', actif: true, keywords: ['cnps', 'sécurité', 'sociale'] },
  { code: '4311', libelle: 'CNPS part salariale', categorie: 'Dettes sociales', nature: 'credit', actif: true, keywords: ['cnps', 'salariale'] },
  { code: '4312', libelle: 'CNPS part patronale', categorie: 'Dettes sociales', nature: 'credit', actif: true, keywords: ['cnps', 'patronale'] },
  { code: '432', libelle: 'Caisse de retraite', categorie: 'Dettes sociales', nature: 'credit', actif: true },
  { code: '433', libelle: 'Autres organismes sociaux', categorie: 'Dettes sociales', nature: 'credit', actif: true },

  { code: '441', libelle: 'État - Subventions à recevoir', categorie: 'Créances État', nature: 'debit', actif: true },
  { code: '442', libelle: 'État - Impôts et taxes recouvrables', categorie: 'Créances État', nature: 'debit', actif: true },
  { code: '443', libelle: 'État - TVA facturée', categorie: 'Dettes État', nature: 'credit', actif: true, keywords: ['tva', 'taxe'] },
  { code: '4431', libelle: 'TVA collectée 18%', categorie: 'Dettes État', nature: 'credit', actif: true, keywords: ['tva', 'collectée'] },
  { code: '444', libelle: 'État - TVA due', categorie: 'Dettes État', nature: 'credit', actif: true },
  { code: '445', libelle: 'État - TVA récupérable', categorie: 'Créances État', nature: 'debit', actif: true },
  { code: '4456', libelle: 'TVA déductible sur immobilisations', categorie: 'Créances État', nature: 'debit', actif: true },
  { code: '44562', libelle: 'TVA déductible sur autres biens et services', categorie: 'Créances État', nature: 'debit', actif: true },
  { code: '447', libelle: 'État - Autres impôts, taxes et versements', categorie: 'Dettes État', nature: 'credit', actif: true },
  { code: '4471', libelle: 'État - ITS (Impôt sur Traitements et Salaires)', categorie: 'Dettes État', nature: 'credit', actif: true, keywords: ['its', 'impôt', 'salaire'] },
  { code: '4472', libelle: 'État - CN (Contribution Nationale)', categorie: 'Dettes État', nature: 'credit', actif: true, keywords: ['cn', 'contribution', 'nationale'] },
  { code: '4473', libelle: 'État - IGR (Impôt Général sur le Revenu)', categorie: 'Dettes État', nature: 'credit', actif: true, keywords: ['igr', 'impôt', 'revenu'] },
  { code: '4474', libelle: 'État - FDFP', categorie: 'Dettes État', nature: 'credit', actif: true, keywords: ['fdfp', 'formation'] },
  { code: '449', libelle: 'État - Créances fiscales', categorie: 'Créances État', nature: 'debit', actif: true },
  { code: '4492', libelle: 'Acomptes IS versés', categorie: 'Créances État', nature: 'debit', actif: true, keywords: ['acompte', 'is', 'impôt', 'bénéfice'] },
  { code: '476', libelle: 'Charges constatées d\'avance', categorie: 'Comptes de régularisation', nature: 'debit', actif: true, keywords: ['CCA', 'charge', 'avance'] },
  { code: '4761', libelle: 'Écarts de conversion - Actif', categorie: 'Comptes de régularisation', nature: 'debit', actif: true, keywords: ['écart', 'conversion', 'devise'] },
  { code: '4771', libelle: 'Écarts de conversion - Passif', categorie: 'Comptes de régularisation', nature: 'credit', actif: true, keywords: ['écart', 'conversion', 'devise'] },
  { code: '491', libelle: 'Dépréciation des comptes de clients', categorie: 'Dépréciations créances', nature: 'credit', actif: true, keywords: ['dépréciation', 'créance', 'client', 'provision'] },

  { code: '477000', libelle: 'Produits constatés d\'avance', categorie: 'Passif courant', sousCategorie: 'Comptes de régularisation', nature: 'credit', actif: true, keywords: ['PCA', 'produits', 'avance', 'constatés', 'étalement'] },

  // CLASSE 5 - COMPTES DE TRESORERIE
  { code: '5112', libelle: 'Chèques à encaisser', categorie: 'Valeurs à l\'encaissement', nature: 'debit', actif: true, keywords: ['chèque', 'encaisser', 'remise'] },
  { code: '521', libelle: 'Banques locales', categorie: 'Disponibilités', nature: 'debit', actif: true, keywords: ['banque', 'compte', 'dépôt'] },
  { code: '522', libelle: 'Banques étrangères', categorie: 'Disponibilités', nature: 'debit', actif: true },
  { code: '531', libelle: 'Chèques postaux', categorie: 'Disponibilités', nature: 'debit', actif: true },
  { code: '541', libelle: 'Trésorerie générale', categorie: 'Disponibilités', nature: 'debit', actif: true },
  { code: '571', libelle: 'Caisse', categorie: 'Disponibilités', nature: 'debit', actif: true, keywords: ['caisse', 'espèces', 'liquide'] },
  { code: '585', libelle: 'Virements internes de trésorerie', categorie: 'Virements internes', nature: 'debit', actif: true, keywords: ['virement', 'interne', 'transfert'] },

  // CLASSE 6 - COMPTES DE CHARGES
  // 60 - ACHATS ET VARIATIONS DE STOCKS
  { code: '601', libelle: 'Achats de marchandises', categorie: 'Achats', nature: 'debit', actif: true, keywords: ['achat', 'marchandise', 'stock'] },
  { code: '6011', libelle: 'Achats de marchandises groupe A', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6012', libelle: 'Achats de marchandises groupe B', categorie: 'Achats', nature: 'debit', actif: true },

  { code: '602', libelle: 'Achats de matières premières et fournitures liées', categorie: 'Achats', nature: 'debit', actif: true, keywords: ['matière', 'première', 'fourniture'] },
  { code: '6021', libelle: 'Matières premières', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6022', libelle: 'Matières et fournitures consommables', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6023', libelle: 'Combustibles', categorie: 'Achats', nature: 'debit', actif: true, keywords: ['carburant', 'essence', 'gasoil', 'diesel'] },
  { code: '6024', libelle: 'Produits d\'entretien', categorie: 'Achats', nature: 'debit', actif: true, keywords: ['entretien', 'nettoyage'] },
  { code: '6025', libelle: 'Fournitures d\'atelier et d\'usine', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6026', libelle: 'Fournitures de magasin', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6027', libelle: 'Fournitures de bureau', categorie: 'Achats', nature: 'debit', actif: true, keywords: ['bureau', 'papeterie', 'fournitures'] },

  { code: '603', libelle: 'Variations de stocks de biens achetés', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6031', libelle: 'Variation stocks de marchandises', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6032', libelle: 'Variation stocks de matières premières', categorie: 'Achats', nature: 'debit', actif: true },

  { code: '604', libelle: 'Achats stockés de matières et fournitures consommables', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6041', libelle: 'Matières consommables', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6042', libelle: 'Fournitures consommables', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6043', libelle: 'Fournitures d\'entretien', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6044', libelle: 'Fournitures de bureau', categorie: 'Achats', nature: 'debit', actif: true },

  { code: '605', libelle: 'Autres achats', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6051', libelle: 'Eau', categorie: 'Achats', nature: 'debit', actif: true, keywords: ['eau', 'consommation'] },
  { code: '6052', libelle: 'Électricité', categorie: 'Achats', nature: 'debit', actif: true, keywords: ['électricité', 'énergie'] },
  { code: '6053', libelle: 'Autres énergies', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6054', libelle: 'Achats de travaux, études et prestations de service', categorie: 'Achats', nature: 'debit', actif: true, keywords: ['prestation', 'service', 'consultant'] },
  { code: '6055', libelle: 'Achats de matériel, équipements et travaux', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6056', libelle: 'Achats non stockés de matières et fournitures', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6057', libelle: 'Achats de marchandises', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6058', libelle: 'Achats d\'emballages', categorie: 'Achats', nature: 'debit', actif: true, keywords: ['emballage', 'packaging'] },

  { code: '608', libelle: 'Frais accessoires d\'achats', categorie: 'Achats', nature: 'debit', actif: true, keywords: ['frais', 'transport', 'accessoire'] },
  { code: '6081', libelle: 'Frais accessoires sur achats de marchandises', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6082', libelle: 'Frais accessoires sur achats de matières premières', categorie: 'Achats', nature: 'debit', actif: true },
  { code: '6084', libelle: 'Frais accessoires sur achats de fournitures', categorie: 'Achats', nature: 'debit', actif: true },

  { code: '609', libelle: 'Rabais, remises, ristournes obtenus sur achats', categorie: 'Réductions', nature: 'credit', actif: true, keywords: ['rabais', 'remise', 'ristourne', 'réduction'] },
  { code: '6091', libelle: 'RRR sur achats de marchandises', categorie: 'Réductions', nature: 'credit', actif: true },
  { code: '6092', libelle: 'RRR sur achats de matières premières', categorie: 'Réductions', nature: 'credit', actif: true },
  { code: '6094', libelle: 'RRR sur achats stockés de matières et fournitures', categorie: 'Réductions', nature: 'credit', actif: true },
  { code: '6095', libelle: 'RRR sur autres achats', categorie: 'Réductions', nature: 'credit', actif: true },

  { code: '611', libelle: 'Sous-traitance générale', categorie: 'Services extérieurs', nature: 'debit', actif: true },
  { code: '612', libelle: 'Redevances de crédit-bail', categorie: 'Services extérieurs', nature: 'debit', actif: true },
  { code: '613', libelle: 'Locations', categorie: 'Services extérieurs', nature: 'debit', actif: true, keywords: ['location', 'loyer'] },
  { code: '614', libelle: 'Charges locatives', categorie: 'Services extérieurs', nature: 'debit', actif: true },
  { code: '615', libelle: 'Entretien et réparations', categorie: 'Services extérieurs', nature: 'debit', actif: true, keywords: ['maintenance', 'réparation'] },
  { code: '616', libelle: 'Primes d\'assurances', categorie: 'Services extérieurs', nature: 'debit', actif: true, keywords: ['assurance', 'prime'] },
  { code: '617', libelle: 'Études et recherches', categorie: 'Services extérieurs', nature: 'debit', actif: true },
  { code: '618', libelle: 'Documentation générale', categorie: 'Services extérieurs', nature: 'debit', actif: true },
  { code: '619', libelle: 'Rabais, remises, ristournes obtenus', categorie: 'Réductions', nature: 'credit', actif: true },

  { code: '621', libelle: 'Personnel extérieur à l\'entreprise', categorie: 'Autres services extérieurs', nature: 'debit', actif: true },
  { code: '622', libelle: 'Rémunérations d\'intermédiaires', categorie: 'Autres services extérieurs', nature: 'debit', actif: true },
  { code: '623', libelle: 'Publicité, publications, relations publiques', categorie: 'Autres services extérieurs', nature: 'debit', actif: true, keywords: ['publicité', 'marketing'] },
  { code: '624', libelle: 'Transports de biens et transports collectifs', categorie: 'Autres services extérieurs', nature: 'debit', actif: true, keywords: ['transport', 'livraison'] },
  { code: '625', libelle: 'Déplacements, missions et réceptions', categorie: 'Autres services extérieurs', nature: 'debit', actif: true, keywords: ['déplacement', 'mission', 'voyage'] },
  { code: '626', libelle: 'Frais postaux et de télécommunications', categorie: 'Autres services extérieurs', nature: 'debit', actif: true, keywords: ['téléphone', 'internet', 'poste'] },
  { code: '627', libelle: 'Services bancaires et assimilés', categorie: 'Autres services extérieurs', nature: 'debit', actif: true, keywords: ['banque', 'frais'] },
  { code: '628', libelle: 'Cotisations et divers', categorie: 'Autres services extérieurs', nature: 'debit', actif: true },

  { code: '631', libelle: 'Frais bancaires', categorie: 'Charges financières', nature: 'debit', actif: true, keywords: ['frais', 'bancaires', 'agios'] },
  { code: '6312', libelle: 'Frais sur effets impayés', categorie: 'Charges financières', nature: 'debit', actif: true, keywords: ['impayé', 'chèque', 'rejet'] },
  { code: '633', libelle: 'Impôts, taxes et versements assimilés sur rémunérations', categorie: 'Impôts et taxes', nature: 'debit', actif: true },
  { code: '635', libelle: 'Autres impôts, taxes et versements assimilés', categorie: 'Impôts et taxes', nature: 'debit', actif: true },
  { code: '642', libelle: 'Contribution foncière des propriétés bâties', categorie: 'Impôts et taxes', nature: 'debit', actif: true, keywords: ['foncier', 'propriété', 'taxe'] },

  { code: '6411', libelle: 'Appointements et salaires', categorie: 'Charges de personnel', nature: 'debit', actif: true, keywords: ['salaire', 'appointement', 'rémunération'] },
  { code: '6412', libelle: 'Primes et indemnités', categorie: 'Charges de personnel', nature: 'debit', actif: true, keywords: ['prime', 'indemnité', 'bonus'] },
  { code: '6414', libelle: 'Provision congés payés', categorie: 'Charges de personnel', nature: 'debit', actif: true, keywords: ['congés', 'provision'] },
  { code: '6418', libelle: 'Provision 13ème mois', categorie: 'Charges de personnel', nature: 'debit', actif: true, keywords: ['13ème', 'mois', 'gratification'] },
  { code: '641', libelle: 'Rémunérations du personnel', categorie: 'Charges de personnel', nature: 'debit', actif: true, keywords: ['salaire', 'rémunération'] },
  { code: '6421', libelle: 'Charges sociales CNPS patronales', categorie: 'Charges de personnel', nature: 'debit', actif: true, keywords: ['cnps', 'patronale', 'cotisation'] },
  { code: '6422', libelle: 'Charges sociales FDFP', categorie: 'Charges de personnel', nature: 'debit', actif: true, keywords: ['fdfp', 'formation', 'apprentissage'] },
  { code: '645', libelle: 'Charges de sécurité sociale et de prévoyance', categorie: 'Charges de personnel', nature: 'debit', actif: true },
  { code: '646', libelle: 'Cotisations sociales', categorie: 'Charges de personnel', nature: 'debit', actif: true },
  { code: '647', libelle: 'Autres charges sociales', categorie: 'Charges de personnel', nature: 'debit', actif: true },
  { code: '648', libelle: 'Autres charges de personnel', categorie: 'Charges de personnel', nature: 'debit', actif: true },
  { code: '6430', libelle: 'Indemnités et avantages divers', categorie: 'Charges de personnel', nature: 'debit', actif: true, keywords: ['indemnité', 'avantage'] },

  { code: '651', libelle: 'Pertes sur créances irrécouvrables', categorie: 'Autres charges', nature: 'debit', actif: true, keywords: ['créance', 'irrécouvrable', 'perte'] },
  { code: '6593', libelle: 'Dotation pour dépréciation des stocks', categorie: 'Dotations', nature: 'debit', actif: true, keywords: ['stock', 'dépréciation', 'provision'] },
  { code: '658', libelle: 'Charges diverses', categorie: 'Autres charges', nature: 'debit', actif: true },

  { code: '661', libelle: 'Charges d\'intérêts', categorie: 'Charges financières', nature: 'debit', actif: true },
  { code: '6611', libelle: 'Intérêts des emprunts', categorie: 'Charges financières', nature: 'debit', actif: true, keywords: ['intérêt', 'emprunt'] },
  { code: '667', libelle: 'Escomptes accordés', categorie: 'Charges financières', nature: 'debit', actif: true },
  { code: '668', libelle: 'Autres charges financières', categorie: 'Charges financières', nature: 'debit', actif: true },
  { code: '676', libelle: 'Pertes de change', categorie: 'Charges financières', nature: 'debit', actif: true, keywords: ['perte', 'change', 'devise'] },

  { code: '681', libelle: 'Dotations aux amortissements', categorie: 'Dotations', nature: 'debit', actif: true, keywords: ['amortissement', 'dotation'] },
  { code: '6811', libelle: 'Dotations amortissements immobilisations incorporelles', categorie: 'Dotations', nature: 'debit', actif: true },
  { code: '6812', libelle: 'Dotations amortissements immobilisations corporelles', categorie: 'Dotations', nature: 'debit', actif: true },
  { code: '686', libelle: 'Dotations aux provisions', categorie: 'Dotations', nature: 'debit', actif: true },
  { code: '6914', libelle: 'Dotations aux dépréciations des immobilisations', categorie: 'Dotations', nature: 'debit', actif: true, keywords: ['dépréciation', 'immobilisation', 'test'] },

  // CLASSE 7 - COMPTES DE PRODUITS
  { code: '701', libelle: 'Ventes de marchandises', categorie: 'Ventes', nature: 'credit', actif: true, keywords: ['vente', 'chiffre', 'affaires'] },
  { code: '702', libelle: 'Ventes de produits finis', categorie: 'Ventes', nature: 'credit', actif: true },
  { code: '703', libelle: 'Ventes de produits intermédiaires', categorie: 'Ventes', nature: 'credit', actif: true },
  { code: '704', libelle: 'Ventes de produits résiduels', categorie: 'Ventes', nature: 'credit', actif: true },
  { code: '705', libelle: 'Travaux et services vendus', categorie: 'Ventes', nature: 'credit', actif: true, keywords: ['service', 'prestation'] },
  { code: '706', libelle: 'Autres produits et services vendus', categorie: 'Ventes', nature: 'credit', actif: true },
  { code: '706100', libelle: 'Loyers perçus', categorie: 'Produits', sousCategorie: 'Revenus locatifs', nature: 'credit', actif: true, keywords: ['loyer', 'bail', 'location', 'locataire'] },
  { code: '706200', libelle: 'Charges locatives récupérées', categorie: 'Produits', sousCategorie: 'Revenus locatifs', nature: 'credit', actif: true, keywords: ['charges', 'récupérables', 'locatives', 'refacturées'] },
  { code: '706300', libelle: 'Revenus parking', categorie: 'Produits', sousCategorie: 'Revenus locatifs', nature: 'credit', actif: true, keywords: ['parking', 'stationnement'] },
  { code: '706400', libelle: 'Droit d\'entrée - Pas de porte', categorie: 'Produits', sousCategorie: 'Revenus locatifs', nature: 'credit', actif: true, keywords: ['droit', 'entrée', 'pas de porte'] },
  { code: '706500', libelle: 'Revenus espaces publicitaires', categorie: 'Produits', sousCategorie: 'Revenus locatifs', nature: 'credit', actif: true, keywords: ['publicité', 'panneau', 'affichage', 'écran'] },
  { code: '706600', libelle: 'Revenus espaces événementiels', categorie: 'Produits', sousCategorie: 'Revenus locatifs', nature: 'credit', actif: true, keywords: ['événement', 'salon', 'exposition'] },
  { code: '706700', libelle: 'Contributions fonds marketing', categorie: 'Produits', sousCategorie: 'Revenus locatifs', nature: 'credit', actif: true, keywords: ['marketing', 'fonds', 'contribution'] },
  { code: '707', libelle: 'Produits accessoires', categorie: 'Ventes', nature: 'credit', actif: true },

  { code: '718', libelle: 'Autres produits d\'activités ordinaires', categorie: 'Autres produits', nature: 'credit', actif: true },
  { code: '719', libelle: 'Rabais, remises, ristournes accordés', categorie: 'Réductions sur ventes', nature: 'debit', actif: true },

  { code: '721', libelle: 'Production immobilisée - Immobilisations incorporelles', categorie: 'Production immobilisée', nature: 'credit', actif: true },
  { code: '722', libelle: 'Production immobilisée - Immobilisations corporelles', categorie: 'Production immobilisée', nature: 'credit', actif: true },

  { code: '731', libelle: 'Variation des stocks de produits', categorie: 'Variation de stocks', nature: 'credit', actif: true },
  { code: '734', libelle: 'Variation des stocks de produits en cours', categorie: 'Variation de stocks', nature: 'credit', actif: true },

  { code: '754', libelle: 'Produits exceptionnels sur opérations de gestion', categorie: 'Produits exceptionnels', nature: 'credit', actif: true },
  { code: '758', libelle: 'Produits exceptionnels divers', categorie: 'Produits exceptionnels', nature: 'credit', actif: true },
  { code: '771', libelle: 'Intérêts de prêts et créances', categorie: 'Produits financiers', nature: 'credit', actif: true, keywords: ['intérêt', 'créditeur', 'banque'] },
  { code: '775', libelle: 'Produits des cessions d\'immobilisations', categorie: 'Produits exceptionnels', nature: 'credit', actif: true },
  { code: '776', libelle: 'Gains de change', categorie: 'Produits financiers', nature: 'credit', actif: true, keywords: ['gain', 'change', 'devise'] },
  { code: '781', libelle: 'Reprises d\'amortissements', categorie: 'Reprises', nature: 'credit', actif: true },
  { code: '786', libelle: 'Reprises de provisions', categorie: 'Reprises', nature: 'credit', actif: true },
  { code: '7594', libelle: 'Reprises de provisions pour dépréciation des créances', categorie: 'Reprises', nature: 'credit', actif: true, keywords: ['reprise', 'provision', 'créance'] },
  { code: '7914', libelle: 'Reprises de dépréciations des immobilisations', categorie: 'Reprises', nature: 'credit', actif: true, keywords: ['reprise', 'dépréciation', 'immobilisation'] },
  { code: '791', libelle: 'Transferts de charges d\'exploitation', categorie: 'Transferts', nature: 'credit', actif: true, keywords: ['transfert', 'charges'] },

  // CLASSE 8 - COMPTES DE CHARGES ET PRODUITS HAO
  { code: '811', libelle: 'Valeurs comptables cessions immo. incorporelles', categorie: 'Valeurs comptables cessions', nature: 'debit', actif: true, keywords: ['cession', 'VNC', 'immobilisation'] },
  { code: '812', libelle: 'Valeurs comptables cessions immo. corporelles', categorie: 'Valeurs comptables cessions', nature: 'debit', actif: true },
  { code: '816', libelle: 'Valeurs comptables cessions immo. financières', categorie: 'Valeurs comptables cessions', nature: 'debit', actif: true },
  { code: '821', libelle: 'Produits des cessions d\'immobilisations incorporelles', categorie: 'Produits des cessions', nature: 'credit', actif: true, keywords: ['cession', 'produit', 'immobilisation'] },
  { code: '822', libelle: 'Produits des cessions d\'immobilisations corporelles', categorie: 'Produits des cessions', nature: 'credit', actif: true },
  { code: '826', libelle: 'Produits des cessions d\'immobilisations financières', categorie: 'Produits des cessions', nature: 'credit', actif: true },
  { code: '831', libelle: 'Charges HAO constatées', categorie: 'Charges HAO', nature: 'debit', actif: true, keywords: ['HAO', 'exceptionnel', 'charge'] },
  { code: '835', libelle: 'Dons et libéralités accordés', categorie: 'Charges HAO', nature: 'debit', actif: true, keywords: ['don', 'libéralité'] },
  { code: '838', libelle: 'Autres charges HAO', categorie: 'Charges HAO', nature: 'debit', actif: true },
  { code: '841', libelle: 'Produits HAO constatés', categorie: 'Produits HAO', nature: 'credit', actif: true, keywords: ['HAO', 'exceptionnel', 'produit'] },
  { code: '845', libelle: 'Dons et libéralités obtenus', categorie: 'Produits HAO', nature: 'credit', actif: true },
  { code: '848', libelle: 'Autres produits HAO', categorie: 'Produits HAO', nature: 'credit', actif: true },
  { code: '851', libelle: 'Dotations provisions risques HAO', categorie: 'Dotations HAO', nature: 'debit', actif: true, keywords: ['dotation', 'HAO', 'provision'] },
  { code: '852', libelle: 'Dotations dépréciations HAO', categorie: 'Dotations HAO', nature: 'debit', actif: true },
  { code: '861', libelle: 'Reprises provisions risques HAO', categorie: 'Reprises HAO', nature: 'credit', actif: true, keywords: ['reprise', 'HAO', 'provision'] },
  { code: '862', libelle: 'Reprises dépréciations HAO', categorie: 'Reprises HAO', nature: 'credit', actif: true },
  { code: '871', libelle: 'Participation légale des travailleurs', categorie: 'Participation', nature: 'debit', actif: true, keywords: ['participation', 'travailleur'] },
  { code: '891', libelle: 'Impôts sur les bénéfices', categorie: 'Impôt sur le résultat', nature: 'debit', actif: true, keywords: ['impôt', 'bénéfice', 'IS'] },
  { code: '895', libelle: 'Impôt minimum forfaitaire (IMF)', categorie: 'Impôt sur le résultat', nature: 'debit', actif: true, keywords: ['IMF', 'impôt', 'minimum'] },

  // CLASSE 9 - COMPTES ANALYTIQUES ET ENGAGEMENTS
  { code: '901', libelle: 'Engagements de financement obtenus', categorie: 'Engagements hors bilan', nature: 'debit', actif: true, keywords: ['engagement', 'financement', 'hors-bilan'] },
  { code: '902', libelle: 'Engagements de financement accordés', categorie: 'Engagements hors bilan', nature: 'credit', actif: true },
  { code: '903', libelle: 'Engagements de garantie obtenus', categorie: 'Engagements hors bilan', nature: 'debit', actif: true, keywords: ['garantie', 'engagement'] },
  { code: '904', libelle: 'Engagements de garantie accordés', categorie: 'Engagements hors bilan', nature: 'credit', actif: true },
  { code: '911', libelle: 'Comptes de reclassement bilan', categorie: 'Comptes de reclassement', nature: 'debit', actif: true },
  { code: '921', libelle: 'Centres d\'analyse principaux', categorie: 'Centres d\'analyse', nature: 'debit', actif: true, keywords: ['analytique', 'centre', 'coût'] },
  { code: '922', libelle: 'Centres d\'analyse auxiliaires', categorie: 'Centres d\'analyse', nature: 'debit', actif: true },
  { code: '931', libelle: 'Coûts matières premières', categorie: 'Coûts analytiques', nature: 'debit', actif: true, keywords: ['coût', 'matière', 'analytique'] },
  { code: '941', libelle: 'Coûts produits finis', categorie: 'Coûts analytiques', nature: 'debit', actif: true },
  { code: '971', libelle: 'Résultats analytiques', categorie: 'Résultats analytiques', nature: 'debit', actif: true, keywords: ['résultat', 'analytique'] },
  { code: '981', libelle: 'Comptes de liaison internes', categorie: 'Comptes de liaison', nature: 'debit', actif: true, keywords: ['liaison', 'interne'] }
];

export class PlanComptableService {
  static searchComptes(query: string, limit: number = 10): CompteComptable[] {
    if (!query || query.length < 1) return [];

    const normalizedQuery = query.toLowerCase().trim();

    return planComptableSYSCOHADA
      .filter(compte => {
        // Recherche par code
        if (compte.code.toLowerCase().includes(normalizedQuery)) return true;

        // Recherche par libellé
        if (compte.libelle.toLowerCase().includes(normalizedQuery)) return true;

        // Recherche par mots-clés
        if (compte.keywords?.some(keyword =>
          keyword.toLowerCase().includes(normalizedQuery)
        )) return true;

        return false;
      })
      .sort((a, b) => {
        // Priorité aux correspondances exactes de code
        if (a.code === normalizedQuery) return -1;
        if (b.code === normalizedQuery) return 1;

        // Priorité aux codes qui commencent par la recherche
        if (a.code.toLowerCase().startsWith(normalizedQuery)) return -1;
        if (b.code.toLowerCase().startsWith(normalizedQuery)) return 1;

        // Ensuite par ordre de code
        return a.code.localeCompare(b.code);
      })
      .slice(0, limit);
  }

  static getCompteByCode(code: string): CompteComptable | undefined {
    return planComptableSYSCOHADA.find(compte => compte.code === code);
  }

  static getCompteByLibelle(libelle: string): CompteComptable | undefined {
    return planComptableSYSCOHADA.find(compte =>
      compte.libelle.toLowerCase() === libelle.toLowerCase()
    );
  }

  static getAllComptes(): CompteComptable[] {
    return planComptableSYSCOHADA;
  }

  static getComptesByCategorie(categorie: string): CompteComptable[] {
    return planComptableSYSCOHADA.filter(compte => compte.categorie === categorie);
  }
}