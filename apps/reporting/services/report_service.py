from django.db import transaction, connection
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.template import Template, Context
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple, Any, Union
from datetime import datetime, date, timedelta
import hashlib
import json
import logging
import io
import pandas as pd

from ..models import (
    CategorieRapport, ModeleRapport, Rapport, PlanificationRapport,
    TableauBord, Widget, FavoriRapport, CommentaireRapport
)
from ...core.models import Societe, Exercice
from ...core.services.base_service import BaseService

logger = logging.getLogger(__name__)

class ReportService(BaseService):
    """
    Service principal pour la gestion des rapports et du Business Intelligence.
    Gère la génération, la planification et la distribution des rapports.
    """
    
    def __init__(self, societe: Societe):
        super().__init__(societe)
        self.societe = societe
    
    def generer_rapport(
        self,
        modele_id: int,
        titre: str,
        date_debut: Optional[date] = None,
        date_fin: Optional[date] = None,
        filtres: Dict[str, Any] = None,
        formats: List[str] = None,
        exercice_id: Optional[int] = None,
        force_regeneration: bool = False
    ) -> Rapport:
        """
        Génère un rapport basé sur un modèle.
        """
        try:
            with transaction.atomic():
                modele = ModeleRapport.objects.get(id=modele_id)
                
                if modele.societe and modele.societe != self.societe:
                    raise ValidationError("Accès refusé à ce modèle de rapport")
                
                exercice = None
                if exercice_id:
                    exercice = Exercice.objects.get(id=exercice_id, societe=self.societe)
                
                filtres = filtres or {}
                formats = formats or [modele.format_defaut]
                
                # Calculer le hash des paramètres pour éviter la régénération
                hash_parametres = self._calculer_hash_parametres(
                    modele_id, date_debut, date_fin, filtres
                )
                
                # Vérifier s'il existe déjà un rapport avec ces paramètres
                if not force_regeneration:
                    rapport_existant = Rapport.objects.filter(
                        societe=self.societe,
                        modele=modele,
                        hash_parametres=hash_parametres,
                        statut='GENERE'
                    ).exclude(date_expiration__lt=timezone.now()).first()
                    
                    if rapport_existant:
                        logger.info(f"Rapport existant trouvé: {rapport_existant.id}")
                        return rapport_existant
                
                # Créer le rapport
                rapport = Rapport.objects.create(
                    societe=self.societe,
                    exercice=exercice,
                    modele=modele,
                    titre=titre,
                    date_debut=date_debut,
                    date_fin=date_fin,
                    filtres_appliques=filtres,
                    hash_parametres=hash_parametres,
                    statut='EN_COURS'
                )
                
                # Générer les données
                start_time = timezone.now()
                
                try:
                    donnees = self._executer_requete_rapport(modele, filtres, date_debut, date_fin)
                    
                    # Calculer la durée et la taille
                    duree_generation = (timezone.now() - start_time).total_seconds()
                    taille_donnees = len(donnees) if donnees else 0
                    
                    # Générer les fichiers selon les formats demandés
                    fichiers_generes = {}
                    for format_sortie in formats:
                        fichier = self._generer_fichier_rapport(
                            rapport, modele, donnees, format_sortie
                        )
                        fichiers_generes[format_sortie.lower()] = fichier
                    
                    # Mettre à jour le rapport
                    rapport.statut = 'GENERE'
                    rapport.date_generation = timezone.now()
                    rapport.duree_generation = int(duree_generation)
                    rapport.taille_donnees = taille_donnees
                    rapport.donnees_json = donnees
                    rapport.date_expiration = timezone.now() + timedelta(days=7)  # Expire dans 7 jours
                    
                    # Sauvegarder les fichiers
                    for format_name, fichier in fichiers_generes.items():
                        if format_name == 'pdf' and fichier:
                            rapport.fichier_pdf = fichier
                        elif format_name == 'excel' and fichier:
                            rapport.fichier_excel = fichier
                        elif format_name == 'csv' and fichier:
                            rapport.fichier_csv = fichier
                    
                    rapport.save()
                    
                    logger.info(f"Rapport {rapport.id} généré avec succès en {duree_generation:.2f}s")
                    return rapport
                    
                except Exception as e:
                    # Marquer le rapport comme en erreur
                    rapport.statut = 'ERREUR'
                    rapport.message_erreur = str(e)
                    rapport.trace_erreur = str(e.__traceback__) if hasattr(e, '__traceback__') else ''
                    rapport.save()
                    raise
                    
        except Exception as e:
            logger.error(f"Erreur génération rapport: {str(e)}")
            raise ValidationError(f"Impossible de générer le rapport: {str(e)}")
    
    def creer_modele_personnalise(
        self,
        nom: str,
        categorie_id: int,
        type_rapport: str,
        requete_sql: str,
        colonnes_config: List[Dict],
        **kwargs
    ) -> ModeleRapport:
        """
        Crée un modèle de rapport personnalisé.
        """
        try:
            with transaction.atomic():
                categorie = CategorieRapport.objects.get(id=categorie_id)
                
                # Générer un code unique
                code = self._generer_code_modele(nom)
                
                # Valider la requête SQL
                self._valider_requete_sql(requete_sql)
                
                modele = ModeleRapport.objects.create(
                    societe=self.societe,
                    categorie=categorie,
                    code=code,
                    nom=nom,
                    description=kwargs.get('description', ''),
                    type_rapport=type_rapport,
                    requete_sql=requete_sql,
                    colonnes_configuration={
                        'colonnes': colonnes_config
                    },
                    filtres_disponibles=kwargs.get('filtres', []),
                    template_html=kwargs.get('template_html', ''),
                    styles_css=kwargs.get('styles_css', ''),
                    format_defaut=kwargs.get('format_defaut', 'PDF'),
                    frequence_defaut=kwargs.get('frequence_defaut', 'PONCTUEL'),
                    parametres_avances=kwargs.get('parametres_avances', {}),
                    est_systeme=False,
                    est_public=kwargs.get('est_public', False)
                )
                
                logger.info(f"Modèle personnalisé {modele.code} créé")
                return modele
                
        except Exception as e:
            logger.error(f"Erreur création modèle: {str(e)}")
            raise ValidationError(f"Impossible de créer le modèle: {str(e)}")
    
    def creer_tableau_bord(
        self,
        nom: str,
        type_tableau: str,
        widgets_config: List[Dict],
        **kwargs
    ) -> TableauBord:
        """
        Crée un tableau de bord personnalisé.
        """
        try:
            with transaction.atomic():
                tableau = TableauBord.objects.create(
                    societe=self.societe,
                    nom=nom,
                    description=kwargs.get('description', ''),
                    type_tableau=type_tableau,
                    configuration_widgets=widgets_config,
                    layout_configuration=kwargs.get('layout_configuration', {}),
                    filtres_globaux=kwargs.get('filtres_globaux', {}),
                    est_defaut=kwargs.get('est_defaut', False),
                    est_public=kwargs.get('est_public', False),
                    auto_refresh=kwargs.get('auto_refresh', True),
                    interval_refresh=kwargs.get('interval_refresh', 300)
                )
                
                # Créer les widgets associés
                for widget_config in widgets_config:
                    self._creer_widget_tableau(tableau, widget_config)
                
                logger.info(f"Tableau de bord {tableau.nom} créé")
                return tableau
                
        except Exception as e:
            logger.error(f"Erreur création tableau de bord: {str(e)}")
            raise ValidationError(f"Impossible de créer le tableau de bord: {str(e)}")
    
    def planifier_rapport(
        self,
        modele_id: int,
        nom: str,
        frequence: str,
        heure_execution: str,
        destinataires: List[str],
        **kwargs
    ) -> PlanificationRapport:
        """
        Planifie la génération automatique d'un rapport.
        """
        try:
            with transaction.atomic():
                modele = ModeleRapport.objects.get(id=modele_id)
                
                if modele.societe and modele.societe != self.societe:
                    raise ValidationError("Accès refusé à ce modèle de rapport")
                
                from datetime import time
                heure = time.fromisoformat(heure_execution)
                
                planification = PlanificationRapport.objects.create(
                    societe=self.societe,
                    modele=modele,
                    nom=nom,
                    description=kwargs.get('description', ''),
                    frequence=frequence,
                    jour_semaine=kwargs.get('jour_semaine'),
                    jour_mois=kwargs.get('jour_mois'),
                    heure_execution=heure,
                    filtres_defaut=kwargs.get('filtres_defaut', {}),
                    formats_generation=kwargs.get('formats_generation', ['PDF']),
                    destinataires_email=destinataires,
                    objet_email=kwargs.get('objet_email', f'Rapport automatique: {nom}'),
                    message_email=kwargs.get('message_email', ''),
                    statut='ACTIF'
                )
                
                # Calculer la prochaine exécution
                planification.calculer_prochaine_execution()
                planification.save()
                
                logger.info(f"Planification {planification.nom} créée")
                return planification
                
        except Exception as e:
            logger.error(f"Erreur planification rapport: {str(e)}")
            raise ValidationError(f"Impossible de planifier le rapport: {str(e)}")
    
    def executer_planifications_dues(self) -> List[Rapport]:
        """
        Exécute les planifications de rapports qui sont dues.
        """
        rapports_generes = []
        
        try:
            planifications_dues = PlanificationRapport.objects.filter(
                societe=self.societe,
                statut='ACTIF',
                prochaine_execution__lte=timezone.now()
            )
            
            for planification in planifications_dues:
                try:
                    # Générer le rapport
                    titre = f"{planification.nom} - {timezone.now().strftime('%d/%m/%Y')}"
                    
                    rapport = self.generer_rapport(
                        modele_id=planification.modele.id,
                        titre=titre,
                        filtres=planification.filtres_defaut,
                        formats=planification.formats_generation
                    )
                    
                    # Envoyer par email si configuré
                    if planification.destinataires_email:
                        self._envoyer_rapport_email(rapport, planification)
                    
                    # Mettre à jour la planification
                    planification.derniere_execution = timezone.now()
                    planification.nombre_executions += 1
                    planification.calculer_prochaine_execution()
                    planification.save()
                    
                    rapports_generes.append(rapport)
                    
                except Exception as e:
                    logger.error(f"Erreur exécution planification {planification.id}: {str(e)}")
                    planification.nombre_erreurs += 1
                    if planification.nombre_erreurs >= 3:
                        planification.statut = 'ERREUR'
                    planification.save()
            
            return rapports_generes
            
        except Exception as e:
            logger.error(f"Erreur exécution planifications: {str(e)}")
            return rapports_generes
    
    def generer_donnees_dashboard(
        self,
        tableau_id: int,
        filtres_globaux: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Génère les données pour un tableau de bord.
        """
        try:
            tableau = TableauBord.objects.get(id=tableau_id, societe=self.societe)
            filtres_globaux = filtres_globaux or tableau.filtres_globaux
            
            donnees_tableau = {
                'tableau': {
                    'id': tableau.id,
                    'nom': tableau.nom,
                    'type': tableau.type_tableau,
                    'derniere_actualisation': tableau.derniere_actualisation
                },
                'widgets': []
            }
            
            for widget in tableau.widgets.filter(actif=True):
                donnees_widget = self._generer_donnees_widget(widget, filtres_globaux)
                donnees_tableau['widgets'].append(donnees_widget)
            
            # Mettre à jour la date de dernière actualisation
            tableau.derniere_actualisation = timezone.now()
            tableau.save()
            
            return donnees_tableau
            
        except Exception as e:
            logger.error(f"Erreur génération dashboard: {str(e)}")
            raise ValidationError(f"Impossible de générer les données du tableau de bord: {str(e)}")
    
    def analyser_performance_rapports(self, periode_jours: int = 30) -> Dict[str, Any]:
        """
        Analyse les performances et l'utilisation des rapports.
        """
        try:
            date_debut = timezone.now() - timedelta(days=periode_jours)
            
            # Statistiques générales
            stats = {
                'periode': periode_jours,
                'total_rapports': Rapport.objects.filter(
                    societe=self.societe,
                    date_creation__gte=date_debut
                ).count(),
                'rapports_reussis': Rapport.objects.filter(
                    societe=self.societe,
                    date_creation__gte=date_debut,
                    statut='GENERE'
                ).count(),
                'rapports_erreur': Rapport.objects.filter(
                    societe=self.societe,
                    date_creation__gte=date_debut,
                    statut='ERREUR'
                ).count()
            }
            
            # Top des rapports les plus utilisés
            top_rapports = Rapport.objects.filter(
                societe=self.societe,
                date_creation__gte=date_debut
            ).values(
                'modele__nom', 'modele__id'
            ).annotate(
                nb_generations=models.Count('id'),
                nb_consultations=models.Sum('nombre_consultations')
            ).order_by('-nb_generations')[:10]
            
            # Temps de génération moyen par type
            temps_generation = Rapport.objects.filter(
                societe=self.societe,
                date_creation__gte=date_debut,
                statut='GENERE'
            ).values(
                'modele__type_rapport'
            ).annotate(
                temps_moyen=models.Avg('duree_generation'),
                nb_rapports=models.Count('id')
            ).order_by('-temps_moyen')
            
            # Évolution quotidienne
            evolution = Rapport.objects.filter(
                societe=self.societe,
                date_creation__gte=date_debut
            ).extra(
                select={'jour': "DATE(date_creation)"}
            ).values('jour').annotate(
                nb_rapports=models.Count('id')
            ).order_by('jour')
            
            return {
                'statistiques': stats,
                'top_rapports': list(top_rapports),
                'temps_generation': list(temps_generation),
                'evolution': list(evolution)
            }
            
        except Exception as e:
            logger.error(f"Erreur analyse performance: {str(e)}")
            raise ValidationError(f"Impossible d'analyser les performances: {str(e)}")
    
    # Méthodes privées
    
    def _calculer_hash_parametres(
        self,
        modele_id: int,
        date_debut: Optional[date],
        date_fin: Optional[date],
        filtres: Dict
    ) -> str:
        """Calcule un hash unique des paramètres de rapport."""
        parametres = {
            'modele_id': modele_id,
            'date_debut': date_debut.isoformat() if date_debut else None,
            'date_fin': date_fin.isoformat() if date_fin else None,
            'filtres': filtres
        }
        
        json_str = json.dumps(parametres, sort_keys=True, default=str)
        return hashlib.md5(json_str.encode()).hexdigest()
    
    def _executer_requete_rapport(
        self,
        modele: ModeleRapport,
        filtres: Dict,
        date_debut: Optional[date],
        date_fin: Optional[date]
    ) -> List[Dict]:
        """Exécute la requête SQL du modèle avec les filtres."""
        try:
            # Préparer les paramètres de requête
            params = {
                'societe_id': self.societe.id,
                'date_debut': date_debut,
                'date_fin': date_fin,
                **filtres
            }
            
            # Exécuter la requête
            with connection.cursor() as cursor:
                cursor.execute(modele.requete_sql, params)
                
                # Récupérer les noms des colonnes
                colonnes = [col[0] for col in cursor.description]
                
                # Récupérer les données
                donnees = []
                for ligne in cursor.fetchall():
                    donnees.append(dict(zip(colonnes, ligne)))
                
                return donnees
                
        except Exception as e:
            logger.error(f"Erreur exécution requête: {str(e)}")
            raise ValidationError(f"Erreur dans la requête SQL: {str(e)}")
    
    def _generer_fichier_rapport(
        self,
        rapport: Rapport,
        modele: ModeleRapport,
        donnees: List[Dict],
        format_sortie: str
    ) -> Optional[str]:
        """Génère un fichier de rapport dans le format spécifié."""
        try:
            if format_sortie.upper() == 'CSV':
                return self._generer_csv(rapport, donnees)
            elif format_sortie.upper() == 'EXCEL':
                return self._generer_excel(rapport, donnees)
            elif format_sortie.upper() == 'PDF':
                return self._generer_pdf(rapport, modele, donnees)
            else:
                logger.warning(f"Format {format_sortie} non supporté")
                return None
                
        except Exception as e:
            logger.error(f"Erreur génération fichier {format_sortie}: {str(e)}")
            return None
    
    def _generer_csv(self, rapport: Rapport, donnees: List[Dict]) -> str:
        """Génère un fichier CSV."""
        if not donnees:
            return None
        
        df = pd.DataFrame(donnees)
        buffer = io.StringIO()
        df.to_csv(buffer, index=False)
        
        # Simulation - en réalité sauvegarder le fichier
        filename = f"rapport_{rapport.id}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return filename
    
    def _generer_excel(self, rapport: Rapport, donnees: List[Dict]) -> str:
        """Génère un fichier Excel."""
        if not donnees:
            return None
        
        df = pd.DataFrame(donnees)
        filename = f"rapport_{rapport.id}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        # Simulation - en réalité sauvegarder le fichier avec pandas
        # df.to_excel(filename, index=False)
        
        return filename
    
    def _generer_pdf(self, rapport: Rapport, modele: ModeleRapport, donnees: List[Dict]) -> str:
        """Génère un fichier PDF."""
        try:
            # Utiliser le template HTML du modèle ou un template par défaut
            template_html = modele.template_html or self._get_template_defaut()
            
            template = Template(template_html)
            context = Context({
                'rapport': rapport,
                'modele': modele,
                'donnees': donnees,
                'societe': self.societe,
                'date_generation': timezone.now()
            })
            
            html_content = template.render(context)
            
            # Simulation - en réalité utiliser une bibliothèque comme WeasyPrint
            filename = f"rapport_{rapport.id}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            
            return filename
            
        except Exception as e:
            logger.error(f"Erreur génération PDF: {str(e)}")
            return None
    
    def _generer_donnees_widget(
        self,
        widget: Widget,
        filtres_globaux: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Génère les données pour un widget."""
        try:
            # Vérifier le cache
            if not widget.cache_expire and widget.donnees_cache:
                return {
                    'widget_id': widget.id,
                    'nom': widget.nom,
                    'type': widget.type_widget,
                    'donnees': widget.donnees_cache,
                    'from_cache': True
                }
            
            # Combiner les filtres globaux et spécifiques
            filtres_combines = {**filtres_globaux, **widget.filtres_widget}
            
            # Exécuter la requête de données
            with connection.cursor() as cursor:
                # Ajouter l'ID de la société aux paramètres
                filtres_combines['societe_id'] = self.societe.id
                
                cursor.execute(widget.source_donnees, filtres_combines)
                colonnes = [col[0] for col in cursor.description]
                donnees = []
                for ligne in cursor.fetchall():
                    donnees.append(dict(zip(colonnes, ligne)))
            
            # Mettre à jour le cache
            widget.donnees_cache = donnees
            widget.date_cache = timezone.now()
            widget.save()
            
            return {
                'widget_id': widget.id,
                'nom': widget.nom,
                'type': widget.type_widget,
                'donnees': donnees,
                'from_cache': False
            }
            
        except Exception as e:
            logger.error(f"Erreur génération widget {widget.id}: {str(e)}")
            return {
                'widget_id': widget.id,
                'nom': widget.nom,
                'type': widget.type_widget,
                'erreur': str(e),
                'donnees': []
            }
    
    def _creer_widget_tableau(self, tableau: TableauBord, config: Dict) -> Widget:
        """Crée un widget pour un tableau de bord."""
        return Widget.objects.create(
            societe=self.societe,
            tableau_bord=tableau,
            nom=config['nom'],
            description=config.get('description', ''),
            type_widget=config['type'],
            taille=config.get('taille', 'MD'),
            position_x=config.get('position_x', 0),
            position_y=config.get('position_y', 0),
            largeur=config.get('largeur', 2),
            hauteur=config.get('hauteur', 2),
            source_donnees=config['source_donnees'],
            parametres_widget=config.get('parametres', {}),
            filtres_widget=config.get('filtres', {}),
            titre=config.get('titre', ''),
            couleur_primaire=config.get('couleur_primaire', '#3B82F6')
        )
    
    def _valider_requete_sql(self, requete: str):
        """Valide une requête SQL pour sécurité."""
        # Vérifications de sécurité basiques
        mots_interdits = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE']
        requete_upper = requete.upper()
        
        for mot in mots_interdits:
            if mot in requete_upper:
                raise ValidationError(f"Mot-clé SQL interdit détecté: {mot}")
        
        # Vérifier que la requête commence par SELECT
        if not requete_upper.strip().startswith('SELECT'):
            raise ValidationError("Seules les requêtes SELECT sont autorisées")
    
    def _generer_code_modele(self, nom: str) -> str:
        """Génère un code unique pour un modèle."""
        import re
        code_base = re.sub(r'[^A-Za-z0-9]', '_', nom.upper())[:15]
        
        # Vérifier l'unicité
        counter = 1
        code = code_base
        while ModeleRapport.objects.filter(code=code).exists():
            code = f"{code_base}_{counter}"
            counter += 1
        
        return code
    
    def _get_template_defaut(self) -> str:
        """Retourne un template HTML par défaut."""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>{{ rapport.titre }}</title>
            <style>
                body { font-family: Arial, sans-serif; }
                .header { background-color: #f8f9fa; padding: 20px; }
                .content { padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{{ rapport.titre }}</h1>
                <p>Généré le {{ date_generation|date:"d/m/Y H:i" }}</p>
                <p>Société: {{ societe.raison_sociale }}</p>
            </div>
            <div class="content">
                <table>
                    {% if donnees %}
                        <thead>
                            <tr>
                                {% for key in donnees.0.keys %}
                                    <th>{{ key }}</th>
                                {% endfor %}
                            </tr>
                        </thead>
                        <tbody>
                            {% for ligne in donnees %}
                                <tr>
                                    {% for valeur in ligne.values %}
                                        <td>{{ valeur }}</td>
                                    {% endfor %}
                                </tr>
                            {% endfor %}
                        </tbody>
                    {% else %}
                        <tr><td colspan="100%">Aucune donnée trouvée</td></tr>
                    {% endif %}
                </table>
            </div>
        </body>
        </html>
        """
    
    def _envoyer_rapport_email(self, rapport: Rapport, planification: PlanificationRapport):
        """Envoie un rapport par email (simulation)."""
        logger.info(f"Envoi email simulé du rapport {rapport.id} à {planification.destinataires_email}")
        # Ici serait implémentée la logique d'envoi d'email réelle