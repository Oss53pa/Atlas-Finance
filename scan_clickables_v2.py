#!/usr/bin/env python3
"""
Script amélioré pour scanner tous les fichiers TSX et créer un inventaire exhaustif des éléments cliquables.
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Any, Set

class ClickableScanner:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self.clickables = []
        self.red_flags = []
        self.stats = {
            'totalClickables': 0,
            'byType': {},
            'byAction': {},
            'byModule': {}
        }
        self.file_count = 0

    def scan_all_files(self):
        """Scanner tous les fichiers TSX dans le répertoire."""
        tsx_files = list(self.root_dir.rglob('*.tsx'))
        print(f"[*] Scanning {len(tsx_files)} TSX files...")

        for file_path in tsx_files:
            self.file_count += 1
            if self.file_count % 50 == 0:
                print(f"[*] Processed {self.file_count} files, found {len(self.clickables)} clickables...")
            try:
                self.scan_file(file_path)
            except Exception as e:
                print(f"[!] Error scanning {file_path}: {e}")

        self.compute_statistics()

    def scan_file(self, file_path: Path):
        """Scanner un fichier TSX pour trouver tous les éléments cliquables."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='latin-1') as f:
                    content = f.read()
            except Exception as e:
                print(f"[!] Could not read {file_path}: {e}")
                return

        lines = content.split('\n')
        module = self.identify_module(file_path)

        # Rechercher tous les patterns cliquables
        self.find_all_clickables(file_path, content, lines, module)

    def identify_module(self, file_path: Path) -> str:
        """Identifier le module parent basé sur le chemin du fichier."""
        parts = [p.lower() for p in file_path.parts]

        if 'accounting' in parts:
            return 'Comptabilité'
        elif 'treasury' in parts:
            return 'Trésorerie'
        elif 'third-party' in parts or 'tiers' in parts:
            return 'Tiers'
        elif 'assets' in parts:
            return 'Immobilisations'
        elif 'budget' in parts:
            return 'Budget'
        elif 'analytics' in parts:
            return 'Analytique'
        elif 'taxation' in parts or 'fiscalite' in parts:
            return 'Fiscalité'
        elif 'reporting' in parts:
            return 'Reporting'
        elif 'security' in parts:
            return 'Sécurité'
        elif 'settings' in parts or 'config' in parts or 'setup' in parts:
            return 'Configuration'
        elif 'layout' in parts:
            return 'Layout'
        elif 'inventory' in parts:
            return 'Inventaire'
        elif 'recovery' in parts or 'recouvrement' in parts:
            return 'Recouvrement'
        elif 'suppliers' in parts or 'fournisseurs' in parts:
            return 'Fournisseurs'
        elif 'customers' in parts or 'clients' in parts:
            return 'Clients'
        elif 'closures' in parts or 'cloture' in parts:
            return 'Clôtures'
        else:
            return 'Autres'

    def find_all_clickables(self, file_path: Path, content: str, lines: List[str], module: str):
        """Trouver tous les éléments cliquables de manière plus robuste."""

        # Pattern 1: Boutons avec onClick explicite
        button_onclick_pattern = r'<(button|Button)\s+([^>]*?)\s+onClick\s*=\s*\{([^}]+)\}([^>]*)>'
        for match in re.finditer(button_onclick_pattern, content, re.MULTILINE | re.DOTALL):
            self.process_clickable(file_path, content, match, 'button', module, match.group(3))

        # Pattern 2: Link/NavLink avec to
        link_pattern = r'<(Link|NavLink)\s+([^>]*?)\s+to\s*=\s*["{]([^}"]+)[}"]([^>]*)>'
        for match in re.finditer(link_pattern, content, re.MULTILINE | re.DOTALL):
            self.process_clickable(file_path, content, match, 'Link', module, None, match.group(3))

        # Pattern 3: Éléments avec onClick (div, span, etc.)
        onclick_pattern = r'<(div|span|td|tr|li)\s+([^>]*?)\s+onClick\s*=\s*\{([^}]+)\}([^>]*)>'
        for match in re.finditer(onclick_pattern, content, re.MULTILINE | re.DOTALL):
            # Vérifier si c'est vraiment cliquable (cursor-pointer, role, etc.)
            attrs = match.group(2) + match.group(4)
            if 'cursor-pointer' in attrs or 'role="button"' in attrs or 'clickable' in attrs.lower():
                self.process_clickable(file_path, content, match, f'{match.group(1)}-onClick', module, match.group(3))

        # Pattern 4: Icônes avec onClick
        icon_onclick_pattern = r'<([A-Z][a-zA-Z]+)\s+([^>]*?)\s+onClick\s*=\s*\{([^}]+)\}([^>]*)/?>'
        for match in re.finditer(icon_onclick_pattern, content, re.MULTILINE | re.DOTALL):
            icon_name = match.group(1)
            # Liste d'icônes communes de lucide-react
            common_icons = ['X', 'Menu', 'Bell', 'Search', 'User', 'LogOut', 'ChevronRight', 'ChevronDown',
                           'ChevronUp', 'Plus', 'Minus', 'Edit', 'Trash', 'Download', 'Upload', 'Save',
                           'Cancel', 'Check', 'Close', 'Settings', 'Info', 'AlertTriangle', 'Eye', 'EyeOff']
            if icon_name in common_icons:
                self.process_clickable(file_path, content, match, 'icon-button', module, match.group(3))

        # Pattern 5: <a> tags
        a_pattern = r'<a\s+([^>]*?)>'
        for match in re.finditer(a_pattern, content, re.MULTILINE | re.DOTALL):
            attrs = match.group(1)
            href_match = re.search(r'href\s*=\s*["\']([^"\']+)["\']', attrs)
            onclick_match = re.search(r'onClick\s*=\s*\{([^}]+)\}', attrs)
            if href_match or onclick_match:
                href = href_match.group(1) if href_match else None
                onclick = onclick_match.group(1) if onclick_match else None
                self.process_clickable(file_path, content, match, 'a', module, onclick, href)

    def process_clickable(self, file_path: Path, content: str, match, element_type: str, module: str,
                         onclick_code: str = None, route: str = None):
        """Traiter un élément cliquable trouvé."""
        start_pos = match.start()
        line_num = content[:start_pos].count('\n') + 1

        # Extraire les attributs de l'élément
        full_match = match.group(0)

        # Extraire le label
        label = self.extract_label_from_element(content, start_pos, full_match)

        # Extraire aria-label
        aria_label = None
        aria_match = re.search(r'aria-label\s*=\s*["{]([^}"]+)[}"]', full_match)
        if aria_match:
            aria_label = aria_match.group(1)

        # Extraire data-testid
        testid = None
        testid_match = re.search(r'data-testid\s*=\s*["\']([^"\']+)["\']', full_match)
        if testid_match:
            testid = testid_match.group(1)

        # Analyser l'action
        action_type, action_desc = self.analyze_action(onclick_code, route, label)

        # Vérifier l'accessibilité
        has_role = 'role=' in full_match
        has_tabindex = 'tabIndex' in full_match or 'tabindex' in full_match
        keyboard_accessible = element_type in ['button', 'Link', 'NavLink', 'a'] or has_role or has_tabindex

        accessibility = {
            'hasAriaLabel': bool(aria_label),
            'hasRole': has_role,
            'keyboardAccessible': keyboard_accessible
        }

        # Identifier les problèmes
        issues = self.identify_issues(element_type, label, aria_label, onclick_code, action_type,
                                      keyboard_accessible, file_path, line_num)

        # Déterminer le type de handler
        handler_type = 'unknown'
        if onclick_code:
            if '=>' in onclick_code or 'function' in onclick_code:
                handler_type = 'inline'
            else:
                handler_type = 'reference'

        clickable = {
            'id': f'clickable-{len(self.clickables) + 1:04d}',
            'file': str(file_path.relative_to(self.root_dir)),
            'line': line_num,
            'type': element_type,
            'label': label,
            'ariaLabel': aria_label,
            'testId': testid,
            'expectedAction': action_type,
            'actionDescription': action_desc,
            'route': route,
            'module': module,
            'component': file_path.stem,
            'handler': {
                'type': handler_type,
                'code': onclick_code[:200] if onclick_code else None
            },
            'accessibility': accessibility,
            'issues': issues
        }

        self.clickables.append(clickable)

    def extract_label_from_element(self, content: str, start_pos: int, element_str: str) -> str:
        """Extraire le label d'un élément."""
        # Trouver la fermeture du tag d'ouverture
        close_tag_pos = content.find('>', start_pos)
        if close_tag_pos == -1:
            return ''

        # Chercher le contenu jusqu'au prochain <
        next_tag_pos = content.find('<', close_tag_pos + 1)
        if next_tag_pos == -1:
            next_tag_pos = close_tag_pos + 100

        label = content[close_tag_pos + 1:next_tag_pos].strip()

        # Nettoyer le label
        # Enlever les {t(...)}
        label = re.sub(r'\{t\(["\']([^"\']+)["\']\)\}', r'\1', label)
        # Enlever les autres {...}
        label = re.sub(r'\{[^}]*\}', '', label)
        # Nettoyer les espaces multiples
        label = re.sub(r'\s+', ' ', label).strip()

        return label[:100]

    def analyze_action(self, onclick: str, route: str, label: str) -> tuple:
        """Analyser le type d'action effectuée."""

        # Si c'est une navigation simple
        if route and not onclick:
            return 'navigation', f'Navigate to {route}'

        if not onclick:
            return 'unknown', 'No onClick handler'

        onclick_lower = onclick.lower()

        # Détection des toasts
        if 'toast' in onclick_lower or 'showtoast' in onclick_lower or 'addtoast' in onclick_lower:
            # Vérifier si c'est un toast + modal (red flag)
            if 'setshow' in onclick_lower or 'modal' in onclick_lower or 'setisopen' in onclick_lower:
                return 'mixed', 'Shows both toast and modal (RED FLAG)'

            # Extraire le type de toast
            if 'success' in onclick_lower:
                return 'toast', 'Shows success toast'
            elif 'error' in onclick_lower:
                return 'toast', 'Shows error toast'
            elif 'warning' in onclick_lower:
                return 'toast', 'Shows warning toast'
            else:
                return 'toast', 'Shows toast notification'

        # Détection des modales
        modal_keywords = ['setshow', 'setisopen', 'openmodal', 'showmodal', 'setismodalopen']
        if any(kw in onclick_lower for kw in modal_keywords):
            # Essayer d'extraire le nom de la modal
            modal_name = 'unknown modal'
            for kw in ['setshow', 'setisopen', 'setismodalopen']:
                if kw in onclick_lower:
                    idx = onclick_lower.find(kw)
                    if idx != -1:
                        # Prendre les 30 caractères suivants pour le nom
                        modal_name = onclick[idx:idx+30]
                    break
            return 'modal', f'Opens modal: {modal_name}'

        # Détection de la navigation
        if 'navigate' in onclick_lower or 'history.push' in onclick_lower or 'router.push' in onclick_lower:
            # Essayer d'extraire la route
            route_match = re.search(r'navigate\(["\']([^"\']+)["\']\)', onclick)
            if route_match:
                return 'navigation', f'Navigate to {route_match.group(1)}'
            return 'navigation', 'Navigate to another page'

        # Détection des soumissions de formulaire
        if 'submit' in onclick_lower or 'handlesubmit' in onclick_lower:
            return 'form-submit', 'Submit form'

        # Détection des changements d'état
        if onclick_lower.startswith('set') or 'usestate' in onclick_lower:
            return 'state-change', 'Changes component state'

        # Détection des appels API
        if any(kw in onclick_lower for kw in ['fetch', 'axios', 'api.', 'mutate', 'refetch']):
            return 'api-call', 'Makes API request'

        # Détection des téléchargements
        if 'download' in onclick_lower or 'export' in onclick_lower:
            return 'download', 'Triggers download/export'

        # Détection des suppressions
        if 'delete' in onclick_lower or 'remove' in onclick_lower:
            return 'delete', 'Delete operation'

        return 'other', f'Other action: {onclick[:50]}'

    def identify_issues(self, element_type: str, label: str, aria_label: str, onclick: str,
                       action_type: str, keyboard_accessible: bool, file_path: Path, line_num: int) -> list:
        """Identifier les problèmes d'accessibilité et anti-patterns."""
        issues = []

        # Problème 1: Pas de label accessible
        if not label and not aria_label and element_type in ['button', 'icon-button', 'div-onClick']:
            issues.append('missing_accessible_label')

        # Problème 2: Toast au lieu de modal
        if action_type == 'toast' and label and 'modal' in label.lower():
            issues.append('toast_instead_of_modal')
            self.red_flags.append({
                'type': 'toast-instead-of-modal',
                'file': str(file_path.relative_to(self.root_dir)),
                'line': line_num,
                'description': f'Button "{label}" shows toast but label suggests modal',
                'severity': 'high'
            })

        # Problème 3: Handler inline complexe
        if onclick and len(onclick) > 150:
            issues.append('complex_inline_handler')
            self.red_flags.append({
                'type': 'complex-inline-handler',
                'file': str(file_path.relative_to(self.root_dir)),
                'line': line_num,
                'description': f'Complex inline onClick handler ({len(onclick)} chars)',
                'severity': 'medium'
            })

        # Problème 4: Pas d'accessibilité clavier
        if not keyboard_accessible:
            issues.append('not_keyboard_accessible')
            self.red_flags.append({
                'type': 'not-keyboard-accessible',
                'file': str(file_path.relative_to(self.root_dir)),
                'line': line_num,
                'description': f'Clickable {element_type} without keyboard accessibility',
                'severity': 'high'
            })

        # Problème 5: Action mixte (toast + modal)
        if action_type == 'mixed':
            issues.append('mixed_action_toast_modal')
            self.red_flags.append({
                'type': 'mixed-action',
                'file': str(file_path.relative_to(self.root_dir)),
                'line': line_num,
                'description': 'Handler shows both toast and modal',
                'severity': 'high'
            })

        # Problème 6: Icône sans aria-label
        if element_type == 'icon-button' and not aria_label:
            issues.append('icon_without_aria_label')
            self.red_flags.append({
                'type': 'icon-without-aria-label',
                'file': str(file_path.relative_to(self.root_dir)),
                'line': line_num,
                'description': f'Clickable icon without aria-label',
                'severity': 'high'
            })

        return issues

    def compute_statistics(self):
        """Calculer les statistiques de l'inventaire."""
        self.stats['totalClickables'] = len(self.clickables)

        # Par type
        for clickable in self.clickables:
            type_key = clickable['type']
            self.stats['byType'][type_key] = self.stats['byType'].get(type_key, 0) + 1

        # Par action
        for clickable in self.clickables:
            action_key = clickable['expectedAction']
            self.stats['byAction'][action_key] = self.stats['byAction'].get(action_key, 0) + 1

        # Par module
        for clickable in self.clickables:
            module_key = clickable['module']
            self.stats['byModule'][module_key] = self.stats['byModule'].get(module_key, 0) + 1

    def generate_report(self, output_file: str):
        """Générer le rapport JSON final."""

        # Grouper les red flags par type et sévérité
        red_flags_summary = {}
        for flag in self.red_flags:
            flag_type = flag['type']
            if flag_type not in red_flags_summary:
                red_flags_summary[flag_type] = {
                    'count': 0,
                    'severity': flag.get('severity', 'unknown'),
                    'examples': []
                }
            red_flags_summary[flag_type]['count'] += 1
            if len(red_flags_summary[flag_type]['examples']) < 3:
                red_flags_summary[flag_type]['examples'].append({
                    'file': flag['file'],
                    'line': flag['line'],
                    'description': flag['description']
                })

        report = {
            'summary': {
                'totalClickables': self.stats['totalClickables'],
                'totalFiles': self.file_count,
                'totalRedFlags': len(self.red_flags),
                'redFlagsSummary': red_flags_summary
            },
            'statistics': {
                'byType': self.stats['byType'],
                'byAction': self.stats['byAction'],
                'byModule': self.stats['byModule']
            },
            'redFlags': self.red_flags,
            'clickables': self.clickables
        }

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        print(f"\n[+] Report generated: {output_file}")
        print(f"[*] Total clickables found: {self.stats['totalClickables']}")
        print(f"[!] Red flags found: {len(self.red_flags)}")

        print(f"\n[*] Red Flags by Type:")
        for flag_type, info in sorted(red_flags_summary.items(), key=lambda x: x[1]['count'], reverse=True):
            print(f"  - {flag_type}: {info['count']} ({info['severity']} severity)")

        print(f"\n[*] By Type:")
        for type_key, count in sorted(self.stats['byType'].items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"  - {type_key}: {count}")

        print(f"\n[*] By Action:")
        for action_key, count in sorted(self.stats['byAction'].items(), key=lambda x: x[1], reverse=True):
            print(f"  - {action_key}: {count}")

        print(f"\n[*] By Module (Top 10):")
        for module_key, count in sorted(self.stats['byModule'].items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"  - {module_key}: {count}")


if __name__ == '__main__':
    scanner = ClickableScanner('C:\\devs\\WiseBook\\frontend\\src')
    scanner.scan_all_files()
    scanner.generate_report('C:\\devs\\WiseBook\\AUDIT_CLICKABLES_INVENTORY.json')
