"""
Vues API pour la comptabilité analytique multi-axes
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Q
from django.utils import timezone
from decimal import Decimal

from .models import (
    AxeAnalytique, SectionAnalytique, VentilationAnalytique, ModeleVentilation,
    BalanceAnalytique, RepartitionAutomatique, LigneRepartition, TableauBord,
    WidgetTableauBord, CleRepartition
)
from .serializers import (
    AxeAnalytiqueSerializer, SectionAnalytiqueSerializer, VentilationAnalytiqueSerializer,
    ModeleVentilationSerializer, BalanceAnalytiqueSerializer, RepartitionAutomatiqueSerializer,
    LigneRepartitionSerializer, TableauBordSerializer, WidgetTableauBordSerializer,
    CleRepartitionSerializer
)


class AxeAnalytiqueViewSet(viewsets.ModelViewSet):
    """API pour les axes analytiques"""
    queryset = AxeAnalytique.objects.all()
    serializer_class = AxeAnalytiqueSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'libelle', 'description']
    filterset_fields = ['societe', 'type_axe', 'is_active', 'obligatoire', 'hierarchique']
    ordering_fields = ['ordre_affichage', 'code', 'libelle', 'created_at']
    ordering = ['ordre_affichage']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Filtrer par société de l'utilisateur si applicable
        if hasattr(user, 'societe'):
            queryset = queryset.filter(societe=user.societe)

        return queryset

    @action(detail=True, methods=['get'])
    def sections(self, request, pk=None):
        """Récupère toutes les sections d'un axe"""
        axe = self.get_object()
        sections = axe.sections.all()
        serializer = SectionAnalytiqueSerializer(sections, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Statistiques d'un axe analytique"""
        axe = self.get_object()

        stats = {
            'nb_sections': axe.sections.count(),
            'nb_sections_actives': axe.sections.filter(is_active=True).count(),
            'nb_sections_budgetaires': axe.sections.filter(budgetaire=True).count(),
            'nb_comptes_concernes': axe.comptes_concernes.count(),
            'budget_total': float(axe.sections.aggregate(
                total=Sum('budget_annuel')
            )['total'] or Decimal('0')),
        }

        return Response(stats)


class SectionAnalytiqueViewSet(viewsets.ModelViewSet):
    """API pour les sections analytiques"""
    queryset = SectionAnalytique.objects.all()
    serializer_class = SectionAnalytiqueSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'libelle', 'description']
    filterset_fields = ['axe', 'parent', 'responsable', 'budgetaire', 'is_active']
    ordering_fields = ['ordre_affichage', 'code', 'libelle', 'budget_annuel']
    ordering = ['ordre_affichage']

    @action(detail=True, methods=['get'])
    def hierarchy(self, request, pk=None):
        """Récupère la hiérarchie complète de la section"""
        section = self.get_object()

        # Parents
        parents = []
        current = section.parent
        while current:
            parents.insert(0, {
                'id': current.id,
                'code': current.code,
                'libelle': current.libelle,
                'niveau': current.niveau
            })
            current = current.parent

        # Descendants
        descendants = []
        for child in section.get_descendants(include_self=False):
            descendants.append({
                'id': child.id,
                'code': child.code,
                'libelle': child.libelle,
                'niveau': child.niveau
            })

        return Response({
            'section': {
                'id': section.id,
                'code': section.code,
                'libelle': section.libelle,
                'code_complet': section.code_complet,
                'niveau': section.niveau
            },
            'parents': parents,
            'descendants': descendants
        })

    @action(detail=True, methods=['get'])
    def ventilations(self, request, pk=None):
        """Récupère toutes les ventilations d'une section"""
        section = self.get_object()
        ventilations = section.ventilations.all()
        serializer = VentilationAnalytiqueSerializer(ventilations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def balance(self, request, pk=None):
        """Balance analytique de la section"""
        section = self.get_object()
        periode = request.query_params.get('periode')

        balances = section.balances.all()
        if periode:
            balances = balances.filter(periode=periode)

        total_debit = balances.aggregate(total=Sum('mouvement_debit'))['total'] or Decimal('0')
        total_credit = balances.aggregate(total=Sum('mouvement_credit'))['total'] or Decimal('0')
        solde = balances.aggregate(total=Sum('solde_final'))['total'] or Decimal('0')

        return Response({
            'section': section.code_complet,
            'periode': periode,
            'mouvement_debit': float(total_debit),
            'mouvement_credit': float(total_credit),
            'solde_final': float(solde),
            'nb_mouvements': balances.aggregate(total=Sum('nb_mouvements'))['total'] or 0,
            'balances_detail': BalanceAnalytiqueSerializer(balances, many=True).data
        })


class VentilationAnalytiqueViewSet(viewsets.ModelViewSet):
    """API pour les ventilations analytiques"""
    queryset = VentilationAnalytique.objects.select_related('ligne_ecriture', 'section')
    serializer_class = VentilationAnalytiqueSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['libelle', 'reference']
    filterset_fields = ['ligne_ecriture', 'section']
    ordering_fields = ['created_at', 'montant']
    ordering = ['-created_at']

    @action(detail=False, methods=['get'])
    def by_period(self, request):
        """Ventilations par période"""
        date_debut = request.query_params.get('date_debut')
        date_fin = request.query_params.get('date_fin')

        queryset = self.get_queryset()

        if date_debut and date_fin:
            queryset = queryset.filter(
                ligne_ecriture__entry__entry_date__range=[date_debut, date_fin]
            )

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ModeleVentilationViewSet(viewsets.ModelViewSet):
    """API pour les modèles de ventilation"""
    queryset = ModeleVentilation.objects.select_related('societe', 'compte')
    serializer_class = ModeleVentilationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'libelle', 'description']
    filterset_fields = ['societe', 'compte', 'is_active']
    ordering_fields = ['code', 'libelle']
    ordering = ['code']

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Applique un modèle de ventilation à une ligne d'écriture"""
        modele = self.get_object()
        ligne_ecriture_id = request.data.get('ligne_ecriture_id')

        if not ligne_ecriture_id:
            return Response(
                {'error': 'ligne_ecriture_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.accounting.models import JournalEntryLine

        try:
            ligne = JournalEntryLine.objects.get(id=ligne_ecriture_id)
            montant_base = ligne.debit or ligne.credit

            # Créer les ventilations selon le modèle
            ventilations_created = []
            for axe_code, sections in modele.ventilations_defaut.items():
                for section_data in sections:
                    for section_code, pourcentage in section_data.items():
                        section = SectionAnalytique.objects.get(
                            axe__code=axe_code,
                            code=section_code
                        )

                        montant = (montant_base * Decimal(str(pourcentage))) / 100

                        ventilation = VentilationAnalytique.objects.create(
                            ligne_ecriture=ligne,
                            section=section,
                            montant=montant,
                            pourcentage=Decimal(str(pourcentage))
                        )
                        ventilations_created.append(ventilation)

            return Response({
                'success': True,
                'ventilations_created': len(ventilations_created),
                'ventilations': VentilationAnalytiqueSerializer(
                    ventilations_created, many=True
                ).data
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class BalanceAnalytiqueViewSet(viewsets.ModelViewSet):
    """API pour les balances analytiques"""
    queryset = BalanceAnalytique.objects.select_related('societe', 'section', 'compte')
    serializer_class = BalanceAnalytiqueSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['societe', 'section', 'compte', 'exercice', 'periode', 'type_solde']
    ordering_fields = ['periode', 'solde_final', 'nb_mouvements']
    ordering = ['-periode', 'section__code']

    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """Calcule les balances analytiques pour une période"""
        societe_id = request.data.get('societe_id')
        periode = request.data.get('periode')

        if not societe_id or not periode:
            return Response(
                {'error': 'societe_id et periode requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Logique de calcul des balances
        # À implémenter selon les besoins métier

        return Response({
            'success': True,
            'message': 'Calcul des balances en cours'
        })

    @action(detail=False, methods=['get'])
    def synthese(self, request):
        """Synthèse des balances par axe"""
        periode = request.query_params.get('periode')

        queryset = self.get_queryset()
        if periode:
            queryset = queryset.filter(periode=periode)

        synthese = {}
        for balance in queryset:
            axe_code = balance.section.axe.code
            if axe_code not in synthese:
                synthese[axe_code] = {
                    'axe': balance.section.axe.libelle,
                    'total_debit': Decimal('0'),
                    'total_credit': Decimal('0'),
                    'solde': Decimal('0'),
                    'nb_sections': 0
                }

            synthese[axe_code]['total_debit'] += balance.mouvement_debit
            synthese[axe_code]['total_credit'] += balance.mouvement_credit
            synthese[axe_code]['solde'] += balance.solde_final
            synthese[axe_code]['nb_sections'] += 1

        # Convertir en float pour JSON
        for axe in synthese.values():
            axe['total_debit'] = float(axe['total_debit'])
            axe['total_credit'] = float(axe['total_credit'])
            axe['solde'] = float(axe['solde'])

        return Response(synthese)


class RepartitionAutomatiqueViewSet(viewsets.ModelViewSet):
    """API pour les répartitions automatiques"""
    queryset = RepartitionAutomatique.objects.select_related('societe', 'compte_source')
    serializer_class = RepartitionAutomatiqueSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'libelle', 'description']
    filterset_fields = ['societe', 'type_repartition', 'frequence', 'is_active', 'execution_auto']
    ordering_fields = ['code', 'derniere_execution']
    ordering = ['code']

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Exécute une répartition automatique"""
        repartition = self.get_object()
        date_execution = request.data.get('date_execution', timezone.now().date())

        # Logique d'exécution de la répartition
        # À implémenter selon le type de répartition

        repartition.derniere_execution = timezone.now()
        repartition.save()

        return Response({
            'success': True,
            'message': f'Répartition {repartition.code} exécutée',
            'date_execution': date_execution
        })

    @action(detail=False, methods=['get'])
    def to_execute(self, request):
        """Liste des répartitions à exécuter"""
        queryset = self.get_queryset().filter(
            is_active=True,
            execution_auto=True
        )

        # Filtrer celles qui doivent être exécutées
        to_execute = []
        for repartition in queryset:
            # Logique pour déterminer si doit être exécutée
            # Basée sur frequence et derniere_execution
            to_execute.append(repartition)

        serializer = self.get_serializer(to_execute, many=True)
        return Response(serializer.data)


class LigneRepartitionViewSet(viewsets.ModelViewSet):
    """API pour les lignes de répartition"""
    queryset = LigneRepartition.objects.select_related('repartition', 'section_destination')
    serializer_class = LigneRepartitionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['repartition', 'section_destination']
    ordering_fields = ['ordre', 'pourcentage']
    ordering = ['ordre']


class TableauBordViewSet(viewsets.ModelViewSet):
    """API pour les tableaux de bord analytiques"""
    queryset = TableauBord.objects.prefetch_related('axes_analyses', 'utilisateurs_autorises')
    serializer_class = TableauBordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'libelle', 'description']
    filterset_fields = ['societe', 'is_active', 'public', 'favori']
    ordering_fields = ['code', 'libelle']
    ordering = ['code']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Filtrer les tableaux de bord accessibles par l'utilisateur
        queryset = queryset.filter(
            Q(public=True) | Q(utilisateurs_autorises=user)
        ).distinct()

        return queryset

    @action(detail=True, methods=['get'])
    def widgets(self, request, pk=None):
        """Récupère les widgets d'un tableau de bord"""
        tableau = self.get_object()
        widgets = tableau.widgets.filter(is_active=True)
        serializer = WidgetTableauBordSerializer(widgets, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def data(self, request, pk=None):
        """Récupère les données calculées du tableau de bord"""
        tableau = self.get_object()

        # Logique pour calculer les données selon la configuration
        # À implémenter selon les besoins métier

        data = {
            'tableau_bord': tableau.code,
            'configuration': tableau.configuration,
            'widgets': WidgetTableauBordSerializer(
                tableau.widgets.filter(is_active=True), many=True
            ).data,
            'last_update': timezone.now().isoformat()
        }

        return Response(data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplique un tableau de bord"""
        tableau_source = self.get_object()

        # Créer une copie
        tableau_copy = TableauBord.objects.create(
            societe=tableau_source.societe,
            code=f"{tableau_source.code}_COPY",
            libelle=f"{tableau_source.libelle} (Copie)",
            description=tableau_source.description,
            configuration=tableau_source.configuration.copy(),
            public=False
        )

        # Copier les widgets
        for widget in tableau_source.widgets.all():
            WidgetTableauBord.objects.create(
                tableau_bord=tableau_copy,
                titre=widget.titre,
                type_graphique=widget.type_graphique,
                requete=widget.requete.copy(),
                position_x=widget.position_x,
                position_y=widget.position_y,
                largeur=widget.largeur,
                hauteur=widget.hauteur,
                couleurs=widget.couleurs.copy(),
                options_graphique=widget.options_graphique.copy()
            )

        serializer = self.get_serializer(tableau_copy)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class WidgetTableauBordViewSet(viewsets.ModelViewSet):
    """API pour les widgets des tableaux de bord"""
    queryset = WidgetTableauBord.objects.select_related('tableau_bord')
    serializer_class = WidgetTableauBordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['tableau_bord', 'type_graphique', 'is_active']
    ordering_fields = ['position_y', 'position_x']
    ordering = ['position_y', 'position_x']

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Aperçu des données du widget"""
        widget = self.get_object()

        # Exécuter la requête configurée et retourner les données
        # À implémenter selon la configuration du widget

        return Response({
            'widget': widget.titre,
            'type': widget.type_graphique,
            'data': [],  # Données calculées
            'metadata': {
                'last_update': timezone.now().isoformat()
            }
        })


class CleRepartitionViewSet(viewsets.ModelViewSet):
    """API pour les clés de répartition"""
    queryset = CleRepartition.objects.select_related('societe', 'axe')
    serializer_class = CleRepartitionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'libelle', 'description']
    filterset_fields = ['societe', 'axe', 'is_active']
    ordering_fields = ['code', 'date_debut']
    ordering = ['code']

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Applique une clé de répartition à un montant"""
        cle = self.get_object()
        montant = request.data.get('montant')

        if not montant:
            return Response(
                {'error': 'montant requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        montant = Decimal(str(montant))

        # Calculer la répartition selon les coefficients
        repartition = {}
        total_coeff = sum(cle.coefficients.values())

        for section_code, coefficient in cle.coefficients.items():
            montant_section = (montant * Decimal(str(coefficient))) / Decimal(str(total_coeff))
            repartition[section_code] = {
                'coefficient': coefficient,
                'pourcentage': float((Decimal(str(coefficient)) / Decimal(str(total_coeff))) * 100),
                'montant': float(montant_section)
            }

        return Response({
            'cle': cle.code,
            'montant_total': float(montant),
            'repartition': repartition
        })

    @action(detail=False, methods=['get'])
    def active_keys(self, request):
        """Clés de répartition actives à une date donnée"""
        date_ref = request.query_params.get('date', timezone.now().date())

        queryset = self.get_queryset().filter(
            is_active=True,
            date_debut__lte=date_ref
        ).filter(
            Q(date_fin__isnull=True) | Q(date_fin__gte=date_ref)
        )

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
