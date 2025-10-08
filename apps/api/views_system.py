from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from django.db.models import Count
from django.contrib.auth import get_user_model

User = get_user_model()


@api_view(['GET'])
@permission_classes([AllowAny])
def system_info(request):
    return Response({
        'name': 'WiseBook ERP',
        'version': '3.0.0',
        'description': 'Système ERP Comptable et Financier SYSCOHADA',
        'environment': settings.DEBUG and 'development' or 'production',
        'features': {
            'syscohada_compliant': True,
            'multi_currency': True,
            'ssl_enabled': True,
            'modules_count': 10,
        }
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def system_stats(request):
    from apps.company.models import Company

    try:
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        total_companies = Company.objects.count()
        active_companies = Company.objects.filter(actif=True).count()
    except Exception:
        total_users = 0
        active_users = 0
        total_companies = 0
        active_companies = 0

    return Response({
        'users': {
            'total': total_users,
            'active': active_users,
        },
        'companies': {
            'total': total_companies,
            'active': active_companies,
        },
        'system': {
            'uptime': '99.9%',
            'database': 'PostgreSQL',
            'cache': 'Redis',
        }
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def system_modules(request):
    modules = [
        {
            'id': 'accounting',
            'name': 'Comptabilité',
            'description': 'Plan comptable SYSCOHADA, écritures, journaux, grand livre',
            'icon': 'Calculator',
            'route': '/accounting',
            'color': '#4F46E5',
            'active': True,
            'features': ['SYSCOHADA', 'Écritures', 'Journaux', 'Grand Livre']
        },
        {
            'id': 'treasury',
            'name': 'Trésorerie',
            'description': 'Gestion bancaire, rapprochements, flux de trésorerie',
            'icon': 'Wallet',
            'route': '/treasury',
            'color': '#059669',
            'active': True,
            'features': ['Comptes bancaires', 'Rapprochements', 'Cash flow']
        },
        {
            'id': 'assets',
            'name': 'Immobilisations',
            'description': 'Actifs fixes, amortissements, plus/moins-values',
            'icon': 'Package',
            'route': '/assets',
            'color': '#DC2626',
            'active': True,
            'features': ['Registre actifs', 'Amortissements', 'Cessions']
        },
        {
            'id': 'analytics',
            'name': 'Analytique',
            'description': 'Axes analytiques, centres de coûts, tableaux de bord',
            'icon': 'PieChart',
            'route': '/analytics',
            'color': '#7C2D12',
            'active': True,
            'features': ['Axes analytiques', 'Centres de coûts', 'Reporting']
        },
        {
            'id': 'budgeting',
            'name': 'Budget',
            'description': 'Budgets prévisionnels, contrôle budgétaire, écarts',
            'icon': 'Target',
            'route': '/budgeting',
            'color': '#BE185D',
            'active': True,
            'features': ['Budgets', 'Contrôle', 'Écarts']
        },
        {
            'id': 'taxation',
            'name': 'Fiscalité',
            'description': 'Déclarations TVA, IS, télédéclarations fiscales',
            'icon': 'FileText',
            'route': '/taxation',
            'color': '#9333EA',
            'active': True,
            'features': ['TVA', 'IS', 'Télédéclarations']
        },
        {
            'id': 'third-party',
            'name': 'Tiers',
            'description': 'Clients, fournisseurs, contacts et recouvrement',
            'icon': 'Users',
            'route': '/third-party',
            'color': '#0891B2',
            'active': True,
            'features': ['Clients', 'Fournisseurs', 'Contacts']
        },
        {
            'id': 'reporting',
            'name': 'Reporting',
            'description': 'Rapports personnalisés, tableaux de bord dynamiques',
            'icon': 'BarChart3',
            'route': '/reporting',
            'color': '#EA580C',
            'active': True,
            'features': ['Rapports', 'Dashboards', 'Export']
        },
        {
            'id': 'security',
            'name': 'Sécurité',
            'description': 'Utilisateurs, rôles, permissions, audit de sécurité',
            'icon': 'Shield',
            'route': '/security',
            'color': '#1F2937',
            'active': True,
            'features': ['Utilisateurs', 'Rôles', 'Audit']
        },
    ]

    return Response({
        'count': len(modules),
        'modules': modules
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def global_search(request):
    query = request.data.get('query', '').strip()

    if not query or len(query) < 2:
        return Response({
            'results': [],
            'message': 'Requête trop courte (min. 2 caractères)'
        })

    results = []

    try:
        from apps.tiers.models import ThirdParty
        tiers = ThirdParty.objects.filter(denomination__icontains=query)[:5]
        for tier in tiers:
            results.append({
                'type': 'third_party',
                'title': tier.denomination,
                'subtitle': f'{tier.type_tiers} - {tier.code}',
                'url': f'/third-party/{tier.id}',
                'icon': 'Users'
            })
    except Exception:
        pass

    try:
        from apps.company.models import Company
        companies = Company.objects.filter(nom__icontains=query)[:5]
        for company in companies:
            results.append({
                'type': 'company',
                'title': company.nom,
                'subtitle': f'Société - {company.code}',
                'url': f'/core/companies/{company.id}',
                'icon': 'Building'
            })
    except Exception:
        pass

    return Response({
        'query': query,
        'count': len(results),
        'results': results
    })