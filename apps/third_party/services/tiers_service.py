"""
Service pour la gestion des tiers.
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q, Sum, Count, Avg, Max
from typing import List, Dict, Any, Optional
from ..models import Tiers, AdresseTiers, ContactTiers, HistoriqueTiers
from apps.accounting.models import LigneEcriture, PlanComptable
from apps.core.models import Societe, AuditLog
import re


class TiersService:
    """Service de gestion des tiers."""
    
    def create_tiers(self, data: Dict[str, Any], user) -> Tiers:
        """
        Crée un nouveau tiers.
        
        Args:
            data: Données du tiers
            user: Utilisateur créateur
            
        Returns:
            Tiers: Le tiers créé
        """
        with transaction.atomic():
            # Validation des données
            self._validate_tiers_data(data)
            
            # Génération automatique du code si non fourni
            if not data.get('code'):
                data['code'] = self._generate_code_tiers(
                    data['societe'], 
                    data['type_tiers']
                )
            
            # Attribution automatique des comptes si non spécifiés
            if not data.get('compte_client') and data['type_tiers'] in ['CLIENT', 'CLIENT_FOURNISSEUR']:
                data['compte_client'] = self._get_default_compte_client(data['societe'])
            
            if not data.get('compte_fournisseur') and data['type_tiers'] in ['FOURNISSEUR', 'CLIENT_FOURNISSEUR']:
                data['compte_fournisseur'] = self._get_default_compte_fournisseur(data['societe'])
            
            # Création du tiers
            tiers = Tiers.objects.create(
                societe=data['societe'],
                code=data['code'],
                type_tiers=data['type_tiers'],
                raison_sociale=data['raison_sociale'],
                nom_commercial=data.get('nom_commercial'),
                sigle=data.get('sigle'),
                forme_juridique=data.get('forme_juridique'),
                rccm=data.get('rccm'),
                nif=data.get('nif'),
                niu=data.get('niu'),
                numero_tva=data.get('numero_tva'),
                email=data.get('email'),
                telephone=data.get('telephone'),
                mobile=data.get('mobile'),
                fax=data.get('fax'),
                site_web=data.get('site_web'),
                compte_client=data.get('compte_client'),
                compte_fournisseur=data.get('compte_fournisseur'),
                conditions_paiement=data.get('conditions_paiement', 30),
                mode_reglement=data.get('mode_reglement', 'VIREMENT'),
                devise=data['devise'],
                limite_credit=data.get('limite_credit', 0),
                plafond_escompte=data.get('plafond_escompte', 0),
                taux_remise=data.get('taux_remise', 0),
                taux_escompte=data.get('taux_escompte', 0),
                exonere_tva=data.get('exonere_tva', False),
                numero_exoneration_tva=data.get('numero_exoneration_tva'),
                iban=data.get('iban'),
                bic=data.get('bic'),
                domiciliation=data.get('domiciliation'),
                secteur_activite=data.get('secteur_activite'),
                effectif=data.get('effectif'),
                capital=data.get('capital'),
                chiffre_affaires=data.get('chiffre_affaires'),
                date_creation_entreprise=data.get('date_creation_entreprise'),
                date_premiere_relation=data.get('date_premiere_relation', timezone.now().date()),
                observations=data.get('observations'),
                tags=data.get('tags', []),
                created_by=user
            )
            
            # Création de l'adresse principale si fournie
            if data.get('adresse'):
                self._create_adresse_principale(tiers, data['adresse'])
            
            # Création du contact principal si fourni
            if data.get('contact'):
                self._create_contact_principal(tiers, data['contact'])
            
            # Historique
            HistoriqueTiers.objects.create(
                tiers=tiers,
                action='CREATE',
                description=f"Création du tiers {tiers.code}",
                nouvelles_valeurs=self._tiers_to_dict(tiers),
                utilisateur=user
            )
            
            # Log d'audit
            AuditLog.objects.create(
                table_name='Tiers',
                operation='CREATE',
                record_id=str(tiers.id),
                old_values={},
                new_values=self._tiers_to_dict(tiers),
                user=user,
                timestamp=timezone.now()
            )
            
            return tiers
    
    def update_tiers(self, tiers: Tiers, data: Dict[str, Any], user) -> Tiers:
        """
        Met à jour un tiers existant.
        
        Args:
            tiers: Tiers à modifier
            data: Nouvelles données
            user: Utilisateur modificateur
            
        Returns:
            Tiers: Le tiers modifié
        """
        old_values = self._tiers_to_dict(tiers)
        
        with transaction.atomic():
            # Champs modifiables
            modifiable_fields = [
                'raison_sociale', 'nom_commercial', 'sigle', 'forme_juridique',
                'rccm', 'nif', 'niu', 'numero_tva', 'email', 'telephone',
                'mobile', 'fax', 'site_web', 'conditions_paiement',
                'mode_reglement', 'limite_credit', 'plafond_escompte',
                'taux_remise', 'taux_escompte', 'exonere_tva',
                'numero_exoneration_tva', 'iban', 'bic', 'domiciliation',
                'secteur_activite', 'effectif', 'capital', 'chiffre_affaires',
                'observations', 'tags'
            ]
            
            changes = {}
            for field in modifiable_fields:
                if field in data:
                    old_value = getattr(tiers, field)
                    new_value = data[field]
                    if old_value != new_value:
                        setattr(tiers, field, new_value)
                        changes[field] = {'old': old_value, 'new': new_value}
            
            if changes:
                tiers.updated_by = user
                tiers.save()
                
                # Historique
                HistoriqueTiers.objects.create(
                    tiers=tiers,
                    action='UPDATE',
                    description=f"Modification du tiers {tiers.code}",
                    anciennes_valeurs=old_values,
                    nouvelles_valeurs=self._tiers_to_dict(tiers),
                    utilisateur=user
                )
                
                # Log d'audit
                AuditLog.objects.create(
                    table_name='Tiers',
                    operation='UPDATE',
                    record_id=str(tiers.id),
                    old_values=old_values,
                    new_values=self._tiers_to_dict(tiers),
                    user=user,
                    timestamp=timezone.now()
                )
            
            return tiers
    
    def bloquer_tiers(self, tiers: Tiers, motif: str, user) -> Tiers:
        """
        Bloque un tiers.
        
        Args:
            tiers: Tiers à bloquer
            motif: Motif du blocage
            user: Utilisateur
            
        Returns:
            Tiers: Le tiers bloqué
        """
        if tiers.statut == 'BLOQUE':
            raise ValidationError("Ce tiers est déjà bloqué")
        
        old_values = self._tiers_to_dict(tiers)
        
        with transaction.atomic():
            tiers.statut = 'BLOQUE'
            tiers.motif_blocage = motif
            tiers.date_blocage = timezone.now()
            tiers.bloque_par = user
            tiers.updated_by = user
            tiers.save()
            
            # Historique
            HistoriqueTiers.objects.create(
                tiers=tiers,
                action='BLOCK',
                description=f"Blocage du tiers {tiers.code}: {motif}",
                anciennes_valeurs=old_values,
                nouvelles_valeurs=self._tiers_to_dict(tiers),
                utilisateur=user
            )
            
            return tiers
    
    def debloquer_tiers(self, tiers: Tiers, user) -> Tiers:
        """
        Débloque un tiers.
        
        Args:
            tiers: Tiers à débloquer
            user: Utilisateur
            
        Returns:
            Tiers: Le tiers débloqué
        """
        if tiers.statut != 'BLOQUE':
            raise ValidationError("Ce tiers n'est pas bloqué")
        
        old_values = self._tiers_to_dict(tiers)
        
        with transaction.atomic():
            tiers.statut = 'ACTIF'
            tiers.motif_blocage = None
            tiers.date_blocage = None
            tiers.bloque_par = None
            tiers.updated_by = user
            tiers.save()
            
            # Historique
            HistoriqueTiers.objects.create(
                tiers=tiers,
                action='UNBLOCK',
                description=f"Déblocage du tiers {tiers.code}",
                anciennes_valeurs=old_values,
                nouvelles_valeurs=self._tiers_to_dict(tiers),
                utilisateur=user
            )
            
            return tiers
    
    def calculer_encours(self, tiers: Tiers) -> Dict[str, Any]:
        """
        Calcule l'encours détaillé d'un tiers.
        
        Args:
            tiers: Tiers concerné
            
        Returns:
            Dict: Détails de l'encours
        """
        result = {
            'encours_client': Decimal('0'),
            'encours_fournisseur': Decimal('0'),
            'credit_disponible': Decimal('0'),
            'nb_factures_impayees': 0,
            'retard_moyen': 0,
            'plus_ancienne_facture': None
        }
        
        # Encours client
        if tiers.is_client and tiers.compte_client:
            lignes_client = LigneEcriture.objects.filter(
                compte=tiers.compte_client,
                tiers=tiers,
                ecriture__statut='VALIDE',
                lettrage__isnull=True
            )
            
            solde_client = lignes_client.aggregate(
                debit=Sum('debit') or Decimal('0'),
                credit=Sum('credit') or Decimal('0')
            )
            
            result['encours_client'] = max(0, solde_client['debit'] - solde_client['credit'])
            result['nb_factures_impayees'] = lignes_client.filter(debit__gt=0).count()
            
            # Plus ancienne facture
            plus_ancienne = lignes_client.filter(debit__gt=0).order_by('ecriture__date_ecriture').first()
            if plus_ancienne:
                result['plus_ancienne_facture'] = plus_ancienne.ecriture.date_ecriture
                jours_retard = (timezone.now().date() - plus_ancienne.ecriture.date_ecriture).days
                result['retard_moyen'] = max(0, jours_retard - tiers.conditions_paiement)
        
        # Encours fournisseur
        if tiers.is_fournisseur and tiers.compte_fournisseur:
            lignes_fournisseur = LigneEcriture.objects.filter(
                compte=tiers.compte_fournisseur,
                tiers=tiers,
                ecriture__statut='VALIDE',
                lettrage__isnull=True
            )
            
            solde_fournisseur = lignes_fournisseur.aggregate(
                debit=Sum('debit') or Decimal('0'),
                credit=Sum('credit') or Decimal('0')
            )
            
            result['encours_fournisseur'] = max(0, solde_fournisseur['credit'] - solde_fournisseur['debit'])
        
        # Crédit disponible
        result['credit_disponible'] = max(0, tiers.limite_credit - result['encours_client'])
        
        # Mise à jour des champs calculés
        tiers.encours_actuel = result['encours_client']
        tiers.retard_moyen = result['retard_moyen']
        tiers.save(update_fields=['encours_actuel', 'retard_moyen'])
        
        return result
    
    def get_balance_aged(self, tiers: Tiers, date_reference=None) -> Dict[str, Any]:
        """
        Calcule la balance âgée d'un tiers.
        
        Args:
            tiers: Tiers concerné
            date_reference: Date de référence (défaut: aujourd'hui)
            
        Returns:
            Dict: Balance âgée par tranche d'âge
        """
        if not date_reference:
            date_reference = timezone.now().date()
        
        result = {
            'non_echu': Decimal('0'),
            '1_30_jours': Decimal('0'),
            '31_60_jours': Decimal('0'),
            '61_90_jours': Decimal('0'),
            '91_180_jours': Decimal('0'),
            'plus_180_jours': Decimal('0'),
            'total': Decimal('0'),
            'details': []
        }
        
        if not (tiers.is_client and tiers.compte_client):
            return result
        
        # Récupération des lignes non lettrées
        lignes = LigneEcriture.objects.filter(
            compte=tiers.compte_client,
            tiers=tiers,
            ecriture__statut='VALIDE',
            lettrage__isnull=True,
            debit__gt=0
        ).select_related('ecriture', 'ecriture__journal')
        
        for ligne in lignes:
            montant = ligne.debit
            date_echeance = ligne.ecriture.date_ecriture + timezone.timedelta(days=tiers.conditions_paiement)
            jours_retard = (date_reference - date_echeance).days
            
            # Classification par âge
            if jours_retard <= 0:
                result['non_echu'] += montant
                tranche = 'Non échu'
            elif jours_retard <= 30:
                result['1_30_jours'] += montant
                tranche = '1-30 jours'
            elif jours_retard <= 60:
                result['31_60_jours'] += montant
                tranche = '31-60 jours'
            elif jours_retard <= 90:
                result['61_90_jours'] += montant
                tranche = '61-90 jours'
            elif jours_retard <= 180:
                result['91_180_jours'] += montant
                tranche = '91-180 jours'
            else:
                result['plus_180_jours'] += montant
                tranche = '+180 jours'
            
            result['details'].append({
                'piece': ligne.ecriture.numero_piece,
                'date': ligne.ecriture.date_ecriture.isoformat(),
                'date_echeance': date_echeance.isoformat(),
                'montant': float(montant),
                'jours_retard': jours_retard,
                'tranche': tranche
            })
        
        result['total'] = sum([
            result['non_echu'], result['1_30_jours'], result['31_60_jours'],
            result['61_90_jours'], result['91_180_jours'], result['plus_180_jours']
        ])
        
        return result
    
    def get_suggestions_tiers(self, query: str, type_tiers: str = None, societe: Societe = None, limit: int = 10) -> List[Dict]:
        """
        Retourne des suggestions de tiers basées sur une recherche.
        
        Args:
            query: Terme de recherche
            type_tiers: Type de tiers (optionnel)
            societe: Société (optionnel)
            limit: Nombre maximum de suggestions
            
        Returns:
            List[Dict]: Suggestions de tiers
        """
        filters = Q(is_active=True, statut='ACTIF')
        
        if societe:
            filters &= Q(societe=societe)
        
        if type_tiers:
            filters &= Q(type_tiers=type_tiers)
        
        # Recherche textuelle
        search_filters = (
            Q(code__icontains=query) |
            Q(raison_sociale__icontains=query) |
            Q(nom_commercial__icontains=query) |
            Q(nif__icontains=query) |
            Q(rccm__icontains=query) |
            Q(email__icontains=query)
        )
        
        tiers = Tiers.objects.filter(filters & search_filters).order_by('code')[:limit]
        
        suggestions = []
        for t in tiers:
            suggestions.append({
                'id': t.id,
                'code': t.code,
                'raison_sociale': t.raison_sociale,
                'nom_commercial': t.nom_commercial,
                'nom_complet': t.nom_complet,
                'type_tiers': t.type_tiers,
                'email': t.email,
                'telephone': t.telephone,
                'encours_actuel': float(t.encours_actuel),
                'limite_credit': float(t.limite_credit)
            })
        
        return suggestions
    
    def _validate_tiers_data(self, data: Dict[str, Any]) -> None:
        """Valide les données d'un tiers."""
        required_fields = ['societe', 'type_tiers', 'raison_sociale', 'devise']
        
        for field in required_fields:
            if field not in data or not data[field]:
                raise ValidationError(f"Le champ '{field}' est requis")
        
        # Validation du code si fourni
        if data.get('code'):
            if Tiers.objects.filter(societe=data['societe'], code=data['code']).exists():
                raise ValidationError(f"Le code {data['code']} existe déjà pour cette société")
        
        # Validation de l'email
        if data.get('email'):
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, data['email']):
                raise ValidationError("Format d'email invalide")
        
        # Validation des numéros d'identification
        if data.get('nif') and len(data['nif']) < 8:
            raise ValidationError("Le NIF doit contenir au moins 8 caractères")
        
        if data.get('rccm') and len(data['rccm']) < 6:
            raise ValidationError("Le RCCM doit contenir au moins 6 caractères")
    
    def _generate_code_tiers(self, societe: Societe, type_tiers: str) -> str:
        """Génère un code automatique pour un tiers."""
        prefixes = {
            'CLIENT': 'CLI',
            'FOURNISSEUR': 'FOU',
            'CLIENT_FOURNISSEUR': 'CF',
            'SALARIE': 'SAL',
            'BANQUE': 'BQ',
            'ORGANISME_SOCIAL': 'OS',
            'ADMINISTRATION': 'ADM',
            'AUTRE': 'AUT'
        }
        
        prefix = prefixes.get(type_tiers, 'TIE')
        
        # Recherche du dernier numéro utilisé
        last_tiers = Tiers.objects.filter(
            societe=societe,
            code__startswith=prefix
        ).order_by('-code').first()
        
        if last_tiers:
            try:
                last_num = int(last_tiers.code.replace(prefix, ''))
                next_num = last_num + 1
            except ValueError:
                next_num = 1
        else:
            next_num = 1
        
        return f"{prefix}{next_num:06d}"
    
    def _get_default_compte_client(self, societe: Societe) -> PlanComptable:
        """Retourne le compte client par défaut."""
        return PlanComptable.objects.filter(
            societe=societe,
            code__startswith='411',
            collectif=True,
            is_active=True
        ).first()
    
    def _get_default_compte_fournisseur(self, societe: Societe) -> PlanComptable:
        """Retourne le compte fournisseur par défaut."""
        return PlanComptable.objects.filter(
            societe=societe,
            code__startswith='401',
            collectif=True,
            is_active=True
        ).first()
    
    def _create_adresse_principale(self, tiers: Tiers, adresse_data: Dict) -> AdresseTiers:
        """Crée l'adresse principale d'un tiers."""
        return AdresseTiers.objects.create(
            tiers=tiers,
            type_adresse='PRINCIPALE',
            libelle='Adresse principale',
            ligne1=adresse_data['ligne1'],
            ligne2=adresse_data.get('ligne2'),
            ligne3=adresse_data.get('ligne3'),
            code_postal=adresse_data.get('code_postal'),
            ville=adresse_data['ville'],
            region=adresse_data.get('region'),
            pays=adresse_data.get('pays', 'Cameroun'),
            telephone=adresse_data.get('telephone'),
            email=adresse_data.get('email'),
            is_default=True
        )
    
    def _create_contact_principal(self, tiers: Tiers, contact_data: Dict) -> ContactTiers:
        """Crée le contact principal d'un tiers."""
        return ContactTiers.objects.create(
            tiers=tiers,
            civilite=contact_data.get('civilite'),
            nom=contact_data['nom'],
            prenom=contact_data.get('prenom'),
            fonction=contact_data.get('fonction', 'AUTRE'),
            titre=contact_data.get('titre'),
            telephone_fixe=contact_data.get('telephone_fixe'),
            telephone_mobile=contact_data.get('telephone_mobile'),
            email=contact_data.get('email'),
            is_principal=True
        )
    
    def _tiers_to_dict(self, tiers: Tiers) -> Dict[str, Any]:
        """Convertit un tiers en dictionnaire pour l'audit."""
        return {
            'code': tiers.code,
            'type_tiers': tiers.type_tiers,
            'raison_sociale': tiers.raison_sociale,
            'nom_commercial': tiers.nom_commercial,
            'statut': tiers.statut,
            'limite_credit': float(tiers.limite_credit),
            'conditions_paiement': tiers.conditions_paiement,
            'email': tiers.email,
            'telephone': tiers.telephone
        }
    
    def get_tiers_statistics(self, societe: Societe) -> Dict[str, Any]:
        """Retourne des statistiques sur les tiers."""
        tiers_qs = Tiers.objects.filter(societe=societe, is_active=True)
        
        stats = {
            'total': tiers_qs.count(),
            'par_type': {},
            'par_statut': {},
            'encours_total': Decimal('0'),
            'clients_en_retard': 0,
            'limite_credit_moyenne': Decimal('0')
        }
        
        # Répartition par type
        for type_choice in Tiers.TYPE_CHOICES:
            type_code = type_choice[0]
            count = tiers_qs.filter(type_tiers=type_code).count()
            if count > 0:
                stats['par_type'][type_code] = count
        
        # Répartition par statut
        for statut_choice in Tiers.STATUT_CHOICES:
            statut_code = statut_choice[0]
            count = tiers_qs.filter(statut=statut_code).count()
            if count > 0:
                stats['par_statut'][statut_code] = count
        
        # Encours total et moyennes
        encours_data = tiers_qs.aggregate(
            encours_total=Sum('encours_actuel') or Decimal('0'),
            limite_credit_moyenne=Avg('limite_credit') or Decimal('0')
        )
        
        stats.update(encours_data)
        
        # Clients en retard
        stats['clients_en_retard'] = tiers_qs.filter(
            type_tiers__in=['CLIENT', 'CLIENT_FOURNISSEUR'],
            retard_moyen__gt=0
        ).count()
        
        return stats