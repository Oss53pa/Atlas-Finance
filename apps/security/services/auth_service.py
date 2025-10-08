from django.contrib.auth import authenticate, login, logout
from django.contrib.sessions.models import Session
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db import transaction
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from django.conf import settings
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, date, timedelta
import secrets
import hashlib
import pyotp
import qrcode
import io
import base64
import logging
import re
import ipaddress

from ..models import (
    Utilisateur, Role, RoleUtilisateur, SessionUtilisateur, 
    JournalSecurite, ConfigurationSecurite, CleAPI
)
from ...core.models import Societe
from ...core.services.base_service import BaseService

logger = logging.getLogger(__name__)

class AuthService(BaseService):
    """
    Service d'authentification et de sécurité pour WiseBook.
    Gère l'authentification, les sessions, MFA, et la sécurité globale.
    """
    
    def __init__(self, societe: Optional[Societe] = None):
        if societe:
            super().__init__(societe)
        self.societe = societe
    
    def authentifier_utilisateur(
        self,
        username: str,
        password: str,
        adresse_ip: str,
        user_agent: str,
        code_mfa: Optional[str] = None,
        remember_me: bool = False
    ) -> Dict[str, Any]:
        """
        Authentifie un utilisateur avec vérifications de sécurité complètes.
        """
        try:
            with transaction.atomic():
                # 1. Vérifications préliminaires
                utilisateur = self._verifier_utilisateur_existe(username)
                if not utilisateur:
                    self._journaliser_tentative_echec(username, adresse_ip, "Utilisateur inexistant")
                    raise ValidationError("Identifiants incorrects")
                
                # 2. Vérifications de sécurité
                self._verifier_securite_utilisateur(utilisateur, adresse_ip)
                
                # 3. Vérification du mot de passe
                if not self._verifier_mot_de_passe(utilisateur, password):
                    utilisateur.incrementer_tentatives_echec()
                    self._journaliser_tentative_echec(username, adresse_ip, "Mot de passe incorrect")
                    raise ValidationError("Identifiants incorrects")
                
                # 4. Vérification MFA si activée
                if utilisateur.mfa_active:
                    if not code_mfa:
                        return {
                            'status': 'MFA_REQUIRED',
                            'message': 'Code MFA requis',
                            'mfa_methods': self._get_methodes_mfa_utilisateur(utilisateur)
                        }
                    
                    if not self._verifier_code_mfa(utilisateur, code_mfa):
                        self._journaliser_tentative_echec(username, adresse_ip, "Code MFA incorrect")
                        raise ValidationError("Code MFA incorrect")
                
                # 5. Vérifications post-authentification
                self._verifier_contraintes_acces(utilisateur, adresse_ip)
                
                # 6. Créer la session
                session = self._creer_session_utilisateur(utilisateur, adresse_ip, user_agent, remember_me)
                
                # 7. Finaliser l'authentification
                self._finaliser_authentification(utilisateur, session)
                
                return {
                    'status': 'SUCCESS',
                    'user_id': utilisateur.id,
                    'session_key': session.session_key,
                    'token': self._generer_jwt_token(utilisateur, session),
                    'expires_at': session.date_expiration.isoformat(),
                    'user_data': self._serialiser_donnees_utilisateur(utilisateur),
                    'permissions': self._get_permissions_utilisateur(utilisateur),
                    'must_change_password': utilisateur.doit_changer_mdp or utilisateur.mdp_expire
                }
                
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Erreur authentification: {str(e)}")
            raise ValidationError("Erreur interne d'authentification")
    
    def deconnecter_utilisateur(
        self,
        session_key: str,
        utilisateur_id: int,
        deconnexion_forcee: bool = False
    ) -> bool:
        """
        Déconnecte un utilisateur et invalide sa session.
        """
        try:
            with transaction.atomic():
                # Récupérer la session
                session = SessionUtilisateur.objects.filter(
                    session_key=session_key,
                    utilisateur_id=utilisateur_id,
                    active=True
                ).first()
                
                if not session:
                    return False
                
                # Invalider la session
                session.active = False
                session.forcee_deconnexion = deconnexion_forcee
                session.save()
                
                # Supprimer la session Django
                try:
                    django_session = Session.objects.get(session_key=session_key)
                    django_session.delete()
                except Session.DoesNotExist:
                    pass
                
                # Journaliser la déconnexion
                self._journaliser_evenement(
                    session.utilisateur,
                    'LOGOUT_FORCED' if deconnexion_forcee else 'LOGOUT',
                    f"Déconnexion {'forcée' if deconnexion_forcee else 'normale'}",
                    session.adresse_ip
                )
                
                return True
                
        except Exception as e:
            logger.error(f"Erreur déconnexion: {str(e)}")
            return False
    
    def activer_mfa_utilisateur(self, utilisateur: Utilisateur) -> Dict[str, Any]:
        """
        Active l'authentification multi-facteurs pour un utilisateur.
        """
        try:
            # Générer le secret TOTP
            secret = pyotp.random_base32()
            
            # Générer les codes de récupération
            codes_recuperation = [secrets.token_hex(4).upper() for _ in range(10)]
            codes_hashes = [make_password(code) for code in codes_recuperation]
            
            # Sauvegarder la configuration MFA
            utilisateur.secret_mfa = secret
            utilisateur.codes_recuperation = codes_hashes
            utilisateur.save()
            
            # Générer le QR Code
            totp = pyotp.TOTP(secret)
            qr_uri = totp.provisioning_uri(
                name=utilisateur.email,
                issuer_name="WiseBook ERP"
            )
            
            qr_code = qrcode.QRCode(version=1, box_size=10, border=5)
            qr_code.add_data(qr_uri)
            qr_code.make(fit=True)
            
            qr_img = qr_code.make_image(fill_color="black", back_color="white")
            buffer = io.BytesIO()
            qr_img.save(buffer, format='PNG')
            qr_b64 = base64.b64encode(buffer.getvalue()).decode()
            
            return {
                'secret': secret,
                'qr_code': f"data:image/png;base64,{qr_b64}",
                'backup_codes': codes_recuperation,
                'manual_entry_key': secret
            }
            
        except Exception as e:
            logger.error(f"Erreur activation MFA: {str(e)}")
            raise ValidationError("Impossible d'activer l'authentification multi-facteurs")
    
    def verifier_et_confirmer_mfa(self, utilisateur: Utilisateur, code_verification: str) -> bool:
        """
        Vérifie le code MFA et active définitivement MFA pour l'utilisateur.
        """
        try:
            if not utilisateur.secret_mfa:
                raise ValidationError("MFA non configuré")
            
            # Vérifier le code TOTP
            totp = pyotp.TOTP(utilisateur.secret_mfa)
            if totp.verify(code_verification, valid_window=2):
                utilisateur.mfa_active = True
                utilisateur.save()
                
                self._journaliser_evenement(
                    utilisateur,
                    'MFA_ACTIVATED',
                    "Authentification multi-facteurs activée"
                )
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Erreur confirmation MFA: {str(e)}")
            return False
    
    def changer_mot_de_passe(
        self,
        utilisateur: Utilisateur,
        ancien_mdp: str,
        nouveau_mdp: str,
        confirmer_mdp: str
    ) -> bool:
        """
        Change le mot de passe d'un utilisateur avec validation.
        """
        try:
            with transaction.atomic():
                # Vérifications
                if nouveau_mdp != confirmer_mdp:
                    raise ValidationError("Les mots de passe ne correspondent pas")
                
                if not check_password(ancien_mdp, utilisateur.password):
                    raise ValidationError("Ancien mot de passe incorrect")
                
                # Validation de la politique de mot de passe
                config = self._get_config_securite(utilisateur.societe)
                self._valider_politique_mot_de_passe(nouveau_mdp, config, utilisateur)
                
                # Vérifier l'historique des mots de passe
                self._verifier_historique_mot_de_passe(nouveau_mdp, utilisateur, config)
                
                # Mettre à jour le mot de passe
                ancien_hash = utilisateur.password
                utilisateur.set_password(nouveau_mdp)
                utilisateur.mot_de_passe_expire = False
                utilisateur.doit_changer_mdp = False
                utilisateur.date_expiration_mdp = timezone.now() + timedelta(
                    days=config.mdp_duree_validite_jours
                )
                
                # Ajouter à l'historique
                historique = utilisateur.historique_mdp or []
                historique.append({
                    'hash': ancien_hash,
                    'date_changement': timezone.now().isoformat()
                })
                
                # Garder seulement les N derniers
                historique = historique[-config.mdp_historique_taille:]
                utilisateur.historique_mdp = historique
                
                utilisateur.save()
                
                # Journaliser
                self._journaliser_evenement(
                    utilisateur,
                    'PASSWORD_CHANGED',
                    "Mot de passe changé par l'utilisateur"
                )
                
                return True
                
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Erreur changement mot de passe: {str(e)}")
            raise ValidationError("Erreur lors du changement de mot de passe")
    
    def reinitialiser_mot_de_passe(
        self,
        email: str,
        domaine_societe: str
    ) -> bool:
        """
        Initie une réinitialisation de mot de passe par email.
        """
        try:
            # Trouver l'utilisateur
            societe = Societe.objects.filter(domaine=domaine_societe).first()
            if not societe:
                # Ne pas révéler si la société existe
                return True
            
            utilisateur = Utilisateur.objects.filter(
                email=email,
                societe=societe,
                is_active=True
            ).first()
            
            if not utilisateur:
                # Ne pas révéler si l'utilisateur existe
                return True
            
            # Générer un token de réinitialisation
            token = secrets.token_urlsafe(32)
            expiration = timezone.now() + timedelta(hours=1)
            
            # Stocker le token (ici on le met dans les métadonnées, 
            # en production utiliser une table dédiée)
            utilisateur.notes_admin = f"RESET_TOKEN:{token}:{expiration.isoformat()}"
            utilisateur.save()
            
            # Envoyer l'email
            self._envoyer_email_reinitialisation(utilisateur, token)
            
            # Journaliser
            self._journaliser_evenement(
                utilisateur,
                'PASSWORD_RESET',
                "Demande de réinitialisation mot de passe",
                metadonnees={'email_sent': True}
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Erreur réinitialisation mot de passe: {str(e)}")
            return True  # Ne pas révéler les erreurs
    
    def gerer_sessions_utilisateur(self, utilisateur: Utilisateur) -> Dict[str, Any]:
        """
        Gère et nettoie les sessions d'un utilisateur.
        """
        try:
            config = self._get_config_securite(utilisateur.societe)
            
            # Récupérer toutes les sessions actives
            sessions_actives = SessionUtilisateur.objects.filter(
                utilisateur=utilisateur,
                active=True
            ).order_by('-date_derniere_activite')
            
            # Supprimer les sessions expirées
            sessions_expirees = sessions_actives.filter(
                date_expiration__lt=timezone.now()
            )
            
            for session in sessions_expirees:
                session.active = False
                session.save()
            
            # Appliquer la limite de sessions concurrentes
            sessions_valides = sessions_actives.filter(
                date_expiration__gte=timezone.now()
            )
            
            if sessions_valides.count() > config.sessions_concurrentes_max:
                sessions_a_supprimer = sessions_valides[config.sessions_concurrentes_max:]
                for session in sessions_a_supprimer:
                    session.active = False
                    session.forcee_deconnexion = True
                    session.save()
            
            # Statistiques
            return {
                'sessions_actives': sessions_valides.count(),
                'sessions_supprimees': sessions_expirees.count(),
                'limite_atteinte': sessions_valides.count() >= config.sessions_concurrentes_max,
                'sessions_details': [
                    {
                        'id': s.id,
                        'ip': s.adresse_ip,
                        'device': s.type_dispositif,
                        'last_activity': s.date_derniere_activite,
                        'location': f"{s.ville}, {s.pays}" if s.ville else 'Inconnue'
                    }
                    for s in sessions_valides[:10]  # Top 10
                ]
            }
            
        except Exception as e:
            logger.error(f"Erreur gestion sessions: {str(e)}")
            return {'error': str(e)}
    
    def verifier_permissions_utilisateur(
        self,
        utilisateur: Utilisateur,
        module: str,
        action: str,
        ressource: Optional[str] = None
    ) -> bool:
        """
        Vérifie si un utilisateur a les permissions pour une action.
        """
        try:
            if not utilisateur.est_actif_securite:
                return False
            
            # Super utilisateurs ont tous les droits
            if utilisateur.is_superuser:
                return True
            
            # Récupérer tous les rôles actifs de l'utilisateur
            roles_actifs = RoleUtilisateur.objects.filter(
                utilisateur=utilisateur,
                actif=True,
                date_debut__lte=timezone.now()
            ).filter(
                models.Q(date_fin__isnull=True) | models.Q(date_fin__gt=timezone.now())
            ).select_related('role')
            
            # Vérifier les permissions dans chaque rôle
            for role_utilisateur in roles_actifs:
                role = role_utilisateur.role
                
                if not role.actif or role.est_expire:
                    continue
                
                # Vérifier les permissions du module
                permissions_module = role.permissions_modules.get(module, [])
                
                # Actions hiérarchiques: admin > validation > ecriture > lecture
                if action == 'read' and any(p in permissions_module for p in ['read', 'write', 'validate', 'admin']):
                    return True
                elif action == 'write' and any(p in permissions_module for p in ['write', 'validate', 'admin']):
                    return True
                elif action == 'validate' and any(p in permissions_module for p in ['validate', 'admin']):
                    return True
                elif action == 'admin' and 'admin' in permissions_module:
                    return True
                
                # Vérifications spécifiques aux ressources
                if ressource:
                    permissions_donnees = role.permissions_donnees.get(ressource, [])
                    if action in permissions_donnees:
                        return True
            
            return False
            
        except Exception as e:
            logger.error(f"Erreur vérification permissions: {str(e)}")
            return False
    
    def creer_cle_api(
        self,
        utilisateur: Utilisateur,
        nom: str,
        type_cle: str,
        permissions: Dict[str, List[str]],
        **kwargs
    ) -> CleAPI:
        """
        Crée une nouvelle clé API pour un utilisateur.
        """
        try:
            with transaction.atomic():
                # Générer la clé secrète
                cle_secrete = secrets.token_urlsafe(64)
                cle_secrete_hash = make_password(cle_secrete)
                
                cle_api = CleAPI.objects.create(
                    societe=utilisateur.societe,
                    utilisateur=utilisateur,
                    nom=nom,
                    description=kwargs.get('description', ''),
                    type_cle=type_cle,
                    permissions=permissions,
                    cle_secrete=cle_secrete_hash,
                    limite_requetes_jour=kwargs.get('limite_jour', 1000),
                    limite_requetes_heure=kwargs.get('limite_heure', 100),
                    adresses_ip_autorisees=kwargs.get('ips_autorisees', []),
                    date_expiration=kwargs.get('date_expiration')
                )
                
                # Journaliser la création
                self._journaliser_evenement(
                    utilisateur,
                    'API_KEY_CREATED',
                    f"Clé API créée: {nom}",
                    metadonnees={
                        'api_key_id': cle_api.id,
                        'api_key_type': type_cle
                    }
                )
                
                # Retourner la clé avec le secret en clair (une seule fois)
                cle_api._cle_secrete_plain = cle_secrete
                return cle_api
                
        except Exception as e:
            logger.error(f"Erreur création clé API: {str(e)}")
            raise ValidationError(f"Impossible de créer la clé API: {str(e)}")
    
    # Méthodes privées
    
    def _verifier_utilisateur_existe(self, username: str) -> Optional[Utilisateur]:
        """Vérifie l'existence d'un utilisateur."""
        return Utilisateur.objects.filter(
            models.Q(username=username) | models.Q(email=username),
            is_active=True
        ).first()
    
    def _verifier_securite_utilisateur(self, utilisateur: Utilisateur, adresse_ip: str):
        """Vérifie les contraintes de sécurité d'un utilisateur."""
        # Vérifier si le compte est actif du point de vue sécurité
        if not utilisateur.est_actif_securite:
            if utilisateur.statut == 'SUSPENDU':
                raise ValidationError("Compte suspendu")
            elif utilisateur.statut == 'BLOQUE':
                raise ValidationError("Compte bloqué")
            elif utilisateur.compte_verrouille_jusqu:
                raise ValidationError("Compte temporairement verrouillé")
            else:
                raise ValidationError("Compte inactif")
        
        # Vérifier les restrictions d'IP
        if utilisateur.adresses_ip_autorisees:
            if not self._verifier_adresse_ip_autorisee(adresse_ip, utilisateur.adresses_ip_autorisees):
                raise ValidationError("Accès non autorisé depuis cette adresse IP")
    
    def _verifier_mot_de_passe(self, utilisateur: Utilisateur, password: str) -> bool:
        """Vérifie le mot de passe d'un utilisateur."""
        return check_password(password, utilisateur.password)
    
    def _verifier_code_mfa(self, utilisateur: Utilisateur, code: str) -> bool:
        """Vérifie un code MFA."""
        if not utilisateur.secret_mfa:
            return False
        
        # Vérifier le code TOTP
        totp = pyotp.TOTP(utilisateur.secret_mfa)
        if totp.verify(code, valid_window=2):
            return True
        
        # Vérifier les codes de récupération
        for code_hash in utilisateur.codes_recuperation or []:
            if check_password(code, code_hash):
                # Supprimer le code utilisé
                codes_restants = [c for c in utilisateur.codes_recuperation if c != code_hash]
                utilisateur.codes_recuperation = codes_restants
                utilisateur.save()
                return True
        
        return False
    
    def _creer_session_utilisateur(
        self,
        utilisateur: Utilisateur,
        adresse_ip: str,
        user_agent: str,
        remember_me: bool
    ) -> SessionUtilisateur:
        """Crée une nouvelle session utilisateur."""
        config = self._get_config_securite(utilisateur.societe)
        
        duree_session = config.duree_session_minutes
        if remember_me:
            duree_session *= 7  # 7 fois plus long si "se souvenir de moi"
        
        session = SessionUtilisateur.objects.create(
            utilisateur=utilisateur,
            session_key=secrets.token_urlsafe(32),
            adresse_ip=adresse_ip,
            user_agent=user_agent[:500],  # Limiter la taille
            type_dispositif=self._detecter_type_dispositif(user_agent),
            date_expiration=timezone.now() + timedelta(minutes=duree_session),
            pays=self._detecter_pays_ip(adresse_ip),
            ville=self._detecter_ville_ip(adresse_ip)
        )
        
        return session
    
    def _finaliser_authentification(self, utilisateur: Utilisateur, session: SessionUtilisateur):
        """Finalise le processus d'authentification."""
        # Réinitialiser les tentatives d'échec
        utilisateur.reset_tentatives_echec()
        
        # Mettre à jour les dates de connexion
        utilisateur.date_derniere_connexion = timezone.now()
        utilisateur.date_derniere_activite = timezone.now()
        utilisateur.save()
        
        # Nettoyer les anciennes sessions
        self.gerer_sessions_utilisateur(utilisateur)
        
        # Journaliser la connexion réussie
        self._journaliser_evenement(
            utilisateur,
            'LOGIN_SUCCESS',
            "Connexion réussie",
            session.adresse_ip,
            metadonnees={
                'session_id': session.id,
                'device_type': session.type_dispositif,
                'user_agent': session.user_agent[:200]
            }
        )
    
    def _get_config_securite(self, societe: Optional[Societe]) -> ConfigurationSecurite:
        """Récupère la configuration de sécurité."""
        if not societe:
            # Configuration par défaut
            return ConfigurationSecurite()
        
        config, created = ConfigurationSecurite.objects.get_or_create(
            societe=societe,
            defaults={
                'mdp_longueur_min': 8,
                'tentatives_max_echec': 5,
                'duree_session_minutes': 480
            }
        )
        return config
    
    def _journaliser_evenement(
        self,
        utilisateur: Optional[Utilisateur],
        type_evenement: str,
        description: str,
        adresse_ip: Optional[str] = None,
        metadonnees: Optional[Dict] = None
    ):
        """Journalise un événement de sécurité."""
        try:
            JournalSecurite.objects.create(
                societe=utilisateur.societe if utilisateur else None,
                utilisateur=utilisateur,
                type_evenement=type_evenement,
                titre=description,
                description=description,
                adresse_ip=adresse_ip,
                metadonnees=metadonnees or {},
                niveau_gravite=self._determiner_niveau_gravite(type_evenement)
            )
        except Exception as e:
            logger.error(f"Erreur journalisation: {str(e)}")
    
    def _journaliser_tentative_echec(self, username: str, adresse_ip: str, raison: str):
        """Journalise une tentative de connexion échouée."""
        self._journaliser_evenement(
            None,
            'LOGIN_FAILED',
            f"Tentative de connexion échouée: {raison}",
            adresse_ip,
            {'username': username, 'reason': raison}
        )
    
    def _determiner_niveau_gravite(self, type_evenement: str) -> str:
        """Détermine le niveau de gravité d'un événement."""
        evenements_critiques = [
            'UNAUTHORIZED_ACCESS', 'BRUTE_FORCE_ATTEMPT', 
            'PRIVILEGE_ESCALATION', 'ACCOUNT_DELETED'
        ]
        evenements_erreur = [
            'LOGIN_FAILED', 'PERMISSION_DENIED', 'ACCOUNT_LOCKED'
        ]
        evenements_warning = [
            'PASSWORD_RESET', 'LOGOUT_FORCED', 'SUSPICIOUS_ACTIVITY'
        ]
        
        if type_evenement in evenements_critiques:
            return 'CRITICAL'
        elif type_evenement in evenements_erreur:
            return 'ERROR'
        elif type_evenement in evenements_warning:
            return 'WARNING'
        else:
            return 'INFO'
    
    def _valider_politique_mot_de_passe(
        self,
        password: str,
        config: ConfigurationSecurite,
        utilisateur: Utilisateur
    ):
        """Valide un mot de passe selon la politique de sécurité."""
        if len(password) < config.mdp_longueur_min:
            raise ValidationError(f"Le mot de passe doit contenir au moins {config.mdp_longueur_min} caractères")
        
        if len(password) > config.mdp_longueur_max:
            raise ValidationError(f"Le mot de passe ne peut pas dépasser {config.mdp_longueur_max} caractères")
        
        if config.mdp_majuscules_requises and not re.search(r'[A-Z]', password):
            raise ValidationError("Le mot de passe doit contenir au moins une majuscule")
        
        if config.mdp_minuscules_requises and not re.search(r'[a-z]', password):
            raise ValidationError("Le mot de passe doit contenir au moins une minuscule")
        
        if config.mdp_chiffres_requis and not re.search(r'[0-9]', password):
            raise ValidationError("Le mot de passe doit contenir au moins un chiffre")
        
        if config.mdp_caracteres_speciaux_requis and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError("Le mot de passe doit contenir au moins un caractère spécial")
        
        # Vérifier que le mot de passe ne contient pas des informations personnelles
        mots_interdits = [
            utilisateur.first_name.lower(),
            utilisateur.last_name.lower(),
            utilisateur.username.lower(),
            utilisateur.email.split('@')[0].lower() if utilisateur.email else ''
        ]
        
        for mot in mots_interdits:
            if mot and len(mot) > 2 and mot in password.lower():
                raise ValidationError("Le mot de passe ne doit pas contenir vos informations personnelles")
    
    def _verifier_historique_mot_de_passe(
        self,
        nouveau_mdp: str,
        utilisateur: Utilisateur,
        config: ConfigurationSecurite
    ):
        """Vérifie que le mot de passe n'a pas été utilisé récemment."""
        historique = utilisateur.historique_mdp or []
        
        for ancien_mdp_info in historique[-config.mdp_historique_taille:]:
            if check_password(nouveau_mdp, ancien_mdp_info['hash']):
                raise ValidationError("Ce mot de passe a été utilisé récemment")
    
    # Méthodes utilitaires
    
    def _detecter_type_dispositif(self, user_agent: str) -> str:
        """Détecte le type de dispositif depuis le User-Agent."""
        ua_lower = user_agent.lower()
        if 'mobile' in ua_lower or 'android' in ua_lower or 'iphone' in ua_lower:
            return 'MOBILE'
        elif 'tablet' in ua_lower or 'ipad' in ua_lower:
            return 'TABLET'
        elif 'macintosh' in ua_lower or 'laptop' in ua_lower:
            return 'LAPTOP'
        else:
            return 'DESKTOP'
    
    def _detecter_pays_ip(self, adresse_ip: str) -> str:
        """Détecte le pays depuis l'adresse IP (simulation)."""
        # En production, utiliser une API de géolocalisation
        return 'France'
    
    def _detecter_ville_ip(self, adresse_ip: str) -> str:
        """Détecte la ville depuis l'adresse IP (simulation)."""
        # En production, utiliser une API de géolocalisation
        return 'Paris'
    
    def _verifier_adresse_ip_autorisee(self, adresse_ip: str, ips_autorisees: List[str]) -> bool:
        """Vérifie si une adresse IP est autorisée."""
        try:
            ip = ipaddress.ip_address(adresse_ip)
            for ip_autorisee in ips_autorisees:
                if '/' in ip_autorisee:
                    # Réseau CIDR
                    if ip in ipaddress.ip_network(ip_autorisee, strict=False):
                        return True
                else:
                    # Adresse IP simple
                    if ip == ipaddress.ip_address(ip_autorisee):
                        return True
            return False
        except ValueError:
            return False
    
    def _generer_jwt_token(self, utilisateur: Utilisateur, session: SessionUtilisateur) -> str:
        """Génère un token JWT pour l'utilisateur."""
        # Simulation - en production, utiliser PyJWT
        payload = {
            'user_id': utilisateur.id,
            'session_id': session.id,
            'exp': session.date_expiration.timestamp()
        }
        return f"jwt_token_{utilisateur.id}_{session.id}"
    
    def _serialiser_donnees_utilisateur(self, utilisateur: Utilisateur) -> Dict[str, Any]:
        """Sérialise les données utilisateur pour la réponse."""
        return {
            'id': utilisateur.id,
            'username': utilisateur.username,
            'email': utilisateur.email,
            'first_name': utilisateur.first_name,
            'last_name': utilisateur.last_name,
            'full_name': utilisateur.get_full_name(),
            'is_staff': utilisateur.is_staff,
            'is_superuser': utilisateur.is_superuser,
            'societe_id': utilisateur.societe_id,
            'societe_nom': utilisateur.societe.raison_sociale if utilisateur.societe else None,
            'last_login': utilisateur.last_login.isoformat() if utilisateur.last_login else None,
            'preferences': utilisateur.preferences_interface
        }
    
    def _get_permissions_utilisateur(self, utilisateur: Utilisateur) -> Dict[str, List[str]]:
        """Récupère toutes les permissions d'un utilisateur."""
        permissions = {}
        
        if utilisateur.is_superuser:
            return {'*': ['admin']}
        
        roles_actifs = RoleUtilisateur.objects.filter(
            utilisateur=utilisateur,
            actif=True,
            date_debut__lte=timezone.now()
        ).filter(
            models.Q(date_fin__isnull=True) | models.Q(date_fin__gt=timezone.now())
        ).select_related('role')
        
        for role_utilisateur in roles_actifs:
            role = role_utilisateur.role
            if role.actif and not role.est_expire:
                for module, actions in role.permissions_modules.items():
                    if module not in permissions:
                        permissions[module] = []
                    permissions[module].extend(actions)
        
        # Supprimer les doublons et trier
        for module in permissions:
            permissions[module] = sorted(list(set(permissions[module])))
        
        return permissions
    
    def _get_methodes_mfa_utilisateur(self, utilisateur: Utilisateur) -> List[str]:
        """Récupère les méthodes MFA disponibles pour un utilisateur."""
        methodes = ['totp']  # TOTP toujours disponible
        
        if utilisateur.codes_recuperation:
            methodes.append('backup_code')
        
        return methodes
    
    def _verifier_contraintes_acces(self, utilisateur: Utilisateur, adresse_ip: str):
        """Vérifie les contraintes d'accès (horaires, etc.)."""
        # Vérifier les horaires d'accès si configurés
        if utilisateur.horaires_acces:
            maintenant = timezone.now()
            jour_semaine = maintenant.weekday()  # 0 = lundi
            heure_actuelle = maintenant.time()
            
            horaires_jour = utilisateur.horaires_acces.get(str(jour_semaine))
            if horaires_jour:
                debut = datetime.strptime(horaires_jour['debut'], '%H:%M').time()
                fin = datetime.strptime(horaires_jour['fin'], '%H:%M').time()
                
                if not (debut <= heure_actuelle <= fin):
                    raise ValidationError("Accès non autorisé à cette heure")
    
    def _envoyer_email_reinitialisation(self, utilisateur: Utilisateur, token: str):
        """Envoie un email de réinitialisation de mot de passe."""
        # En production, utiliser un template d'email professionnel
        sujet = "Réinitialisation de votre mot de passe WiseBook"
        message = f"""
        Bonjour {utilisateur.get_full_name()},
        
        Vous avez demandé la réinitialisation de votre mot de passe.
        
        Cliquez sur ce lien pour réinitialiser votre mot de passe :
        {settings.FRONTEND_URL}/reset-password/{token}
        
        Ce lien expire dans 1 heure.
        
        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
        
        L'équipe WiseBook
        """
        
        try:
            send_mail(
                sujet,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [utilisateur.email],
                fail_silently=False
            )
        except Exception as e:
            logger.error(f"Erreur envoi email réinitialisation: {str(e)}")
            raise