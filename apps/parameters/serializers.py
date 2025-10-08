"""
Serializers pour le module Paramètres WiseBook ERP V3.0
"""
from rest_framework import serializers
from .models import ParametreSysteme, ConfigurationSociete, JournalParametres, NotificationParametres


class ParametreSystemeSerializer(serializers.ModelSerializer):
    """Serializer pour les paramètres système"""
    
    valeur_typee = serializers.SerializerMethodField()
    
    class Meta:
        model = ParametreSysteme
        fields = [
            'id', 'cle', 'nom', 'description', 'categorie', 'type_valeur',
            'valeur', 'valeur_par_defaut', 'valeur_typee', 'requis',
            'modifiable_runtime', 'visible_interface', 'regex_validation',
            'valeurs_autorisees', 'valeur_min', 'valeur_max', 'groupe',
            'ordre', 'aide', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'valeur_typee']
    
    def get_valeur_typee(self, obj):
        """Retourne la valeur avec le bon type"""
        return obj.get_valeur_typee()
    
    def validate_valeur(self, value):
        """Validation de la valeur selon le type"""
        param_type = self.instance.type_valeur if self.instance else None
        
        if param_type == 'INTEGER':
            try:
                int_value = int(value)
                if self.instance and self.instance.valeur_min is not None:
                    if int_value < self.instance.valeur_min:
                        raise serializers.ValidationError(f"La valeur doit être supérieure à {self.instance.valeur_min}")
                if self.instance and self.instance.valeur_max is not None:
                    if int_value > self.instance.valeur_max:
                        raise serializers.ValidationError(f"La valeur doit être inférieure à {self.instance.valeur_max}")
            except (ValueError, TypeError):
                raise serializers.ValidationError("Valeur entière requise")
        
        elif param_type == 'DECIMAL':
            try:
                from decimal import Decimal
                decimal_value = Decimal(str(value))
                if self.instance and self.instance.valeur_min is not None:
                    if decimal_value < self.instance.valeur_min:
                        raise serializers.ValidationError(f"La valeur doit être supérieure à {self.instance.valeur_min}")
                if self.instance and self.instance.valeur_max is not None:
                    if decimal_value > self.instance.valeur_max:
                        raise serializers.ValidationError(f"La valeur doit être inférieure à {self.instance.valeur_max}")
            except:
                raise serializers.ValidationError("Valeur décimale requise")
        
        elif param_type == 'EMAIL':
            if value and '@' not in value:
                raise serializers.ValidationError("Format email requis")
        
        elif param_type == 'URL':
            if value and not (value.startswith('http://') or value.startswith('https://')):
                raise serializers.ValidationError("URL valide requise")
        
        # Validation des valeurs autorisées
        if self.instance and self.instance.valeurs_autorisees:
            if value not in self.instance.valeurs_autorisees:
                raise serializers.ValidationError(f"Valeur autorisée: {', '.join(self.instance.valeurs_autorisees)}")
        
        # Validation regex
        if self.instance and self.instance.regex_validation:
            import re
            if not re.match(self.instance.regex_validation, str(value)):
                raise serializers.ValidationError("Format invalide")
        
        return value


