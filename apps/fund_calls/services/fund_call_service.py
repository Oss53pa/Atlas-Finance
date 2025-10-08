from django.db import transaction, models
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, date, timedelta
import logging

from ..models import (
    TypeAppelFonds, CampagneAppelFonds, AppelFonds, 
    VersementFonds, RelanceFonds, GarantieFonds, StatutAppelFonds
)
from ...core.models import Societe, Exercice
from ...core.services.base_service import BaseService
from ...third_party.models import Tiers
from ...accounting.models import Ecriture, LigneEcriture, Journal, CompteComptable

logger = logging.getLogger(__name__)

class FundCallService(BaseService):
    """
    Service pour la gestion des appels de fonds.
    Gère les campagnes, appels individuels, versements et relances.
    """
    
    def __init__(self, societe: Societe):
        super().__init__(societe)
        self.societe = societe
    
    def creer_campagne_appel_fonds(
        self,
        type_appel_fonds_id: int,
        exercice: Exercice,
        libelle: str,
        montant_total_prevu: Decimal,
        date_debut: date,
        date_fin_prevue: date,
        taux_interet: Decimal = Decimal('0'),
        duree_remboursement: int = 365,
        **kwargs
    ) -> CampagneAppelFonds:
        """
        Crée une nouvelle campagne d'appel de fonds.
        """
        try:
            with transaction.atomic():
                type_appel = TypeAppelFonds.objects.get(
                    id=type_appel_fonds_id,
                    societe=self.societe
                )
                
                campagne = CampagneAppelFonds.objects.create(
                    societe=self.societe,
                    exercice=exercice,
                    type_appel_fonds=type_appel,
                    libelle=libelle,
                    montant_total_prevu=montant_total_prevu,
                    date_debut=date_debut,
                    date_fin_prevue=date_fin_prevue,
                    taux_interet=taux_interet,
                    duree_remboursement=duree_remboursement,
                    description=kwargs.get('description', ''),
                    modalites_remboursement=kwargs.get('modalites_remboursement', ''),
                    conditions_particulieres=kwargs.get('conditions_particulieres', {}),
                    documents_requis=kwargs.get('documents_requis', [])
                )
                
                logger.info(f"Campagne d'appel de fonds {campagne.numero_campagne} créée")
                return campagne
                
        except Exception as e:
            logger.error(f"Erreur création campagne: {str(e)}")
            raise ValidationError(f"Impossible de créer la campagne: {str(e)}")
    
    def generer_appels_automatiques(
        self,
        campagne: CampagneAppelFonds,
        criteres_selection: Dict[str, Any],
        repartition_mode: str = 'EGAL',
        montant_individuel: Optional[Decimal] = None
    ) -> List[AppelFonds]:
        """
        Génère automatiquement les appels de fonds individuels pour une campagne.
        """
        try:
            with transaction.atomic():
                # Sélectionner les tiers selon les critères
                tiers_eligibles = self._selectionner_tiers_eligibles(criteres_selection)
                
                if not tiers_eligibles:
                    raise ValidationError("Aucun tiers éligible trouvé")
                
                appels_crees = []
                
                # Calculer les montants selon le mode de répartition
                montants = self._calculer_repartition_montants(
                    campagne.montant_total_prevu,
                    tiers_eligibles,
                    repartition_mode,
                    montant_individuel
                )
                
                for tiers, montant in zip(tiers_eligibles, montants):
                    # Calculer les dates limites
                    date_limite_reponse = campagne.date_debut + timedelta(days=30)  # Par défaut 30 jours
                    date_versement_souhaite = date_limite_reponse + timedelta(days=15)
                    
                    appel = AppelFonds.objects.create(
                        societe=self.societe,
                        campagne=campagne,
                        tiers=tiers,
                        montant_appele=montant,
                        date_appel=campagne.date_debut,
                        date_limite_reponse=date_limite_reponse,
                        date_versement_souhaite=date_versement_souhaite,
                        priorite='NORMALE',
                        taux_interet_specifique=None  # Utilise le taux de campagne
                    )
                    
                    appels_crees.append(appel)
                
                # Mettre à jour le montant total appelé de la campagne
                campagne.montant_total_appele = sum(montants)
                campagne.save()
                
                logger.info(f"Génération automatique: {len(appels_crees)} appels créés pour la campagne {campagne.numero_campagne}")
                return appels_crees
                
        except Exception as e:
            logger.error(f"Erreur génération automatique appels: {str(e)}")
            raise ValidationError(f"Impossible de générer les appels: {str(e)}")
    
    def envoyer_appel_fonds(
        self,
        appel_id: int,
        mode_envoi: str = 'EMAIL',
        destinataires_cc: List[str] = None,
        message_personnalise: str = ''
    ) -> bool:
        """
        Envoie un appel de fonds à un tiers.
        """
        try:
            with transaction.atomic():
                appel = AppelFonds.objects.get(id=appel_id, societe=self.societe)
                
                if appel.statut != 'BROUILLON':
                    raise ValidationError("Seuls les appels en brouillon peuvent être envoyés")
                
                # Préparer les données d'envoi
                donnees_envoi = self._preparer_donnees_envoi(appel, message_personnalise)
                
                # Simuler l'envoi (à intégrer avec un service d'email réel)
                success = self._executer_envoi(appel, mode_envoi, donnees_envoi, destinataires_cc)
                
                if success:
                    # Changer le statut
                    self._changer_statut_appel(appel, 'ENVOYE', "Appel de fonds envoyé")
                    
                    logger.info(f"Appel de fonds {appel.numero_appel} envoyé avec succès")
                    return True
                else:
                    logger.error(f"Échec envoi appel {appel.numero_appel}")
                    return False
                
        except Exception as e:
            logger.error(f"Erreur envoi appel de fonds: {str(e)}")
            raise ValidationError(f"Impossible d'envoyer l'appel: {str(e)}")
    
    def enregistrer_versement(
        self,
        appel_id: int,
        montant_verse: Decimal,
        date_versement: date,
        mode_versement: str,
        reference_externe: str = '',
        compte_origine: str = '',
        description: str = '',
        creer_ecriture: bool = True
    ) -> VersementFonds:
        """
        Enregistre un versement de fonds.
        """
        try:
            with transaction.atomic():
                appel = AppelFonds.objects.get(id=appel_id, societe=self.societe)
                
                # Validation du montant
                if montant_verse <= 0:
                    raise ValidationError("Le montant versé doit être positif")
                
                if appel.montant_verse + montant_verse > appel.montant_appele:
                    raise ValidationError("Le montant total versé dépasse le montant appelé")
                
                # Déterminer le type de versement
                type_versement = self._determiner_type_versement(appel, montant_verse)
                
                # Créer le versement
                versement = VersementFonds.objects.create(
                    societe=self.societe,
                    appel_fonds=appel,
                    montant_verse=montant_verse,
                    date_versement=date_versement,
                    type_versement=type_versement,
                    mode_versement=mode_versement,
                    reference_externe=reference_externe,
                    compte_origine=compte_origine,
                    description=description,
                    statut='RECU'
                )
                
                # Créer l'écriture comptable si demandé
                if creer_ecriture:
                    ecriture = self._creer_ecriture_versement(versement)
                    versement.ecriture_comptable = ecriture
                    versement.statut = 'COMPTABILISE'
                    versement.date_comptabilisation = date_versement
                    versement.save()
                
                # Mettre à jour l'appel de fonds
                self._mettre_a_jour_appel_versement(appel, versement)
                
                logger.info(f"Versement {versement.numero_versement} enregistré pour {montant_verse}€")
                return versement
                
        except Exception as e:
            logger.error(f"Erreur enregistrement versement: {str(e)}")
            raise ValidationError(f"Impossible d'enregistrer le versement: {str(e)}")
    
    def generer_relances_automatiques(
        self,
        campagne_id: Optional[int] = None,
        jours_retard_min: int = 7
    ) -> List[RelanceFonds]:
        """
        Génère automatiquement les relances pour les appels en retard.
        """
        try:
            relances_creees = []
            
            # Filtrer les appels en retard
            appels_query = AppelFonds.objects.filter(
                societe=self.societe,
                statut__in=['ENVOYE', 'ACCEPTE', 'PARTIELLEMENT_VERSE']
            )
            
            if campagne_id:
                appels_query = appels_query.filter(campagne_id=campagne_id)
            
            date_limite = timezone.now().date() - timedelta(days=jours_retard_min)
            appels_en_retard = appels_query.filter(date_limite_reponse__lt=date_limite)
            
            for appel in appels_en_retard:
                # Vérifier s'il n'y a pas déjà une relance récente
                derniere_relance = appel.relances.order_by('-date_relance').first()
                
                if derniere_relance:
                    jours_depuis_relance = (timezone.now().date() - derniere_relance.date_relance).days
                    if jours_depuis_relance < 15:  # Pas de relance si moins de 15 jours
                        continue
                
                # Déterminer le niveau de relance
                jours_retard = (timezone.now().date() - appel.date_limite_reponse).days
                niveau_relance = self._determiner_niveau_relance(jours_retard, appel.relances.count())
                
                # Créer la relance
                relance = RelanceFonds.objects.create(
                    societe=self.societe,
                    appel_fonds=appel,
                    type_relance='MAIL',
                    niveau_relance=niveau_relance,
                    objet=self._generer_objet_relance(niveau_relance, appel),
                    message=self._generer_message_relance(niveau_relance, appel),
                    date_limite_nouvelle=timezone.now().date() + timedelta(days=15)
                )
                
                relances_creees.append(relance)
            
            logger.info(f"Génération automatique: {len(relances_creees)} relances créées")
            return relances_creees
            
        except Exception as e:
            logger.error(f"Erreur génération relances: {str(e)}")
            raise ValidationError(f"Impossible de générer les relances: {str(e)}")
    
    def analyser_performance_campagne(self, campagne_id: int) -> Dict[str, Any]:
        """
        Analyse la performance d'une campagne d'appel de fonds.
        """
        try:
            campagne = CampagneAppelFonds.objects.get(id=campagne_id, societe=self.societe)
            
            # Statistiques générales
            appels = campagne.appels_fonds.all()
            nb_appels_total = appels.count()
            
            statistiques_statuts = appels.values('statut').annotate(
                count=models.Count('id'),
                montant_total=models.Sum('montant_appele'),
                montant_verse_total=models.Sum('montant_verse')
            )
            
            # Calculs de performance
            montant_total_verse = appels.aggregate(
                total=models.Sum('montant_verse')
            )['total'] or Decimal('0')
            
            taux_reponse = (montant_total_verse / campagne.montant_total_appele * 100) if campagne.montant_total_appele > 0 else 0
            taux_realisation = (montant_total_verse / campagne.montant_total_prevu * 100) if campagne.montant_total_prevu > 0 else 0
            
            # Analyse temporelle
            versements_par_mois = VersementFonds.objects.filter(
                appel_fonds__campagne=campagne
            ).extra(
                select={'mois': "strftime('%%Y-%%m', date_versement)"}
            ).values('mois').annotate(
                count=models.Count('id'),
                montant=models.Sum('montant_verse')
            ).order_by('mois')
            
            # Top contributeurs
            top_contributeurs = appels.filter(
                montant_verse__gt=0
            ).order_by('-montant_verse').select_related('tiers')[:10]
            
            # Retards et relances
            nb_relances = RelanceFonds.objects.filter(
                appel_fonds__campagne=campagne
            ).count()
            
            appels_en_retard = appels.filter(
                date_limite_reponse__lt=timezone.now().date(),
                statut__in=['ENVOYE', 'ACCEPTE', 'PARTIELLEMENT_VERSE']
            ).count()
            
            return {
                'campagne': {
                    'numero': campagne.numero_campagne,
                    'libelle': campagne.libelle,
                    'statut': campagne.statut,
                    'montant_prevu': campagne.montant_total_prevu,
                    'montant_appele': campagne.montant_total_appele,
                    'montant_verse': montant_total_verse
                },
                'performance': {
                    'taux_reponse': round(taux_reponse, 2),
                    'taux_realisation': round(taux_realisation, 2),
                    'nb_appels_total': nb_appels_total,
                    'nb_appels_en_retard': appels_en_retard,
                    'nb_relances': nb_relances
                },
                'repartition_statuts': list(statistiques_statuts),
                'evolution_versements': list(versements_par_mois),
                'top_contributeurs': [
                    {
                        'tiers': appel.tiers.denomination,
                        'montant_appele': appel.montant_appele,
                        'montant_verse': appel.montant_verse,
                        'pourcentage': appel.pourcentage_verse
                    } for appel in top_contributeurs
                ]
            }
            
        except Exception as e:
            logger.error(f"Erreur analyse performance campagne: {str(e)}")
            raise ValidationError(f"Impossible d'analyser la performance: {str(e)}")
    
    def cloturer_campagne(self, campagne_id: int, force: bool = False) -> bool:
        """
        Clôture une campagne d'appel de fonds.
        """
        try:
            with transaction.atomic():
                campagne = CampagneAppelFonds.objects.get(id=campagne_id, societe=self.societe)
                
                if campagne.statut == 'CLOTUREE':
                    raise ValidationError("La campagne est déjà clôturée")
                
                # Vérifications avant clôture (si pas forcé)
                if not force:
                    appels_en_cours = campagne.appels_fonds.exclude(
                        statut__in=['TOTALEMENT_VERSE', 'ANNULE', 'EXPIRE']
                    ).count()
                    
                    if appels_en_cours > 0:
                        raise ValidationError(f"Il reste {appels_en_cours} appels en cours. Utilisez 'force=True' pour forcer la clôture.")
                
                # Clôturer la campagne
                campagne.statut = 'CLOTUREE'
                campagne.date_fin_reelle = timezone.now().date()
                campagne.save()
                
                # Mettre à jour les montants totaux finaux
                totaux = campagne.appels_fonds.aggregate(
                    total_appele=models.Sum('montant_appele'),
                    total_verse=models.Sum('montant_verse')
                )
                
                campagne.montant_total_appele = totaux['total_appele'] or Decimal('0')
                campagne.montant_total_verse = totaux['total_verse'] or Decimal('0')
                campagne.save()
                
                logger.info(f"Campagne {campagne.numero_campagne} clôturée")
                return True
                
        except Exception as e:
            logger.error(f"Erreur clôture campagne: {str(e)}")
            raise ValidationError(f"Impossible de clôturer la campagne: {str(e)}")
    
    # Méthodes privées
    
    def _selectionner_tiers_eligibles(self, criteres: Dict[str, Any]) -> List[Tiers]:
        """Sélectionne les tiers éligibles selon les critères."""
        query = Tiers.objects.filter(societe=self.societe, actif=True)
        
        if criteres.get('type_tiers'):
            query = query.filter(type_tiers__in=criteres['type_tiers'])
        
        if criteres.get('categories'):
            query = query.filter(categories__overlap=criteres['categories'])
        
        if criteres.get('montant_min_contribution'):
            # Filtrer selon l'historique de contributions
            pass
        
        if criteres.get('zone_geographique'):
            query = query.filter(
                adresses__ville__icontains=criteres['zone_geographique']
            )
        
        return list(query.distinct())
    
    def _calculer_repartition_montants(
        self,
        montant_total: Decimal,
        tiers_list: List[Tiers],
        mode: str,
        montant_individuel: Optional[Decimal]
    ) -> List[Decimal]:
        """Calcule la répartition des montants."""
        nb_tiers = len(tiers_list)
        
        if mode == 'EGAL':
            montant_unitaire = montant_total / nb_tiers
            return [montant_unitaire.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)] * nb_tiers
        
        elif mode == 'FIXE' and montant_individuel:
            return [montant_individuel] * nb_tiers
        
        elif mode == 'PROPORTIONNEL':
            # À implémenter selon les critères de proportionnalité
            return [montant_total / nb_tiers] * nb_tiers
        
        else:
            return [montant_total / nb_tiers] * nb_tiers
    
    def _preparer_donnees_envoi(self, appel: AppelFonds, message_personnalise: str) -> Dict:
        """Prépare les données pour l'envoi."""
        return {
            'destinataire': appel.tiers.email_principal,
            'sujet': f"Appel de fonds - {appel.numero_appel}",
            'montant': appel.montant_appele,
            'date_limite': appel.date_limite_reponse,
            'taux_interet': appel.taux_interet_applicable,
            'message': message_personnalise,
            'campagne': appel.campagne.libelle
        }
    
    def _executer_envoi(
        self,
        appel: AppelFonds,
        mode_envoi: str,
        donnees: Dict,
        destinataires_cc: List[str]
    ) -> bool:
        """Exécute l'envoi (simulation)."""
        # Ici serait intégrée la logique d'envoi réelle (email, SMS, etc.)
        logger.info(f"Envoi simulé: {mode_envoi} vers {donnees['destinataire']}")
        return True
    
    def _changer_statut_appel(self, appel: AppelFonds, nouveau_statut: str, commentaire: str = ''):
        """Change le statut d'un appel de fonds et enregistre l'historique."""
        ancien_statut = appel.statut
        appel.statut = nouveau_statut
        appel.save()
        
        # Enregistrer dans l'historique
        StatutAppelFonds.objects.create(
            societe=self.societe,
            appel_fonds=appel,
            ancien_statut=ancien_statut,
            nouveau_statut=nouveau_statut,
            commentaire=commentaire
        )
    
    def _determiner_type_versement(self, appel: AppelFonds, montant: Decimal) -> str:
        """Détermine le type de versement."""
        if appel.montant_verse == 0:
            if montant == appel.montant_appele:
                return 'INITIAL'
            else:
                return 'PARTIEL'
        else:
            if appel.montant_verse + montant == appel.montant_appele:
                return 'FINAL'
            else:
                return 'COMPLEMENTAIRE'
    
    def _creer_ecriture_versement(self, versement: VersementFonds) -> Ecriture:
        """Crée l'écriture comptable pour un versement."""
        journal = Journal.objects.filter(
            societe=self.societe,
            code__icontains='BANQUE'
        ).first()
        
        if not journal:
            raise ValidationError("Aucun journal de banque trouvé")
        
        # Comptes comptables
        compte_banque = CompteComptable.objects.filter(
            societe=self.societe,
            numero__startswith='52'  # Comptes de banque
        ).first()
        
        compte_tiers = CompteComptable.objects.filter(
            societe=self.societe,
            numero__startswith='467'  # Comptes courants d'associés
        ).first()
        
        if not compte_banque or not compte_tiers:
            raise ValidationError("Comptes comptables non trouvés")
        
        # Créer l'écriture
        ecriture = Ecriture.objects.create(
            societe=self.societe,
            journal=journal,
            date_ecriture=versement.date_versement,
            reference=versement.numero_versement,
            libelle=f"Versement de fonds - {versement.appel_fonds.tiers.denomination}"
        )
        
        # Ligne débit (banque)
        LigneEcriture.objects.create(
            ecriture=ecriture,
            compte=compte_banque,
            libelle=f"Versement {versement.numero_versement}",
            sens='DEBIT',
            montant=versement.montant_verse
        )
        
        # Ligne crédit (tiers)
        LigneEcriture.objects.create(
            ecriture=ecriture,
            compte=compte_tiers,
            libelle=f"Versement {versement.numero_versement}",
            sens='CREDIT',
            montant=versement.montant_verse
        )
        
        ecriture.statut = 'VALIDEE'
        ecriture.save()
        
        return ecriture
    
    def _mettre_a_jour_appel_versement(self, appel: AppelFonds, versement: VersementFonds):
        """Met à jour l'appel de fonds après un versement."""
        appel.montant_verse += versement.montant_verse
        
        if not appel.date_premier_versement:
            appel.date_premier_versement = versement.date_versement
        
        appel.date_dernier_versement = versement.date_versement
        
        # Changer le statut selon le montant versé
        if appel.montant_verse >= appel.montant_appele:
            nouveau_statut = 'TOTALEMENT_VERSE'
        elif appel.montant_verse > 0:
            nouveau_statut = 'PARTIELLEMENT_VERSE'
        else:
            nouveau_statut = appel.statut
        
        if nouveau_statut != appel.statut:
            self._changer_statut_appel(appel, nouveau_statut, f"Versement de {versement.montant_verse}€")
        else:
            appel.save()
        
        # Mettre à jour la campagne
        self._mettre_a_jour_campagne_versement(appel.campagne)
    
    def _mettre_a_jour_campagne_versement(self, campagne: CampagneAppelFonds):
        """Met à jour les totaux de la campagne."""
        totaux = campagne.appels_fonds.aggregate(
            total_verse=models.Sum('montant_verse')
        )
        
        campagne.montant_total_verse = totaux['total_verse'] or Decimal('0')
        campagne.save()
    
    def _determiner_niveau_relance(self, jours_retard: int, nb_relances: int) -> str:
        """Détermine le niveau de relance selon le retard et l'historique."""
        if nb_relances == 0:
            return 'RAPPEL_AMICAL'
        elif jours_retard < 30:
            return 'RELANCE_FERME'
        elif jours_retard < 60:
            return 'MISE_DEMEURE'
        else:
            return 'PROCEDURE_JUDICIAIRE'
    
    def _generer_objet_relance(self, niveau: str, appel: AppelFonds) -> str:
        """Génère l'objet d'une relance."""
        objets = {
            'RAPPEL_AMICAL': f"Rappel - Appel de fonds {appel.numero_appel}",
            'RELANCE_FERME': f"Relance - Appel de fonds {appel.numero_appel} - Échéance dépassée",
            'MISE_DEMEURE': f"MISE EN DEMEURE - Appel de fonds {appel.numero_appel}",
            'PROCEDURE_JUDICIAIRE': f"DERNIÈRE RELANCE - Appel de fonds {appel.numero_appel}"
        }
        return objets.get(niveau, f"Relance - Appel de fonds {appel.numero_appel}")
    
    def _generer_message_relance(self, niveau: str, appel: AppelFonds) -> str:
        """Génère le message d'une relance."""
        messages_base = {
            'RAPPEL_AMICAL': f"""
Madame, Monsieur,

Nous vous rappelons que l'appel de fonds n°{appel.numero_appel} d'un montant de {appel.montant_appele}€ 
était attendu pour le {appel.date_limite_reponse}.

Nous vous serions reconnaissants de bien vouloir régulariser cette situation dans les meilleurs délais.

Cordialement,
L'équipe de gestion
            """,
            'RELANCE_FERME': f"""
Madame, Monsieur,

Malgré notre précédent courrier, nous constatons que l'appel de fonds n°{appel.numero_appel} 
d'un montant de {appel.montant_appele}€ n'a toujours pas été honoré.

Nous vous demandons de régulariser cette situation sous 15 jours.

Cordialement,
L'équipe de gestion
            """,
            'MISE_DEMEURE': f"""
MISE EN DEMEURE

Madame, Monsieur,

Par la présente, nous vous mettons en demeure de verser la somme de {appel.solde_restant}€ 
au titre de l'appel de fonds n°{appel.numero_appel}.

Vous disposez d'un délai de 15 jours pour régulariser cette situation, faute de quoi 
nous nous verrions contraints d'engager des poursuites judiciaires.

Cordialement,
L'équipe de gestion
            """
        }
        return messages_base.get(niveau, f"Relance pour l'appel de fonds {appel.numero_appel}")