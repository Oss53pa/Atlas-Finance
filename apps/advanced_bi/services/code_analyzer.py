"""
Service d'analyse de code Python pour Paloma
Détecte les erreurs, problèmes de performance, et violations de bonnes pratiques
"""
import logging
import ast
import re
from typing import List, Dict, Any, Optional
from pathlib import Path
import pylint.lint
from radon.complexity import cc_visit
from radon.metrics import mi_visit

from apps.advanced_bi.models import CodeAnalysisResult
from apps.core.models import Company

logger = logging.getLogger(__name__)


class CodeAnalyzer:
    """
    Analyseur de code Python avec détection d'erreurs et suggestions
    """

    def __init__(self, company: Company):
        self.company = company

    def analyze_file(self, file_path: str, user=None) -> Dict[str, Any]:
        """
        Analyse un fichier Python complet

        Args:
            file_path: Chemin du fichier à analyser
            user: Utilisateur effectuant l'analyse

        Returns:
            Dict avec résultats d'analyse
        """
        try:
            # Lire le fichier
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()

            # Différentes analyses
            syntax_errors = self._check_syntax(code, file_path)
            complexity_issues = self._analyze_complexity(code, file_path)
            style_issues = self._check_style(code, file_path)
            security_issues = self._check_security(code, file_path)
            syscohada_issues = self._check_syscohada_compliance(code, file_path)

            # Combiner tous les problèmes
            all_issues = (
                syntax_errors +
                complexity_issues +
                style_issues +
                security_issues +
                syscohada_issues
            )

            # Sauvegarder en base de données
            for issue in all_issues:
                CodeAnalysisResult.objects.create(
                    company=self.company,
                    analyzed_by=user,
                    file_path=file_path,
                    line_number=issue.get('line_number'),
                    column_number=issue.get('column_number'),
                    category=issue['category'],
                    severity=issue['severity'],
                    title=issue['title'],
                    description=issue['description'],
                    code_snippet=issue.get('code_snippet', ''),
                    suggestion=issue.get('suggestion', ''),
                    fixed_code=issue.get('fixed_code', '')
                )

            return {
                'success': True,
                'file_path': file_path,
                'total_issues': len(all_issues),
                'issues_by_severity': self._count_by_severity(all_issues),
                'issues_by_category': self._count_by_category(all_issues),
                'issues': all_issues
            }

        except Exception as e:
            logger.error(f"Erreur analyse fichier {file_path}: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def analyze_code_snippet(self, code: str, context: str = '') -> List[Dict[str, Any]]:
        """
        Analyse un snippet de code

        Args:
            code: Code à analyser
            context: Contexte (ex: fonction, classe)

        Returns:
            Liste d'issues détectées
        """
        issues = []

        # Vérifier syntaxe
        syntax_issues = self._check_syntax(code, '<snippet>')
        issues.extend(syntax_issues)

        # Vérifier sécurité
        security_issues = self._check_security(code, '<snippet>')
        issues.extend(security_issues)

        # Vérifier conformité SYSCOHADA
        syscohada_issues = self._check_syscohada_compliance(code, '<snippet>')
        issues.extend(syscohada_issues)

        return issues

    def _check_syntax(self, code: str, file_path: str) -> List[Dict[str, Any]]:
        """Vérifie les erreurs de syntaxe Python"""
        issues = []

        try:
            ast.parse(code)
        except SyntaxError as e:
            issues.append({
                'category': 'SYNTAX',
                'severity': 'CRITICAL',
                'title': 'Erreur de syntaxe Python',
                'description': f"Erreur de syntaxe: {e.msg}",
                'line_number': e.lineno,
                'column_number': e.offset,
                'code_snippet': e.text.strip() if e.text else '',
                'suggestion': 'Corrigez la syntaxe Python avant de continuer.'
            })

        return issues

    def _analyze_complexity(self, code: str, file_path: str) -> List[Dict[str, Any]]:
        """Analyse la complexité cyclomatique du code"""
        issues = []

        try:
            # Complexité cyclomatique avec radon
            complexity_results = cc_visit(code)

            for result in complexity_results:
                # Seuils de complexité
                if result.complexity > 20:
                    severity = 'CRITICAL'
                    message = 'Complexité très élevée'
                elif result.complexity > 10:
                    severity = 'WARNING'
                    message = 'Complexité élevée'
                else:
                    continue  # Pas de problème

                issues.append({
                    'category': 'PERFORMANCE',
                    'severity': severity,
                    'title': f'{message} dans {result.name}',
                    'description': f"Complexité cyclomatique: {result.complexity}. Recommandation: refactoriser en fonctions plus petites.",
                    'line_number': result.lineno,
                    'suggestion': 'Décomposez cette fonction en plusieurs fonctions plus simples.'
                })

            # Indice de maintenabilité
            mi_results = mi_visit(code, multi=True)
            avg_mi = sum(mi_results) / len(mi_results) if mi_results else 100

            if avg_mi < 20:
                issues.append({
                    'category': 'PERFORMANCE',
                    'severity': 'WARNING',
                    'title': 'Maintenabilité faible',
                    'description': f"Indice de maintenabilité: {avg_mi:.1f}/100. Le code est difficile à maintenir.",
                    'suggestion': 'Simplifiez le code, réduisez la complexité, et améliorez la documentation.'
                })

        except Exception as e:
            logger.error(f"Erreur analyse complexité: {e}")

        return issues

    def _check_style(self, code: str, file_path: str) -> List[Dict[str, Any]]:
        """Vérifie le style et les bonnes pratiques PEP8"""
        issues = []

        # Patterns de mauvaises pratiques
        bad_patterns = [
            {
                'pattern': r'\bexec\b',
                'title': 'Utilisation de exec()',
                'description': 'exec() est dangereux et difficile à maintenir',
                'severity': 'WARNING',
                'category': 'BEST_PRACTICE'
            },
            {
                'pattern': r'\beval\b',
                'title': 'Utilisation de eval()',
                'description': 'eval() peut être dangereux et devrait être évité',
                'severity': 'WARNING',
                'category': 'SECURITY'
            },
            {
                'pattern': r'except\s*:',
                'title': 'Except générique',
                'description': 'Catch d\'exception trop large (except:), spécifiez le type',
                'severity': 'WARNING',
                'category': 'BEST_PRACTICE'
            },
        ]

        lines = code.split('\n')
        for pattern_info in bad_patterns:
            for line_num, line in enumerate(lines, start=1):
                if re.search(pattern_info['pattern'], line):
                    issues.append({
                        'category': pattern_info['category'],
                        'severity': pattern_info['severity'],
                        'title': pattern_info['title'],
                        'description': pattern_info['description'],
                        'line_number': line_num,
                        'code_snippet': line.strip(),
                        'suggestion': 'Utilisez une approche plus sûre et spécifique.'
                    })

        return issues

    def _check_security(self, code: str, file_path: str) -> List[Dict[str, Any]]:
        """Détecte les vulnérabilités de sécurité"""
        issues = []

        security_patterns = [
            {
                'pattern': r'password\s*=\s*["\'][\w]+["\']',
                'title': 'Mot de passe en dur',
                'description': 'Mot de passe en dur dans le code (vulnérabilité de sécurité)',
                'severity': 'CRITICAL',
                'suggestion': 'Utilisez des variables d\'environnement ou un gestionnaire de secrets.'
            },
            {
                'pattern': r'SECRET_KEY\s*=\s*["\'][\w]+["\']',
                'title': 'Clé secrète en dur',
                'description': 'Clé secrète en dur dans le code',
                'severity': 'CRITICAL',
                'suggestion': 'Utilisez django.conf.settings ou des variables d\'environnement.'
            },
            {
                'pattern': r'\.raw\(',
                'title': 'Requête SQL brute',
                'description': 'Utilisation de requête SQL brute (risque d\'injection SQL)',
                'severity': 'WARNING',
                'suggestion': 'Préférez l\'ORM Django pour éviter les injections SQL.'
            },
        ]

        lines = code.split('\n')
        for pattern_info in security_patterns:
            for line_num, line in enumerate(lines, start=1):
                if re.search(pattern_info['pattern'], line, re.IGNORECASE):
                    issues.append({
                        'category': 'SECURITY',
                        'severity': pattern_info['severity'],
                        'title': pattern_info['title'],
                        'description': pattern_info['description'],
                        'line_number': line_num,
                        'code_snippet': line.strip(),
                        'suggestion': pattern_info['suggestion']
                    })

        return issues

    def _check_syscohada_compliance(self, code: str, file_path: str) -> List[Dict[str, Any]]:
        """Vérifie la conformité aux normes SYSCOHADA dans le code"""
        issues = []

        # Patterns spécifiques comptabilité
        syscohada_checks = [
            {
                'pattern': r'Decimal\(["\']0\.',
                'check': lambda line: 'decimal_places' not in line.lower(),
                'title': 'Précision décimale',
                'description': 'Utilisez max_digits et decimal_places pour les montants comptables',
                'severity': 'WARNING',
                'suggestion': 'Utilisez DecimalField avec max_digits=15, decimal_places=2 pour XAF.'
            },
            {
                'pattern': r'FloatField',
                'title': 'Type Float pour montants',
                'description': 'FloatField n\'est pas approprié pour les montants (imprécision)',
                'severity': 'ERROR',
                'suggestion': 'Utilisez DecimalField pour tous les montants monétaires.'
            },
            {
                'pattern': r'delete\(',
                'check': lambda line: 'journal' in line.lower() or 'entry' in line.lower(),
                'title': 'Suppression d\'écriture comptable',
                'description': 'La suppression d\'écritures validées viole la piste d\'audit',
                'severity': 'CRITICAL',
                'suggestion': 'Utilisez un flag is_cancelled au lieu de supprimer.'
            },
        ]

        lines = code.split('\n')
        for check_info in syscohada_checks:
            for line_num, line in enumerate(lines, start=1):
                if re.search(check_info['pattern'], line):
                    # Check additionnel si présent
                    if 'check' in check_info:
                        if not check_info['check'](line):
                            continue

                    issues.append({
                        'category': 'SYSCOHADA_COMPLIANCE',
                        'severity': check_info['severity'],
                        'title': check_info['title'],
                        'description': check_info['description'],
                        'line_number': line_num,
                        'code_snippet': line.strip(),
                        'suggestion': check_info['suggestion']
                    })

        return issues

    def _count_by_severity(self, issues: List[Dict[str, Any]]) -> Dict[str, int]:
        """Compte les issues par sévérité"""
        counts = {'CRITICAL': 0, 'ERROR': 0, 'WARNING': 0, 'INFO': 0}

        for issue in issues:
            severity = issue.get('severity', 'INFO')
            counts[severity] = counts.get(severity, 0) + 1

        return counts

    def _count_by_category(self, issues: List[Dict[str, Any]]) -> Dict[str, int]:
        """Compte les issues par catégorie"""
        counts = {}

        for issue in issues:
            category = issue.get('category', 'OTHER')
            counts[category] = counts.get(category, 0) + 1

        return counts

    def scan_project_directory(
        self,
        directory_path: str,
        extensions: List[str] = ['.py'],
        exclude_patterns: List[str] = ['migrations', '__pycache__', 'venv', '.git']
    ) -> Dict[str, Any]:
        """
        Scan un répertoire complet de projet

        Args:
            directory_path: Chemin du répertoire
            extensions: Extensions de fichiers à analyser
            exclude_patterns: Patterns à exclure

        Returns:
            Résultats d'analyse globaux
        """
        directory = Path(directory_path)
        all_issues = []
        files_analyzed = 0

        try:
            # Parcourir récursivement
            for file_path in directory.rglob('*'):
                # Filtrer par extension
                if file_path.suffix not in extensions:
                    continue

                # Exclure certains patterns
                if any(pattern in str(file_path) for pattern in exclude_patterns):
                    continue

                # Analyser le fichier
                result = self.analyze_file(str(file_path))

                if result['success']:
                    all_issues.extend(result.get('issues', []))
                    files_analyzed += 1

            return {
                'success': True,
                'directory': str(directory),
                'files_analyzed': files_analyzed,
                'total_issues': len(all_issues),
                'issues_by_severity': self._count_by_severity(all_issues),
                'issues_by_category': self._count_by_category(all_issues),
                'critical_files': self._identify_critical_files(all_issues)
            }

        except Exception as e:
            logger.error(f"Erreur scan répertoire: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _identify_critical_files(self, issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identifie les fichiers avec le plus de problèmes critiques"""
        file_counts = {}

        for issue in issues:
            if issue['severity'] in ['CRITICAL', 'ERROR']:
                file_path = issue.get('file_path', 'unknown')
                if file_path not in file_counts:
                    file_counts[file_path] = {'critical': 0, 'error': 0, 'warning': 0}

                if issue['severity'] == 'CRITICAL':
                    file_counts[file_path]['critical'] += 1
                elif issue['severity'] == 'ERROR':
                    file_counts[file_path]['error'] += 1

        # Trier par nombre de critiques
        sorted_files = sorted(
            file_counts.items(),
            key=lambda x: (x[1]['critical'], x[1]['error']),
            reverse=True
        )

        return [
            {
                'file_path': file_path,
                'critical_count': counts['critical'],
                'error_count': counts['error']
            }
            for file_path, counts in sorted_files[:10]  # Top 10
        ]


def get_code_analyzer(company: Company) -> CodeAnalyzer:
    """
    Factory pour créer un analyseur de code

    Args:
        company: Instance Company

    Returns:
        Instance CodeAnalyzer
    """
    return CodeAnalyzer(company)
