import json
import time
import logging
from typing import Optional, Dict, Any
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.conf import settings
from datetime import timedelta

from .models import Utilisateur, SessionUtilisateur, JournalSecurite, CleAPI
from .services import AuthService

logger = logging.getLogger(__name__)

class SecurityMiddleware(MiddlewareMixin):
    """
    Middleware de sécurité global pour WiseBook.
    Gère l'authentification, la validation des sessions, et la journalisation.
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.get_response = get_response
        self.auth_service = AuthService()
    
    def process_request(self, request):
        """Traite la requête entrante pour la sécurité."""
        
        # Marquer le début du traitement
        request._security_start_time = time.time()
        request._security_context = {}
        
        # Récupérer l'adresse IP réelle
        request.real_ip = self._get_client_ip(request)
        
        # Initialiser l'utilisateur
        request.user = AnonymousUser()
        
        # Vérifier les en-têtes de sécurité
        if not self._check_security_headers(request):
            return JsonResponse({'error': 'Security headers required'}, status=400)
        
        # Authentification
        user = self._authenticate_request(request)
        if user:
            request.user = user
            request._security_context['user_id'] = user.id
            request._security_context['societe_id'] = user.societe_id if user.societe else None
        
        # Vérifier les limites de taux (rate limiting)
        if not self._check_rate_limits(request):
            self._log_security_event(
                request, 'RATE_LIMIT_EXCEEDED',
                'Limite de taux dépassée', 'WARNING'
            )
            return JsonResponse({'error': 'Rate limit exceeded'}, status=429)
        
        return None
    
    def process_response(self, request, response):
        """Traite la réponse sortante."""
        
        # Ajouter les en-têtes de sécurité
        response = self._add_security_headers(response)
        
        # Journaliser l'accès si nécessaire
        if hasattr(request, 'user') and request.user.is_authenticated:
            self._log_access_if_needed(request, response)
        
        # Mettre à jour l'activité de l'utilisateur
        self._update_user_activity(request)
        
        return response
    
    def process_exception(self, request, exception):
        """Traite les exceptions pour la sécurité."""
        
        # Journaliser les exceptions liées à la sécurité
        if 'security' in str(exception).lower() or 'permission' in str(exception).lower():
            self._log_security_event(
                request, 'SECURITY_EXCEPTION',
                f'Exception de sécurité: {str(exception)}', 'ERROR'
            )
        
        return None
    
    def _get_client_ip(self, request) -> str:
        """Récupère l'adresse IP réelle du client."""
        # Vérifier les en-têtes de proxy
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        
        return ip
    
    def _check_security_headers(self, request) -> bool:
        """Vérifie les en-têtes de sécurité requis."""
        # En production, vérifier des en-têtes comme CSP, CSRF token, etc.
        return True
    
    def _authenticate_request(self, request) -> Optional[Utilisateur]:
        """Authentifie la requête (session ou API key)."""
        
        # 1. Vérifier l'authentification par session
        session_key = request.session.session_key
        if session_key:
            user = self._authenticate_by_session(request, session_key)
            if user:
                return user
        
        # 2. Vérifier l'authentification par token JWT
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            user = self._authenticate_by_jwt(request, token)
            if user:
                return user
        
        # 3. Vérifier l'authentification par API key
        api_key = request.META.get('HTTP_X_API_KEY') or request.GET.get('api_key')
        if api_key:
            user = self._authenticate_by_api_key(request, api_key)
            if user:
                return user
        
        return None
    
    def _authenticate_by_session(self, request, session_key: str) -> Optional[Utilisateur]:
        """Authentifie par session Django/WiseBook."""
        try:
            session = SessionUtilisateur.objects.select_related('utilisateur').filter(
                session_key=session_key,
                active=True,
                date_expiration__gt=timezone.now()
            ).first()
            
            if not session:
                return None
            
            # Vérifier l'adresse IP si configuré
            if session.adresse_ip != request.real_ip:
                # Politique flexible : journaliser mais ne pas bloquer
                self._log_security_event(
                    request, 'IP_CHANGE_DETECTED',
                    f'Changement d\'IP pour la session: {session.adresse_ip} -> {request.real_ip}',
                    'WARNING'
                )
            
            # Prolonger la session
            session.prolonger_session()
            
            return session.utilisateur
            
        except Exception as e:
            logger.error(f"Erreur authentification session: {str(e)}")
            return None
    
    def _authenticate_by_jwt(self, request, token: str) -> Optional[Utilisateur]:
        """Authentifie par token JWT."""
        # En production, décoder et valider le JWT
        # Pour la demo, parsing simple du format jwt_token_{user_id}_{session_id}
        try:
            if token.startswith('jwt_token_'):
                parts = token.split('_')
                if len(parts) >= 4:
                    user_id = int(parts[2])
                    session_id = int(parts[3])
                    
                    session = SessionUtilisateur.objects.select_related('utilisateur').filter(
                        id=session_id,
                        utilisateur_id=user_id,
                        active=True,
                        date_expiration__gt=timezone.now()
                    ).first()
                    
                    if session:
                        return session.utilisateur
            
            return None
            
        except (ValueError, SessionUtilisateur.DoesNotExist):
            return None
    
    def _authenticate_by_api_key(self, request, api_key: str) -> Optional[Utilisateur]:
        """Authentifie par clé API."""
        try:
            cle_api = CleAPI.objects.select_related('utilisateur').filter(
                cle_publique=api_key,
                active=True
            ).first()
            
            if not cle_api or cle_api.est_expiree or cle_api.limite_atteinte:
                return None
            
            # Vérifier les restrictions IP
            if cle_api.adresses_ip_autorisees:
                from .services.auth_service import AuthService
                auth_service = AuthService()
                if not auth_service._verifier_adresse_ip_autorisee(
                    request.real_ip, cle_api.adresses_ip_autorisees
                ):
                    return None
            
            # Incrémenter les compteurs d'utilisation
            cle_api.nb_utilisations_total += 1
            cle_api.nb_utilisations_aujourd_hui += 1
            cle_api.nb_utilisations_cette_heure += 1
            cle_api.date_derniere_utilisation = timezone.now()
            cle_api.save()
            
            # Marquer la requête comme API
            request._security_context['api_key'] = cle_api.id
            request._security_context['auth_method'] = 'api_key'
            
            return cle_api.utilisateur
            
        except Exception as e:
            logger.error(f"Erreur authentification API key: {str(e)}")
            return None
    
    def _check_rate_limits(self, request) -> bool:
        """Vérifie les limites de taux."""
        
        # Identifier l'utilisateur/IP pour les limites
        identifier = None
        if hasattr(request, 'user') and request.user.is_authenticated:
            identifier = f"user_{request.user.id}"
        else:
            identifier = f"ip_{request.real_ip}"
        
        # Définir les limites (requêtes par minute)
        limite_generale = 100  # 100 req/min par défaut
        if hasattr(request, 'user') and request.user.is_authenticated:
            limite_generale = 200  # Plus élevée pour les utilisateurs authentifiés
        
        # Clé de cache
        cache_key = f"rate_limit_{identifier}_{timezone.now().strftime('%Y%m%d_%H%M')}"
        
        # Vérifier/incrémenter le compteur
        current_count = cache.get(cache_key, 0)
        if current_count >= limite_generale:
            return False
        
        # Incrémenter (expire automatiquement après 1 minute)
        cache.set(cache_key, current_count + 1, 60)
        
        return True
    
    def _add_security_headers(self, response):
        """Ajoute les en-têtes de sécurité HTTP."""
        
        # En-têtes de sécurité standard
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        }
        
        # CSP (Content Security Policy)
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https:; "
            "font-src 'self' https:; "
            "object-src 'none'; "
            "media-src 'self'; "
            "form-action 'self';"
        )
        security_headers['Content-Security-Policy'] = csp
        
        # Ajouter les en-têtes
        for header, value in security_headers.items():
            response[header] = value
        
        return response
    
    def _log_access_if_needed(self, request, response):
        """Journalise l'accès si nécessaire."""
        
        # Journaliser seulement certaines actions
        should_log = (
            # Erreurs
            response.status_code >= 400 or
            # Modifications de données
            request.method in ['POST', 'PUT', 'PATCH', 'DELETE'] or
            # Accès aux données sensibles
            any(path in request.path for path in ['/api/', '/admin/', '/settings/'])
        )
        
        if should_log:
            self._log_security_event(
                request, 'DATA_ACCESSED',
                f'{request.method} {request.path} - {response.status_code}',
                'INFO' if response.status_code < 400 else 'WARNING'
            )
    
    def _update_user_activity(self, request):
        """Met à jour l'activité de l'utilisateur."""
        
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return
        
        try:
            # Mettre à jour la dernière activité (avec cache pour éviter trop de DB hits)
            cache_key = f"user_activity_{request.user.id}"
            last_update = cache.get(cache_key)
            
            # Mettre à jour seulement toutes les 5 minutes
            if not last_update or (timezone.now() - last_update).total_seconds() > 300:
                request.user.date_derniere_activite = timezone.now()
                request.user.save(update_fields=['date_derniere_activite'])
                cache.set(cache_key, timezone.now(), 300)
                
        except Exception as e:
            logger.error(f"Erreur mise à jour activité: {str(e)}")
    
    def _log_security_event(
        self,
        request,
        event_type: str,
        description: str,
        severity: str = 'INFO',
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Journalise un événement de sécurité."""
        
        try:
            utilisateur = getattr(request, 'user', None)
            if isinstance(utilisateur, AnonymousUser):
                utilisateur = None
            
            # Préparer les métadonnées
            event_metadata = {
                'url': request.get_full_path(),
                'method': request.method,
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'referer': request.META.get('HTTP_REFERER', ''),
                **(metadata or {})
            }
            
            JournalSecurite.objects.create(
                societe=utilisateur.societe if utilisateur and hasattr(utilisateur, 'societe') else None,
                utilisateur=utilisateur if utilisateur and hasattr(utilisateur, 'id') else None,
                type_evenement=event_type,
                titre=description,
                description=description,
                niveau_gravite=severity,
                adresse_ip=getattr(request, 'real_ip', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                url_demandee=request.get_full_path(),
                methode_http=request.method,
                metadonnees=event_metadata
            )
            
        except Exception as e:
            logger.error(f"Erreur journalisation événement: {str(e)}")

class CSRFExemptMixin:
    """
    Mixin pour exempter certaines vues de la protection CSRF.
    À utiliser avec précaution et seulement pour les APIs.
    """
    
    def dispatch(self, request, *args, **kwargs):
        # Vérifier que c'est bien une requête API avec authentification
        if (request.path.startswith('/api/') and 
            (request.META.get('HTTP_X_API_KEY') or 
             request.META.get('HTTP_AUTHORIZATION'))):
            
            # Exemption CSRF pour les APIs authentifiées
            from django.views.decorators.csrf import csrf_exempt
            return csrf_exempt(super().dispatch)(request, *args, **kwargs)
        
        return super().dispatch(request, *args, **kwargs)

class IPWhitelistMiddleware(MiddlewareMixin):
    """
    Middleware pour whitelist d'IPs (optionnel).
    Utilisé pour restreindre l'accès admin ou certaines sections.
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.get_response = get_response
        self.whitelist_enabled = getattr(settings, 'IP_WHITELIST_ENABLED', False)
        self.allowed_ips = getattr(settings, 'ALLOWED_IPS', [])
        self.admin_only = getattr(settings, 'IP_WHITELIST_ADMIN_ONLY', True)
    
    def process_request(self, request):
        if not self.whitelist_enabled:
            return None
        
        # Appliquer seulement à l'admin si configuré
        if self.admin_only and not request.path.startswith('/admin/'):
            return None
        
        # Récupérer l'IP
        client_ip = self._get_client_ip(request)
        
        # Vérifier si l'IP est dans la whitelist
        if not self._is_ip_allowed(client_ip):
            logger.warning(f"Accès refusé pour IP non autorisée: {client_ip}")
            return JsonResponse({
                'error': 'Access denied from this IP address'
            }, status=403)
        
        return None
    
    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def _is_ip_allowed(self, ip):
        """Vérifie si l'IP est dans la whitelist."""
        if not self.allowed_ips:
            return True  # Pas de restriction si liste vide
        
        try:
            import ipaddress
            client_ip = ipaddress.ip_address(ip)
            
            for allowed_ip in self.allowed_ips:
                if '/' in allowed_ip:
                    # Réseau CIDR
                    if client_ip in ipaddress.ip_network(allowed_ip, strict=False):
                        return True
                else:
                    # Adresse IP simple
                    if client_ip == ipaddress.ip_address(allowed_ip):
                        return True
            
            return False
            
        except ValueError:
            logger.error(f"Format IP invalide: {ip}")
            return False