class ConfigurationSocieteSerializer(serializers.ModelSerializer):
    """Serializer pour la configuration société"""
    
    devise_principale_nom = serializers.CharField(source='devise_principale.libelle', read_only=True)
    devise_principale_code = serializers.CharField(source='devise_principale.code', read_only=True)
    societe_nom = serializers.CharField(source='societe.nom', read_only=True)
    
    class Meta:
        model = ConfigurationSociete
        fields = [
            'id', 'societe', 'societe_nom', 'forme_juridique', 'capital_social',
            'numero_rccm', 'numero_contribuable', 'plan_comptable_type',
            'devise_principale', 'devise_principale_nom', 'devise_principale_code',
            'nb_decimales', 'debut_exercice', 'fin_exercice', 'regime_fiscal',
            'assujetti_tva', 'taux_tva_defaut', 'duree_session',
            'tentatives_connexion_max', 'duree_blocage', 'theme',
            'langue_defaut', 'logo', 'couleur_principale', 'couleur_secondaire',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_nb_decimales(self, value):
        """Validation du nombre de décimales"""
        if not 0 <= value <= 6:
            raise serializers.ValidationError("Le nombre de décimales doit être entre 0 et 6")
        return value
    
    def validate_taux_tva_defaut(self, value):
        """Validation du taux de TVA"""
        if not 0 <= value <= 100:
            raise serializers.ValidationError("Le taux de TVA doit être entre 0 et 100")
        return value
    
    def validate_duree_session(self, value):
        """Validation de la durée de session"""
        if not 5 <= value <= 480:
            raise serializers.ValidationError("La durée de session doit être entre 5 et 480 minutes")
        return value


class JournalParametresSerializer(serializers.ModelSerializer):
    """Serializer pour les paramètres des journaux"""
    
    societe_nom = serializers.CharField(source='societe.nom', read_only=True)
    type_journal_display = serializers.CharField(source='get_type_journal_display', read_only=True)
    
    class Meta:
        model = JournalParametres
        fields = [
            'id', 'societe', 'societe_nom', 'code', 'libelle', 'type_journal',
            'type_journal_display', 'numerotation_auto', 'prefixe', 'suffixe',
            'compteur', 'nb_chiffres', 'contrepartie_obligatoire',
            'lettrage_auto', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_code(self, value):
        """Validation du code journal"""
        if len(value) > 10:
            raise serializers.ValidationError("Le code ne peut dépasser 10 caractères")
        return value.upper()
    
    def validate_nb_chiffres(self, value):
        """Validation du nombre de chiffres"""
        if not 1 <= value <= 10:
            raise serializers.ValidationError("Le nombre de chiffres doit être entre 1 et 10")
        return value
    
    def validate_compteur(self, value):
        """Validation du compteur"""
        if value < 1:
            raise serializers.ValidationError("Le compteur doit être supérieur à 0")
        return value


class NotificationParametresSerializer(serializers.ModelSerializer):
    """Serializer pour les paramètres de notifications"""
    
    societe_nom = serializers.CharField(source='societe.nom', read_only=True)
    evenement_display = serializers.CharField(source='get_evenement_display', read_only=True)
    type_notification_display = serializers.CharField(source='get_type_notification_display', read_only=True)
    
    class Meta:
        model = NotificationParametres
        fields = [
            'id', 'societe', 'societe_nom', 'evenement', 'evenement_display',
            'type_notification', 'type_notification_display', 'actif',
            'destinataires', 'modele_message', 'delai_envoi', 'frequence_max',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_destinataires(self, value):
        """Validation des destinataires"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Les destinataires doivent être une liste")
        
        # Validation des emails si présents
        for destinataire in value:
            if isinstance(destinataire, str) and '@' in destinataire:
                from django.core.validators import validate_email
                try:
                    validate_email(destinataire)
                except:
                    raise serializers.ValidationError(f"Email invalide: {destinataire}")
        
        return value
    
    def validate_delai_envoi(self, value):
        """Validation du délai d'envoi"""
        if value < 0:
            raise serializers.ValidationError("Le délai d'envoi ne peut être négatif")
        return value
    
    def validate_frequence_max(self, value):
        """Validation de la fréquence max"""
        if value < 1:
            raise serializers.ValidationError("La fréquence maximum doit être au moins 1")
        return value


class BulkParameterUpdateSerializer(serializers.Serializer):
    """Serializer pour la mise à jour en masse des paramètres"""
    
    parametres = serializers.DictField(
        child=serializers.CharField(),
        help_text="Dictionnaire {cle: valeur} des paramètres à mettre à jour"
    )
    
    def validate_parametres(self, value):
        """Validation des paramètres"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Les paramètres doivent être un dictionnaire")
        
        if len(value) == 0:
            raise serializers.ValidationError("Au moins un paramètre est requis")
        
        # Vérifier que les clés existent
        existing_keys = ParametreSysteme.objects.filter(
            cle__in=value.keys(),
            modifiable_runtime=True
        ).values_list('cle', flat=True)
        
        for key in value.keys():
            if key not in existing_keys:
                raise serializers.ValidationError(f"Paramètre non modifiable ou inexistant: {key}")
        
        return value