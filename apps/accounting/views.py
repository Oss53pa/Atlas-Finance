"""
Vues API pour le module comptabilité - SYSCOHADA compliant
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone
from decimal import Decimal

from .models import (
    Company, FiscalYear, Journal, ChartOfAccounts,
    JournalEntry, JournalEntryLine, FundCall
)
from .serializers import (
    CompanySerializer, FiscalYearSerializer, JournalSerializer,
    ChartOfAccountsSerializer, JournalEntrySerializer,
    JournalEntryLineSerializer,
    FundCallSerializer, FundCallCreateSerializer
)
from .services.ecriture_service import EcritureService
from .services.validation_service import ValidationService
from .services.plan_comptable_service import PlanComptableService


class CompanyViewSet(viewsets.ModelViewSet):
    """API pour les sociétés"""
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'code', 'rccm_number']
    filterset_fields = ['legal_form', 'activity_sector', 'is_active']

    @action(detail=True, methods=['get'])
    def kpis(self, request, pk=None):
        """KPIs comptables de la société"""
        company = self.get_object()
        fiscal_year = company.fiscal_years.filter(is_active=True).first()
        
        if not fiscal_year:
            return Response({'error': 'Aucun exercice actif'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        service = EcritureService(company, fiscal_year)
        kpis = service.get_company_kpis()
        
        return Response(kpis)


class FiscalYearViewSet(viewsets.ModelViewSet):
    """API pour les exercices comptables"""
    queryset = FiscalYear.objects.all()
    serializer_class = FiscalYearSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['company', 'is_active', 'is_closed']

    @action(detail=True, methods=['post'])
    def close_year(self, request, pk=None):
        """Clôture d'exercice"""
        fiscal_year = self.get_object()
        
        if fiscal_year.is_closed:
            return Response({'error': 'Exercice déjà clôturé'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = EcritureService(fiscal_year.company, fiscal_year)
            result = service.close_fiscal_year()
            
            fiscal_year.is_closed = True
            fiscal_year.closure_date = timezone.now().date()
            fiscal_year.save()
            
            return Response({
                'success': True,
                'closure_entries': result['entries_created'],
                'carried_forward_result': result['result_carried_forward']
            })
            
        except Exception as e:
            return Response({'error': str(e)}, 
                          status=status.HTTP_400_BAD_REQUEST)


class JournalViewSet(viewsets.ModelViewSet):
    """API pour les journaux comptables"""
    queryset = Journal.objects.all()
    serializer_class = JournalSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['code', 'name']
    filterset_fields = ['company', 'journal_type', 'is_active']

    @action(detail=True, methods=['get'])
    def entries(self, request, pk=None):
        """Écritures d'un journal"""
        journal = self.get_object()
        entries = JournalEntry.objects.filter(journal=journal)
        
        # Filtrage par période
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if date_from:
            entries = entries.filter(entry_date__gte=date_from)
        if date_to:
            entries = entries.filter(entry_date__lte=date_to)
        
        serializer = JournalEntrySerializer(entries, many=True)
        return Response(serializer.data)


class ChartOfAccountsViewSet(viewsets.ModelViewSet):
    """API pour le plan comptable SYSCOHADA"""
    queryset = ChartOfAccounts.objects.all()
    serializer_class = ChartOfAccountsSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['account_number', 'name']
    filterset_fields = ['company', 'account_class', 'account_type', 'is_active']

    def get_queryset(self):
        """Filtrer par société de l'utilisateur"""
        return self.queryset.select_related('company')

    @action(detail=False, methods=['get'])
    def syscohada_standard(self, request):
        """Plan comptable SYSCOHADA standard"""
        service = PlanComptableService()
        standard_plan = service.get_syscohada_standard_plan()
        return Response(standard_plan)

    @action(detail=False, methods=['post'])
    def import_syscohada(self, request):
        """Importer le plan comptable SYSCOHADA standard"""
        company_id = request.data.get('company_id')
        if not company_id:
            return Response({'error': 'company_id requis'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            company = Company.objects.get(id=company_id)
            service = PlanComptableService()
            accounts_created = service.import_syscohada_plan(company)
            
            return Response({
                'success': True,
                'accounts_created': accounts_created,
                'message': f'{accounts_created} comptes importés avec succès'
            })
            
        except Company.DoesNotExist:
            return Response({'error': 'Société introuvable'}, 
                          status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, 
                          status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def balance(self, request, pk=None):
        """Balance d'un compte"""
        account = self.get_object()
        fiscal_year = account.company.fiscal_years.filter(is_active=True).first()
        
        if not fiscal_year:
            return Response({'error': 'Aucun exercice actif'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        service = EcritureService(account.company, fiscal_year)
        balance = service.get_account_balance(account.account_number)
        
        return Response({
            'account_number': account.account_number,
            'account_name': account.name,
            'debit_balance': balance['debit'],
            'credit_balance': balance['credit'],
            'net_balance': balance['solde'],
            'balance_type': balance['sens']
        })

    @action(detail=False, methods=['get'], url_path='start_account')
    def start_account(self, request):
        """Récupérer les comptes commençant par un certain code"""
        start_by = request.query_params.get('start_by')
        center_id = request.query_params.get('center_id')

        if not start_by:
            return Response({'error': 'start_by parameter required'},
                          status=status.HTTP_400_BAD_REQUEST)

        queryset = ChartOfAccounts.objects.filter(
            account_number__startswith=start_by,
            is_active=True
        ).select_related('company')

        if center_id:
            # Pour le moment, on filtre par company
            queryset = queryset.filter(company_id=center_id)

        # Sérialiser les données dans le format attendu par le frontend
        accounts = []
        for account in queryset:
            accounts.append({
                'id': account.id,
                'account_number': account.account_number,
                'french_description': account.name
            })

        return Response(accounts)


class JournalEntryViewSet(viewsets.ModelViewSet):
    """API pour les écritures comptables"""
    queryset = JournalEntry.objects.all()
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['reference', 'description']
    filterset_fields = ['company', 'journal', 'fiscal_year', 'status']

    def get_queryset(self):
        return self.queryset.select_related(
            'company', 'journal', 'fiscal_year'
        ).prefetch_related('lines')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Créer une écriture avec validation SYSCOHADA"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Validation métier
        validator = ValidationService()
        validation_result = validator.validate_journal_entry(serializer.validated_data)
        
        if not validation_result['valid']:
            return Response({
                'error': 'Écriture invalide',
                'details': validation_result['errors']
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Création avec numérotation automatique
        entry = serializer.save()
        service = EcritureService(entry.company, entry.fiscal_year)
        service.auto_number_entry(entry)
        
        return Response(self.get_serializer(entry).data, 
                       status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def validate_entry(self, request, pk=None):
        """Valider une écriture"""
        entry = self.get_object()
        
        if entry.status != 'draft':
            return Response({'error': 'Seules les écritures en brouillon peuvent être validées'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        validator = ValidationService()
        result = validator.validate_entry_for_posting(entry)
        
        if result['valid']:
            entry.status = 'validated'
            entry.validated_at = timezone.now()
            entry.validated_by = request.user
            entry.save()
            
            return Response({
                'success': True,
                'message': 'Écriture validée avec succès'
            })
        else:
            return Response({
                'error': 'Écriture non valide',
                'details': result['errors']
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def post_entry(self, request, pk=None):
        """Comptabiliser une écriture"""
        entry = self.get_object()
        
        if entry.status != 'validated':
            return Response({'error': 'Écriture non validée'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = EcritureService(entry.company, entry.fiscal_year)
            service.post_entry(entry)
            
            return Response({
                'success': True,
                'message': 'Écriture comptabilisée avec succès',
                'posting_date': entry.posting_date
            })
            
        except Exception as e:
            return Response({'error': str(e)}, 
                          status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def trial_balance(self, request):
        """Balance générale SYSCOHADA"""
        company_id = request.query_params.get('company_id')
        fiscal_year_id = request.query_params.get('fiscal_year_id')
        
        if not company_id or not fiscal_year_id:
            return Response({'error': 'company_id et fiscal_year_id requis'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            company = Company.objects.get(id=company_id)
            fiscal_year = FiscalYear.objects.get(id=fiscal_year_id)
            
            service = EcritureService(company, fiscal_year)
            trial_balance = service.generate_trial_balance()
            
            return Response({
                'company': company.name,
                'fiscal_year': fiscal_year.name,
                'generated_at': timezone.now(),
                'accounts': trial_balance,
                'totals': service.get_trial_balance_totals(trial_balance)
            })
            
        except (Company.DoesNotExist, FiscalYear.DoesNotExist):
            return Response({'error': 'Société ou exercice introuvable'}, 
                          status=status.HTTP_404_NOT_FOUND)


# class TrialBalanceViewSet(viewsets.ReadOnlyModelViewSet):
#     """API pour les balances générales - À implémenter"""
#     # queryset = TrialBalance.objects.all()
#     # serializer_class = TrialBalanceSerializer
#     # permission_classes = [IsAuthenticated]
#     pass


class FundCallViewSet(viewsets.ModelViewSet):
    """API pour les appels de fonds"""
    queryset = FundCall.objects.all()
    serializer_class = FundCallSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['reference', 'comment']
    filterset_fields = ['is_mark_as_pre_approved', 'company']
    ordering_fields = ['request_date', 'created_at', 'amount_requested']
    ordering = ['-request_date', '-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return FundCallCreateSerializer
        return FundCallSerializer

    def get_queryset(self):
        queryset = FundCall.objects.select_related(
            'company', 'leveling_account_from', 'leveling_account_to', 'create_by_user'
        )

        # Filtres par paramètres de requête
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        center_id = self.request.query_params.get('center_id')

        if start_date:
            queryset = queryset.filter(request_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(request_date__lte=end_date)
        if center_id:
            # Pour le moment, on filtre par company
            queryset = queryset.filter(company_id=center_id)

        return queryset

    def perform_create(self, serializer):
        # Assigner l'utilisateur connecté et une company par défaut
        company = Company.objects.first()  # À adapter selon votre logique
        serializer.save(
            create_by_user=self.request.user,
            company=company
        )

    @action(detail=False, methods=['get'], url_path='all_data')
    def all_data(self, request):
        """Endpoint personnalisé pour récupérer tous les appels de fonds avec filtres"""
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approuver un appel de fonds"""
        fund_call = self.get_object()
        fund_call.is_mark_as_pre_approved = True
        fund_call.save()

        return Response({
            'success': True,
            'message': 'Appel de fonds approuvé avec succès'
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Rejeter un appel de fonds"""
        fund_call = self.get_object()
        fund_call.is_mark_as_pre_approved = False
        fund_call.save()

        return Response({
            'success': True,
            'message': 'Appel de fonds rejeté'
        })