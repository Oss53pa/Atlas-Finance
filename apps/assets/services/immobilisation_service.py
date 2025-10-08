"""
Service pour la gestion des immobilisations.
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q, Sum, Count, Avg, Max, Min
from typing import List, Dict, Any, Optional, Tuple
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from ..models import (
    Immobilisation, CategorieImmobilisation, LigneAmortissement,
    MouvementImmobilisation, InventaireImmobilisation, LigneInventaire,
    MaintenanceImmobilisation, ContratImmobilisation
)
from apps.accounting.models import Ecriture, Journal
from apps.core.models import Societe, AuditLog


class ImmobilisationService:
    """Service de gestion des immobilisations."""
    
    def create_immobilisation(self, data: Dict[str, Any], user) -> Immobilisation:
        """
        Crée une nouvelle immobilisation.
        
        Args:
            data: Données de l'immobilisation
            user: Utilisateur créateur
            
        Returns:
            Immobilisation: L'immobilisation créée
        """
        with transaction.atomic():
            # Validation des données
            self._validate_immobilisation_data(data)
            
            # Génération automatique du numéro si non fourni
            if not data.get('numero'):
                data['numero'] = self._generate_numero_immobilisation(
                    data['societe'], 
                    data['categorie']
                )
            
            # Configuration automatique de l'amortissement depuis la catégorie
            categorie = data['categorie']
            if not data.get('duree_amortissement'):
                data['duree_amortissement'] = categorie.duree_amortissement_defaut * 12  # Conversion en mois
            
            if not data.get('methode_amortissement'):
                data['methode_amortissement'] = categorie.methode_amortissement_defaut
            
            # Calcul automatique du taux d'amortissement
            if data.get('duree_amortissement') and not data.get('taux_amortissement'):
                data['taux_amortissement'] = Decimal('1200') / Decimal(str(data['duree_amortissement']))
            
            # Calcul de la base d'amortissement
            valeur_brute = data['valeur_acquisition'] + data.get('frais_acquisition', 0)
            data['base_amortissement'] = valeur_brute - data.get('valeur_residuelle', 0)
            
            # Création de l'immobilisation
            immobilisation = Immobilisation.objects.create(
                societe=data['societe'],
                categorie=data['categorie'],
                fournisseur=data.get('fournisseur'),
                numero=data['numero'],
                code_barre=data.get('code_barre'),
                numero_serie=data.get('numero_serie'),
                numero_inventaire=data.get('numero_inventaire'),
                libelle=data['libelle'],
                description=data.get('description'),
                marque=data.get('marque'),
                modele=data.get('modele'),
                site=data.get('site'),
                batiment=data.get('batiment'),
                etage=data.get('etage'),
                bureau=data.get('bureau'),
                coordonnees_gps=data.get('coordonnees_gps'),
                responsable=data.get('responsable'),
                service=data.get('service'),
                devise=data['devise'],
                valeur_acquisition=data['valeur_acquisition'],
                valeur_acquisition_devise=data.get('valeur_acquisition_devise'),
                taux_change_acquisition=data.get('taux_change_acquisition'),
                frais_acquisition=data.get('frais_acquisition', 0),
                valeur_residuelle=data.get('valeur_residuelle', 0),
                date_acquisition=data['date_acquisition'],
                date_mise_en_service=data.get('date_mise_en_service'),
                date_fin_garantie=data.get('date_fin_garantie'),
                facture_numero=data.get('facture_numero'),
                facture_date=data.get('facture_date'),
                bon_commande=data.get('bon_commande'),
                statut=data.get('statut', 'EN_COURS'),
                etat=data.get('etat', 'BON'),
                amortissable=data.get('amortissable', True),
                duree_amortissement=data['duree_amortissement'],
                methode_amortissement=data['methode_amortissement'],
                taux_amortissement=data['taux_amortissement'],
                base_amortissement=data['base_amortissement'],
                centre_cout=data.get('centre_cout'),
                axe_analytique=data.get('axe_analytique', {}),
                observations=data.get('observations'),
                tags=data.get('tags', []),
                created_by=user
            )
            
            # Calcul de la date de fin d'amortissement
            if immobilisation.amortissable and immobilisation.date_mise_en_service:
                immobilisation.date_fin_amortissement = (
                    immobilisation.date_mise_en_service + 
                    relativedelta(months=immobilisation.duree_amortissement)
                )
                immobilisation.save(update_fields=['date_fin_amortissement'])
            
            # Mise à jour de la valeur nette initiale
            immobilisation.valeur_nette_comptable = immobilisation.valeur_brute
            immobilisation.save(update_fields=['valeur_nette_comptable'])
            
            # Création du mouvement d'acquisition
            self._create_mouvement_acquisition(immobilisation, user)
            
            # Création de l'écriture comptable d'acquisition
            if data.get('generer_ecriture', True):
                self._create_ecriture_acquisition(immobilisation, user)
            
            # Génération du plan d'amortissement si applicable
            if immobilisation.amortissable and immobilisation.date_mise_en_service:
                self.generer_plan_amortissement(immobilisation, user)
            
            # Log d'audit
            AuditLog.objects.create(
                table_name='Immobilisation',
                operation='CREATE',
                record_id=str(immobilisation.id),
                old_values={},
                new_values=self._immobilisation_to_dict(immobilisation),
                user=user,
                timestamp=timezone.now()
            )
            
            return immobilisation
    
    def mettre_en_service(self, immobilisation: Immobilisation, date_service: date, user) -> Immobilisation:
        """
        Met une immobilisation en service.
        
        Args:
            immobilisation: Immobilisation à mettre en service
            date_service: Date de mise en service
            user: Utilisateur
            
        Returns:
            Immobilisation: L'immobilisation mise à jour
        """
        if immobilisation.statut != 'EN_COURS':
            raise ValidationError("Seules les immobilisations en cours peuvent être mises en service")
        
        if date_service < immobilisation.date_acquisition:
            raise ValidationError("La date de mise en service ne peut pas être antérieure à l'acquisition")
        
        old_values = self._immobilisation_to_dict(immobilisation)
        
        with transaction.atomic():
            immobilisation.date_mise_en_service = date_service
            immobilisation.statut = 'EN_SERVICE'
            
            # Calcul de la date de fin d'amortissement
            if immobilisation.amortissable:
                immobilisation.date_fin_amortissement = (
                    date_service + relativedelta(months=immobilisation.duree_amortissement)
                )
            
            immobilisation.updated_by = user
            immobilisation.save()
            
            # Création du mouvement
            MouvementImmobilisation.objects.create(
                immobilisation=immobilisation,
                type_mouvement='MISE_SERVICE',
                date_mouvement=date_service,
                libelle=f"Mise en service de l'immobilisation {immobilisation.numero}",
                valeur_avant=0,
                valeur_apres=immobilisation.valeur_brute,
                montant_mouvement=immobilisation.valeur_brute,
                created_by=user
            )
            
            # Génération du plan d'amortissement
            if immobilisation.amortissable:
                self.generer_plan_amortissement(immobilisation, user)
            
            # Log d'audit
            AuditLog.objects.create(
                table_name='Immobilisation',
                operation='MISE_SERVICE',
                record_id=str(immobilisation.id),
                old_values=old_values,
                new_values=self._immobilisation_to_dict(immobilisation),
                user=user,
                timestamp=timezone.now()
            )
            
            return immobilisation
    
    def generer_plan_amortissement(self, immobilisation: Immobilisation, user) -> List[LigneAmortissement]:
        """
        Génère le plan d'amortissement théorique d'une immobilisation.
        
        Args:
            immobilisation: Immobilisation concernée
            user: Utilisateur
            
        Returns:
            List[LigneAmortissement]: Lignes d'amortissement générées
        """
        if not immobilisation.amortissable or not immobilisation.date_mise_en_service:
            return []
        
        # Suppression des lignes existantes prévisionnelles
        immobilisation.lignes_amortissement.filter(statut='PREVISIONNEL').delete()
        
        lignes = []
        date_debut = immobilisation.date_mise_en_service
        cumul_amortissement = Decimal('0')
        
        # Génération pour chaque mois
        for mois in range(immobilisation.duree_amortissement):
            date_fin = date_debut + relativedelta(months=1) - timedelta(days=1)
            exercice = date_debut.year
            periode = date_debut.strftime('%Y-%m')
            
            # Calcul de l'amortissement mensuel
            if immobilisation.methode_amortissement == 'LINEAIRE':
                montant_mensuel = immobilisation.base_amortissement / immobilisation.duree_amortissement
            else:
                # Autres méthodes à implémenter
                montant_mensuel = immobilisation.base_amortissement / immobilisation.duree_amortissement
            
            # Ajustement pour le dernier mois
            if mois == immobilisation.duree_amortissement - 1:
                montant_mensuel = immobilisation.base_amortissement - cumul_amortissement
            
            cumul_amortissement += montant_mensuel
            valeur_nette = immobilisation.valeur_brute - cumul_amortissement
            
            ligne = LigneAmortissement.objects.create(
                immobilisation=immobilisation,
                exercice=exercice,
                periode=periode,
                date_debut=date_debut,
                date_fin=date_fin,
                base_amortissement=immobilisation.base_amortissement,
                taux_applique=immobilisation.taux_amortissement,
                montant_amortissement=montant_mensuel,
                cumul_amortissement=cumul_amortissement,
                valeur_nette_fin=valeur_nette,
                statut='PREVISIONNEL',
                created_by=user
            )
            
            lignes.append(ligne)
            date_debut = date_fin + timedelta(days=1)
        
        return lignes
    
    def calculer_amortissement_periode(self, immobilisation: Immobilisation, 
                                     exercice: int, periode: str, user) -> LigneAmortissement:
        """
        Calcule et enregistre l'amortissement pour une période.
        
        Args:
            immobilisation: Immobilisation concernée
            exercice: Exercice comptable
            periode: Période (format YYYY-MM)
            user: Utilisateur
            
        Returns:
            LigneAmortissement: Ligne d'amortissement créée ou mise à jour
        """
        # Recherche de la ligne prévisionnelle
        ligne_prev = immobilisation.lignes_amortissement.filter(
            periode=periode,
            statut='PREVISIONNEL'
        ).first()
        
        if not ligne_prev:
            raise ValidationError(f"Aucune ligne d'amortissement prévisionnelle pour la période {periode}")
        
        with transaction.atomic():
            # Passage de prévisionnel à réalisé
            ligne_prev.statut = 'REALISE'
            ligne_prev.save()
            
            # Création de l'écriture comptable
            ecriture = self._create_ecriture_amortissement(immobilisation, ligne_prev, user)
            ligne_prev.ecriture_comptable = ecriture
            ligne_prev.save()
            
            # Mise à jour de la valeur nette comptable
            immobilisation.mettre_a_jour_valeur_nette()
            
            return ligne_prev
    
    def ceder_immobilisation(self, immobilisation: Immobilisation, data: Dict[str, Any], user) -> Immobilisation:
        """
        Effectue la cession d'une immobilisation.
        
        Args:
            immobilisation: Immobilisation à céder
            data: Données de la cession (prix, date, acquéreur, etc.)
            user: Utilisateur
            
        Returns:
            Immobilisation: L'immobilisation cédée
        """
        if immobilisation.statut not in ['EN_SERVICE', 'HORS_SERVICE']:
            raise ValidationError("Seules les immobilisations en service peuvent être cédées")
        
        date_cession = data['date_cession']
        prix_cession = data['prix_cession']
        acquéreur = data.get('acquereur')
        
        old_values = self._immobilisation_to_dict(immobilisation)
        
        with transaction.atomic():
            # Calcul de l'amortissement jusqu'à la date de cession
            self._calculer_amortissement_jusqu_date(immobilisation, date_cession, user)
            
            # Mise à jour du statut
            immobilisation.statut = 'CEDE'
            immobilisation.updated_by = user
            immobilisation.save()
            
            # Calcul de la plus/moins-value
            valeur_nette = immobilisation.valeur_nette_comptable
            plus_moins_value = prix_cession - valeur_nette
            
            # Création du mouvement de cession
            MouvementImmobilisation.objects.create(
                immobilisation=immobilisation,
                type_mouvement='CESSION',
                date_mouvement=date_cession,
                libelle=f"Cession de l'immobilisation {immobilisation.numero}",
                description=f"Cession à {acquéreur}" if acquéreur else None,
                valeur_avant=valeur_nette,
                valeur_apres=0,
                montant_mouvement=prix_cession,
                reference_externe=data.get('reference_facture'),
                created_by=user
            )
            
            # Création de l'écriture comptable de cession
            if data.get('generer_ecriture', True):
                self._create_ecriture_cession(immobilisation, prix_cession, plus_moins_value, user)
            
            # Log d'audit
            AuditLog.objects.create(
                table_name='Immobilisation',
                operation='CESSION',
                record_id=str(immobilisation.id),
                old_values=old_values,
                new_values=self._immobilisation_to_dict(immobilisation),
                user=user,
                timestamp=timezone.now()
            )
            
            return immobilisation
    
    def effectuer_inventaire(self, inventaire: InventaireImmobilisation, user) -> Dict[str, Any]:
        """
        Lance un inventaire physique des immobilisations.
        
        Args:
            inventaire: Inventaire à effectuer
            user: Utilisateur
            
        Returns:
            Dict: Résultats de l'inventaire
        """
        # Sélection des immobilisations à inventorier
        immobilisations_query = Immobilisation.objects.filter(
            societe=inventaire.societe,
            statut__in=['EN_SERVICE', 'HORS_SERVICE']
        )
        
        # Filtrage par catégories si spécifié
        if inventaire.categories.exists():
            immobilisations_query = immobilisations_query.filter(
                categorie__in=inventaire.categories.all()
            )
        
        # Filtrage par sites si spécifié
        if inventaire.sites:
            immobilisations_query = immobilisations_query.filter(
                site__in=inventaire.sites
            )
        
        # Filtrage par responsables si spécifié
        if inventaire.responsables.exists():
            immobilisations_query = immobilisations_query.filter(
                responsable__in=inventaire.responsables.all()
            )
        
        immobilisations = immobilisations_query.select_related('categorie', 'responsable')
        
        with transaction.atomic():
            # Suppression des lignes existantes
            inventaire.lignes.all().delete()
            
            # Création des lignes d'inventaire
            lignes_creees = 0
            for immobilisation in immobilisations:
                LigneInventaire.objects.create(
                    inventaire=inventaire,
                    immobilisation=immobilisation,
                    localisation_theorique=f"{immobilisation.site} - {immobilisation.batiment} - {immobilisation.bureau}".strip(' -'),
                    responsable_theorique=immobilisation.responsable,
                    etat_theorique=immobilisation.etat,
                    statut='NON_INVENTORIE',
                    created_by=user
                )
                lignes_creees += 1
            
            # Mise à jour des statistiques
            inventaire.nb_immobilisations_prevues = lignes_creees
            inventaire.save()
        
        return {
            'nb_lignes_creees': lignes_creees,
            'inventaire_id': inventaire.id
        }
    
    def analyser_immobilisations(self, societe: Societe, date_analyse: date = None) -> Dict[str, Any]:
        """
        Analyse du parc d'immobilisations.
        
        Args:
            societe: Société concernée
            date_analyse: Date d'analyse (défaut: aujourd'hui)
            
        Returns:
            Dict: Analyse complète du parc
        """
        if not date_analyse:
            date_analyse = date.today()
        
        immobilisations = Immobilisation.objects.filter(societe=societe)
        
        # Statistiques générales
        stats_generales = {
            'nb_total': immobilisations.count(),
            'nb_en_service': immobilisations.filter(statut='EN_SERVICE').count(),
            'nb_hors_service': immobilisations.filter(statut='HORS_SERVICE').count(),
            'nb_en_cours': immobilisations.filter(statut='EN_COURS').count(),
            'nb_cedes': immobilisations.filter(statut='CEDE').count()
        }
        
        # Valeurs
        valeurs = immobilisations.aggregate(
            valeur_brute_totale=Sum('valeur_acquisition') + Sum('frais_acquisition'),
            valeur_nette_totale=Sum('valeur_nette_comptable'),
            valeur_residuelle_totale=Sum('valeur_residuelle')
        )
        
        # Répartition par catégorie
        repartition_categories = []
        categories = CategorieImmobilisation.objects.filter(societe=societe)
        
        for categorie in categories:
            immos_cat = immobilisations.filter(categorie=categorie)
            if immos_cat.exists():
                cat_stats = immos_cat.aggregate(
                    nb_immobilisations=Count('id'),
                    valeur_brute=Sum('valeur_acquisition') + Sum('frais_acquisition'),
                    valeur_nette=Sum('valeur_nette_comptable')
                )
                
                repartition_categories.append({
                    'categorie': {
                        'code': categorie.code,
                        'libelle': categorie.libelle,
                        'type': categorie.type_immobilisation
                    },
                    'nb_immobilisations': cat_stats['nb_immobilisations'],
                    'valeur_brute': float(cat_stats['valeur_brute'] or 0),
                    'valeur_nette': float(cat_stats['valeur_nette'] or 0)
                })
        
        # Immobilisations par âge
        immobilisations_avec_age = []
        for immo in immobilisations.filter(date_mise_en_service__isnull=False)[:100]:  # Limite pour performance
            age_mois = immo.age_en_mois
            immobilisations_avec_age.append({
                'numero': immo.numero,
                'libelle': immo.libelle,
                'date_mise_en_service': immo.date_mise_en_service.isoformat(),
                'age_mois': age_mois,
                'age_annees': round(age_mois / 12, 1),
                'valeur_nette': float(immo.valeur_nette_comptable)
            })
        
        # Amortissements de l'exercice
        exercice_courant = date_analyse.year
        amortissements_exercice = LigneAmortissement.objects.filter(
            immobilisation__societe=societe,
            exercice=exercice_courant,
            statut='REALISE'
        ).aggregate(
            montant_total=Sum('montant_amortissement')
        )
        
        # Alertes
        alertes = self._detecter_alertes_immobilisations(societe, date_analyse)
        
        return {
            'date_analyse': date_analyse.isoformat(),
            'statistiques_generales': stats_generales,
            'valeurs': {
                'valeur_brute_totale': float(valeurs['valeur_brute_totale'] or 0),
                'valeur_nette_totale': float(valeurs['valeur_nette_totale'] or 0),
                'valeur_residuelle_totale': float(valeurs['valeur_residuelle_totale'] or 0),
                'taux_amortissement_moyen': round(
                    (1 - (valeurs['valeur_nette_totale'] or 0) / (valeurs['valeur_brute_totale'] or 1)) * 100, 2
                )
            },
            'repartition_categories': repartition_categories,
            'immobilisations_par_age': immobilisations_avec_age,
            'amortissements_exercice': {
                'exercice': exercice_courant,
                'montant_total': float(amortissements_exercice['montant_total'] or 0)
            },
            'alertes': alertes
        }
    
    def _validate_immobilisation_data(self, data: Dict[str, Any]) -> None:
        """Valide les données d'une immobilisation."""
        required_fields = ['societe', 'categorie', 'libelle', 'devise', 'valeur_acquisition', 'date_acquisition']
        
        for field in required_fields:
            if field not in data or not data[field]:
                raise ValidationError(f"Le champ '{field}' est requis")
        
        # Validation des montants
        if data['valeur_acquisition'] <= 0:
            raise ValidationError("La valeur d'acquisition doit être positive")
        
        if data.get('valeur_residuelle', 0) >= data['valeur_acquisition']:
            raise ValidationError("La valeur résiduelle doit être inférieure à la valeur d'acquisition")
        
        # Validation des dates
        if data.get('date_mise_en_service') and data['date_mise_en_service'] < data['date_acquisition']:
            raise ValidationError("La date de mise en service ne peut pas être antérieure à l'acquisition")
    
    def _generate_numero_immobilisation(self, societe: Societe, categorie: CategorieImmobilisation) -> str:
        """Génère un numéro automatique pour une immobilisation."""
        # Recherche du dernier numéro utilisé pour cette catégorie
        prefix = f"{categorie.code}-"
        
        last_immobilisation = Immobilisation.objects.filter(
            societe=societe,
            numero__startswith=prefix
        ).order_by('-numero').first()
        
        if last_immobilisation:
            try:
                last_num = int(last_immobilisation.numero.replace(prefix, ''))
                next_num = last_num + 1
            except ValueError:
                next_num = 1
        else:
            next_num = 1
        
        return f"{prefix}{next_num:06d}"
    
    def _create_mouvement_acquisition(self, immobilisation: Immobilisation, user) -> MouvementImmobilisation:
        """Crée le mouvement d'acquisition."""
        return MouvementImmobilisation.objects.create(
            immobilisation=immobilisation,
            type_mouvement='ACQUISITION',
            date_mouvement=immobilisation.date_acquisition,
            libelle=f"Acquisition de l'immobilisation {immobilisation.numero}",
            valeur_avant=0,
            valeur_apres=immobilisation.valeur_brute,
            montant_mouvement=immobilisation.valeur_brute,
            reference_externe=immobilisation.facture_numero,
            piece_justificative=immobilisation.facture_numero,
            created_by=user
        )
    
    def _create_ecriture_acquisition(self, immobilisation: Immobilisation, user) -> Ecriture:
        """Crée l'écriture comptable d'acquisition."""
        # Recherche du journal d'immobilisations
        journal = Journal.objects.filter(
            type='OD',
            societe=immobilisation.societe,
            is_active=True
        ).first()
        
        if not journal:
            raise ValidationError("Aucun journal d'opérations diverses trouvé")
        
        # Données de l'écriture
        ecriture_data = {
            'journal': journal.code,
            'date_ecriture': immobilisation.date_acquisition,
            'libelle': f"Acquisition {immobilisation.libelle}",
            'reference_externe': immobilisation.facture_numero,
            'lignes': [
                {
                    'compte': immobilisation.categorie.compte_immobilisation.code,
                    'libelle': f"Acquisition {immobilisation.libelle}",
                    'debit': float(immobilisation.valeur_brute),
                    'credit': 0
                }
            ]
        }
        
        # Contrepartie (fournisseur ou autre)
        if immobilisation.fournisseur and immobilisation.fournisseur.compte_fournisseur:
            compte_contrepartie = immobilisation.fournisseur.compte_fournisseur.code
        else:
            # Compte de fournisseur générique
            compte_contrepartie = '401'  # À adapter selon le plan comptable
        
        ecriture_data['lignes'].append({
            'compte': compte_contrepartie,
            'tiers': immobilisation.fournisseur.code if immobilisation.fournisseur else None,
            'libelle': f"Facture {immobilisation.facture_numero}" if immobilisation.facture_numero else "Acquisition immobilisation",
            'debit': 0,
            'credit': float(immobilisation.valeur_brute)
        })
        
        # Création via le service comptable
        from apps.accounting.services import EcritureService
        ecriture_service = EcritureService()
        
        return ecriture_service.create_ecriture(ecriture_data)
    
    def _create_ecriture_amortissement(self, immobilisation: Immobilisation, 
                                     ligne_amort: LigneAmortissement, user) -> Ecriture:
        """Crée l'écriture comptable d'amortissement."""
        if not immobilisation.categorie.compte_amortissement or not immobilisation.categorie.compte_dotation:
            raise ValidationError("Les comptes d'amortissement ne sont pas configurés pour cette catégorie")
        
        # Recherche du journal d'OD
        journal = Journal.objects.filter(
            type='OD',
            societe=immobilisation.societe,
            is_active=True
        ).first()
        
        if not journal:
            raise ValidationError("Aucun journal d'opérations diverses trouvé")
        
        # Données de l'écriture
        ecriture_data = {
            'journal': journal.code,
            'date_ecriture': ligne_amort.date_fin,
            'libelle': f"Amortissement {immobilisation.libelle} - {ligne_amort.periode}",
            'lignes': [
                {
                    'compte': immobilisation.categorie.compte_dotation.code,
                    'libelle': f"Dotation amortissement {immobilisation.libelle}",
                    'debit': float(ligne_amort.montant_amortissement),
                    'credit': 0,
                    'analytique': immobilisation.axe_analytique
                },
                {
                    'compte': immobilisation.categorie.compte_amortissement.code,
                    'libelle': f"Amortissement {immobilisation.libelle}",
                    'debit': 0,
                    'credit': float(ligne_amort.montant_amortissement)
                }
            ]
        }
        
        # Création via le service comptable
        from apps.accounting.services import EcritureService
        ecriture_service = EcritureService()
        
        return ecriture_service.create_ecriture(ecriture_data)
    
    def _create_ecriture_cession(self, immobilisation: Immobilisation, prix_cession: Decimal,
                               plus_moins_value: Decimal, user) -> Ecriture:
        """Crée l'écriture comptable de cession."""
        # Journal d'OD
        journal = Journal.objects.filter(
            type='OD',
            societe=immobilisation.societe,
            is_active=True
        ).first()
        
        if not journal:
            raise ValidationError("Aucun journal d'opérations diverses trouvé")
        
        # Calcul des montants
        cumul_amortissement = immobilisation.lignes_amortissement.filter(
            statut='REALISE'
        ).aggregate(
            total=Sum('montant_amortissement')
        )['total'] or Decimal('0')
        
        # Lignes de base de l'écriture
        lignes = [
            # Créance sur cession
            {
                'compte': '475',  # Créances sur cessions d'immobilisations
                'libelle': f"Cession {immobilisation.libelle}",
                'debit': float(prix_cession),
                'credit': 0
            },
            # Sortie du cumul d'amortissement
            {
                'compte': immobilisation.categorie.compte_amortissement.code,
                'libelle': f"Reprise amortissement {immobilisation.libelle}",
                'debit': float(cumul_amortissement),
                'credit': 0
            },
            # Sortie de l'immobilisation
            {
                'compte': immobilisation.categorie.compte_immobilisation.code,
                'libelle': f"Sortie {immobilisation.libelle}",
                'debit': 0,
                'credit': float(immobilisation.valeur_brute)
            }
        ]
        
        # Plus ou moins-value
        if plus_moins_value > 0:
            lignes.append({
                'compte': '752',  # Plus-values des cessions courantes
                'libelle': f"Plus-value cession {immobilisation.libelle}",
                'debit': 0,
                'credit': float(plus_moins_value)
            })
        elif plus_moins_value < 0:
            lignes.append({
                'compte': '652',  # Moins-values des cessions courantes
                'libelle': f"Moins-value cession {immobilisation.libelle}",
                'debit': float(-plus_moins_value),
                'credit': 0
            })
        
        ecriture_data = {
            'journal': journal.code,
            'date_ecriture': date.today(),
            'libelle': f"Cession {immobilisation.libelle}",
            'lignes': lignes
        }
        
        # Création via le service comptable
        from apps.accounting.services import EcritureService
        ecriture_service = EcritureService()
        
        return ecriture_service.create_ecriture(ecriture_data)
    
    def _calculer_amortissement_jusqu_date(self, immobilisation: Immobilisation, 
                                         date_limite: date, user) -> None:
        """Calcule l'amortissement jusqu'à une date donnée."""
        # Recherche des lignes prévisionnelles jusqu'à la date
        lignes_a_realiser = immobilisation.lignes_amortissement.filter(
            date_fin__lte=date_limite,
            statut='PREVISIONNEL'
        ).order_by('date_fin')
        
        for ligne in lignes_a_realiser:
            ligne.statut = 'REALISE'
            
            # Création de l'écriture comptable
            ecriture = self._create_ecriture_amortissement(immobilisation, ligne, user)
            ligne.ecriture_comptable = ecriture
            ligne.save()
        
        # Mise à jour de la valeur nette
        immobilisation.mettre_a_jour_valeur_nette()
    
    def _detecter_alertes_immobilisations(self, societe: Societe, date_ref: date) -> List[Dict]:
        """Détecte les alertes sur les immobilisations."""
        alertes = []
        
        # Contrats arrivant à échéance
        contrats_expiration = ContratImmobilisation.objects.filter(
            immobilisation__societe=societe,
            statut='EN_COURS',
            date_fin__lte=date_ref + timedelta(days=30),
            alerte_expiration=True
        )
        
        for contrat in contrats_expiration:
            alertes.append({
                'type': 'CONTRAT_EXPIRATION',
                'niveau': 'WARNING',
                'immobilisation': contrat.immobilisation.numero,
                'message': f"Contrat {contrat.numero_contrat} expire le {contrat.date_fin}",
                'date_echeance': contrat.date_fin.isoformat(),
                'jours_restants': contrat.jours_avant_expiration
            })
        
        # Maintenances en retard
        maintenances_retard = MaintenanceImmobilisation.objects.filter(
            immobilisation__societe=societe,
            statut='PLANIFIEE',
            date_prevue__lt=date_ref
        )
        
        for maintenance in maintenances_retard:
            alertes.append({
                'type': 'MAINTENANCE_RETARD',
                'niveau': 'ERROR',
                'immobilisation': maintenance.immobilisation.numero,
                'message': f"Maintenance en retard: {maintenance.libelle}",
                'date_prevue': maintenance.date_prevue.isoformat(),
                'jours_retard': (date_ref - maintenance.date_prevue).days
            })
        
        # Immobilisations sans responsable
        immos_sans_responsable = Immobilisation.objects.filter(
            societe=societe,
            statut='EN_SERVICE',
            responsable__isnull=True
        ).count()
        
        if immos_sans_responsable > 0:
            alertes.append({
                'type': 'SANS_RESPONSABLE',
                'niveau': 'WARNING',
                'message': f"{immos_sans_responsable} immobilisation(s) sans responsable",
                'nb_immobilisations': immos_sans_responsable
            })
        
        return alertes
    
    def _immobilisation_to_dict(self, immobilisation: Immobilisation) -> Dict[str, Any]:
        """Convertit une immobilisation en dictionnaire pour l'audit."""
        return {
            'numero': immobilisation.numero,
            'libelle': immobilisation.libelle,
            'categorie': immobilisation.categorie.libelle,
            'valeur_acquisition': float(immobilisation.valeur_acquisition),
            'statut': immobilisation.statut,
            'date_acquisition': immobilisation.date_acquisition.isoformat(),
            'date_mise_en_service': immobilisation.date_mise_en_service.isoformat() if immobilisation.date_mise_en_service else None
        }