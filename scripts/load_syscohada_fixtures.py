"""
Script pour charger les fixtures SYSCOHADA complètes
Charge le plan comptable SYSCOHADA de base
"""
import os
import sys
import django

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wisebook.settings.development')
django.setup()

from apps.core.models import Societe
from apps.accounting.models import ChartOfAccounts
from decimal import Decimal


def load_syscohada_accounts():
    """
    Charge le plan comptable SYSCOHADA de base
    Classes 1-8 avec les comptes principaux
    """
    print("📊 Chargement du plan comptable SYSCOHADA...")

    # Récupérer la société de démo
    try:
        societe = Societe.objects.get(code='DEMO')
    except Societe.DoesNotExist:
        print("❌ Société DEMO non trouvée. Exécutez d'abord setup_phase1.py")
        return

    # Plan comptable SYSCOHADA - Comptes principaux par classe
    accounts_data = [
        # CLASSE 1 - COMPTES DE CAPITAUX
        {'code': '10', 'name': 'CAPITAL', 'account_class': '1', 'account_type': 'TOTAL', 'normal_balance': 'CREDIT'},
        {'code': '101', 'name': 'Capital social', 'account_class': '1', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '11', 'name': 'RÉSERVES', 'account_class': '1', 'account_type': 'TOTAL', 'normal_balance': 'CREDIT'},
        {'code': '111', 'name': 'Réserve légale', 'account_class': '1', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '112', 'name': 'Réserves statutaires', 'account_class': '1', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '12', 'name': 'REPORT À NOUVEAU', 'account_class': '1', 'account_type': 'TOTAL', 'normal_balance': 'CREDIT'},
        {'code': '121', 'name': 'Report à nouveau (solde créditeur)', 'account_class': '1', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '129', 'name': 'Report à nouveau (solde débiteur)', 'account_class': '1', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '13', 'name': 'RÉSULTAT NET DE L\'EXERCICE', 'account_class': '1', 'account_type': 'TOTAL', 'normal_balance': 'CREDIT'},
        {'code': '131', 'name': 'Résultat net : Bénéfice', 'account_class': '1', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '139', 'name': 'Résultat net : Perte', 'account_class': '1', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '16', 'name': 'EMPRUNTS ET DETTES ASSIMILÉES', 'account_class': '1', 'account_type': 'TOTAL', 'normal_balance': 'CREDIT'},
        {'code': '161', 'name': 'Emprunts obligataires', 'account_class': '1', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '162', 'name': 'Emprunts et dettes auprès des établissements de crédit', 'account_class': '1', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},

        # CLASSE 2 - COMPTES D'IMMOBILISATIONS
        {'code': '20', 'name': 'CHARGES IMMOBILISÉES', 'account_class': '2', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '201', 'name': 'Frais d\'établissement', 'account_class': '2', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '22', 'name': 'TERRAINS', 'account_class': '2', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '221', 'name': 'Terrains agricoles et forestiers', 'account_class': '2', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '222', 'name': 'Terrains nus', 'account_class': '2', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '23', 'name': 'BÂTIMENTS, INSTALLATIONS TECHNIQUES', 'account_class': '2', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '231', 'name': 'Bâtiments industriels', 'account_class': '2', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '232', 'name': 'Bâtiments commerciaux', 'account_class': '2', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '24', 'name': 'MATÉRIEL', 'account_class': '2', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '241', 'name': 'Matériel et outillage industriel', 'account_class': '2', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '244', 'name': 'Matériel de bureau et informatique', 'account_class': '2', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '245', 'name': 'Matériel de transport', 'account_class': '2', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '28', 'name': 'AMORTISSEMENTS', 'account_class': '2', 'account_type': 'TOTAL', 'normal_balance': 'CREDIT'},
        {'code': '281', 'name': 'Amortissements des charges immobilisées', 'account_class': '2', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '283', 'name': 'Amortissements des bâtiments', 'account_class': '2', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '284', 'name': 'Amortissements du matériel', 'account_class': '2', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},

        # CLASSE 3 - COMPTES DE STOCKS
        {'code': '31', 'name': 'MARCHANDISES', 'account_class': '3', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '311', 'name': 'Marchandises A', 'account_class': '3', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '32', 'name': 'MATIÈRES PREMIÈRES ET FOURNITURES', 'account_class': '3', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '321', 'name': 'Matières A', 'account_class': '3', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '322', 'name': 'Matières B', 'account_class': '3', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '33', 'name': 'AUTRES APPROVISIONNEMENTS', 'account_class': '3', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '331', 'name': 'Matières consommables', 'account_class': '3', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '332', 'name': 'Fournitures d\'atelier et d\'usine', 'account_class': '3', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '35', 'name': 'PRODUITS FINIS', 'account_class': '3', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '351', 'name': 'Produits finis', 'account_class': '3', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},

        # CLASSE 4 - COMPTES DE TIERS
        {'code': '40', 'name': 'FOURNISSEURS ET COMPTES RATTACHÉS', 'account_class': '4', 'account_type': 'TOTAL', 'normal_balance': 'CREDIT'},
        {'code': '401', 'name': 'Fournisseurs d\'exploitation', 'account_class': '4', 'account_type': 'AUXILIARY', 'normal_balance': 'CREDIT', 'is_reconcilable': True, 'is_auxiliary': True},
        {'code': '404', 'name': 'Fournisseurs d\'immobilisations', 'account_class': '4', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT', 'is_reconcilable': True},
        {'code': '41', 'name': 'CLIENTS ET COMPTES RATTACHÉS', 'account_class': '4', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '411', 'name': 'Clients', 'account_class': '4', 'account_type': 'AUXILIARY', 'normal_balance': 'DEBIT', 'is_reconcilable': True, 'is_auxiliary': True},
        {'code': '416', 'name': 'Clients douteux', 'account_class': '4', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT', 'is_reconcilable': True},
        {'code': '42', 'name': 'PERSONNEL', 'account_class': '4', 'account_type': 'TOTAL', 'normal_balance': 'CREDIT'},
        {'code': '421', 'name': 'Personnel, avances et acomptes', 'account_class': '4', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '422', 'name': 'Personnel, rémunérations dues', 'account_class': '4', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '43', 'name': 'ORGANISMES SOCIAUX', 'account_class': '4', 'account_type': 'TOTAL', 'normal_balance': 'CREDIT'},
        {'code': '431', 'name': 'Sécurité sociale', 'account_class': '4', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '44', 'name': 'ÉTAT ET COLLECTIVITÉS PUBLIQUES', 'account_class': '4', 'account_type': 'TOTAL', 'normal_balance': 'CREDIT'},
        {'code': '441', 'name': 'État, impôt sur les bénéfices', 'account_class': '4', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '442', 'name': 'État, autres impôts et taxes', 'account_class': '4', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '443', 'name': 'Opérations particulières avec l\'État', 'account_class': '4', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '445', 'name': 'TVA facturée', 'account_class': '4', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '446', 'name': 'TVA déductible', 'account_class': '4', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '447', 'name': 'TVA à régulariser', 'account_class': '4', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},

        # CLASSE 5 - COMPTES DE TRÉSORERIE
        {'code': '50', 'name': 'TITRES DE PLACEMENT', 'account_class': '5', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '501', 'name': 'Actions', 'account_class': '5', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '52', 'name': 'BANQUES', 'account_class': '5', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '521', 'name': 'Banques locales', 'account_class': '5', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT', 'is_reconcilable': True},
        {'code': '522', 'name': 'Banques étrangères', 'account_class': '5', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT', 'is_reconcilable': True},
        {'code': '53', 'name': 'ÉTABLISSEMENTS FINANCIERS', 'account_class': '5', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '531', 'name': 'Chèques postaux', 'account_class': '5', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT', 'is_reconcilable': True},
        {'code': '57', 'name': 'CAISSES', 'account_class': '5', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '571', 'name': 'Caisse siège social', 'account_class': '5', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '572', 'name': 'Caisse succursale', 'account_class': '5', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},

        # CLASSE 6 - COMPTES DE CHARGES
        {'code': '60', 'name': 'ACHATS ET VARIATIONS DE STOCKS', 'account_class': '6', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '601', 'name': 'Achats de marchandises', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '602', 'name': 'Achats de matières premières', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '604', 'name': 'Achats de matières consommables', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '605', 'name': 'Achats de fournitures non stockables', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '61', 'name': 'TRANSPORTS', 'account_class': '6', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '611', 'name': 'Transports sur achats', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '612', 'name': 'Transports sur ventes', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '62', 'name': 'SERVICES EXTÉRIEURS A', 'account_class': '6', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '621', 'name': 'Sous-traitance générale', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '622', 'name': 'Locations et charges locatives', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '623', 'name': 'Redevances crédit-bail', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '624', 'name': 'Entretien, réparations et maintenance', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '625', 'name': 'Primes d\'assurances', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '626', 'name': 'Études, recherches et documentation', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '63', 'name': 'SERVICES EXTÉRIEURS B', 'account_class': '6', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '631', 'name': 'Frais bancaires', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '632', 'name': 'Rémunérations d\'intermédiaires', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '633', 'name': 'Frais de formation du personnel', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '64', 'name': 'IMPÔTS ET TAXES', 'account_class': '6', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '641', 'name': 'Impôts et taxes directs', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '645', 'name': 'Droits d\'enregistrement', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '66', 'name': 'CHARGES DE PERSONNEL', 'account_class': '6', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '661', 'name': 'Appointements, salaires et commissions', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '662', 'name': 'Primes et gratifications', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '663', 'name': 'Indemnités de congés payés', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '664', 'name': 'Charges sociales', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '67', 'name': 'FRAIS FINANCIERS', 'account_class': '6', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '671', 'name': 'Intérêts des emprunts', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '672', 'name': 'Intérêts bancaires', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '68', 'name': 'DOTATIONS AUX AMORTISSEMENTS', 'account_class': '6', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '681', 'name': 'Dotations aux amortissements d\'exploitation', 'account_class': '6', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},

        # CLASSE 7 - COMPTES DE PRODUITS
        {'code': '70', 'name': 'VENTES', 'account_class': '7', 'account_type': 'TOTAL', 'normal_balance': 'CREDIT'},
        {'code': '701', 'name': 'Ventes de marchandises', 'account_class': '7', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '702', 'name': 'Ventes de produits finis', 'account_class': '7', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '703', 'name': 'Ventes de produits intermédiaires', 'account_class': '7', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '704', 'name': 'Ventes de produits résiduels', 'account_class': '7', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '705', 'name': 'Travaux facturés', 'account_class': '7', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '706', 'name': 'Services vendus', 'account_class': '7', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '707', 'name': 'Produits accessoires', 'account_class': '7', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '71', 'name': 'SUBVENTIONS D\'EXPLOITATION', 'account_class': '7', 'account_type': 'TOTAL', 'normal_balance': 'CREDIT'},
        {'code': '711', 'name': 'Subventions d\'équilibre', 'account_class': '7', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '75', 'name': 'AUTRES PRODUITS DE GESTION COURANTE', 'account_class': '7', 'account_type': 'TOTAL', 'normal_balance': 'CREDIT'},
        {'code': '751', 'name': 'Redevances pour brevets et licences', 'account_class': '7', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '77', 'name': 'REVENUS FINANCIERS', 'account_class': '7', 'account_type': 'TOTAL', 'normal_balance': 'CREDIT'},
        {'code': '771', 'name': 'Intérêts de prêts', 'account_class': '7', 'account_type': 'CREDIT', 'normal_balance': 'CREDIT'},
        {'code': '772', 'name': 'Revenus de titres de participation', 'account_class': '7', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},
        {'code': '773', 'name': 'Escomptes obtenus', 'account_class': '7', 'account_type': 'DETAIL', 'normal_balance': 'CREDIT'},

        # CLASSE 8 - COMPTES SPÉCIAUX
        {'code': '80', 'name': 'ENGAGEMENTS', 'account_class': '8', 'account_type': 'TOTAL', 'normal_balance': 'DEBIT'},
        {'code': '801', 'name': 'Engagements de financement', 'account_class': '8', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
        {'code': '802', 'name': 'Engagements de garantie', 'account_class': '8', 'account_type': 'DETAIL', 'normal_balance': 'DEBIT'},
    ]

    created = 0
    updated = 0
    skipped = 0

    for acc_data in accounts_data:
        defaults = {
            'name': acc_data['name'],
            'account_class': acc_data['account_class'],
            'account_type': acc_data['account_type'],
            'normal_balance': acc_data['normal_balance'],
            'is_reconcilable': acc_data.get('is_reconcilable', False),
            'is_auxiliary': acc_data.get('is_auxiliary', False),
            'allow_direct_entry': acc_data['account_type'] != 'TOTAL',
            'is_active': True
        }

        account, created_flag = ChartOfAccounts.objects.update_or_create(
            company=societe,
            code=acc_data['code'],
            defaults=defaults
        )

        if created_flag:
            created += 1
            print(f"   ✓ {acc_data['code']} - {acc_data['name']}")
        else:
            updated += 1

    print(f"\n📊 Résumé:")
    print(f"   - Créés: {created}")
    print(f"   - Mis à jour: {updated}")
    print(f"   - Total: {ChartOfAccounts.objects.filter(company=societe).count()} comptes")


if __name__ == '__main__':
    try:
        load_syscohada_accounts()
        print("\n✅ Fixtures SYSCOHADA chargées avec succès!")
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
