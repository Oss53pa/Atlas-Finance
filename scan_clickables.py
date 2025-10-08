#!/usr/bin/env python3
"""
Script pour scanner tous les fichiers TSX et créer un inventaire exhaustif des éléments cliquables.
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

    def scan_all_files(self):
        """Scanner tous les fichiers TSX dans le répertoire."""
        tsx_files = list(self.root_dir.rglob('*.tsx'))
        print(f"[*] Scanning {len(tsx_files)} TSX files...")

        for file_path in tsx_files:
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

        # Déterminer le module parent
        module = self.identify_module(file_path)

        # Patterns à rechercher
        self.find_buttons(file_path, content, lines, module)
        self.find_links(file_path, content, lines, module)
        self.find_onclick_handlers(file_path, content, lines, module)
        self.find_icon_buttons(file_path, content, lines, module)
        self.find_role_buttons(file_path, content, lines, module)

    def identify_module(self, file_path: Path) -> str:
        """Identifier le module parent basé sur le chemin du fichier."""
        parts = file_path.parts

        # Mapping des chemins vers modules
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
        elif 'taxation' in parts:
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

    def find_buttons(self, file_path: Path, content: str, lines: List[str], module: str):
        """Trouver tous les boutons <button> et <Button>."""
        # Pattern pour <button ou <Button
        button_pattern = re.compile(
            r'<(button|Button)[\s\n]([^>]*?)>',
            re.MULTILINE | re.DOTALL
        )

        for match in button_pattern.finditer(content):
            tag_type = match.group(1)
            attributes = match.group(2)
            start_pos = match.start()

            # Trouver le numéro de ligne
            line_num = content[:start_pos].count('\n') + 1

            # Extraire les attributs
            label = self.extract_label(content, match.start(), match.end())
            aria_label = self.extract_attribute(attributes, 'aria-label')
            test_id = self.extract_attribute(attributes, 'data-testid')
            onclick = self.extract_attribute(attributes, 'onClick')

            # Déterminer le type d'action
            action_type, action_desc = self.analyze_action(onclick, content, start_pos)

            # Déterminer le composant parent
            component = file_path.stem

            # Vérifier l'accessibilité
            accessibility = {
                'hasAriaLabel': bool(aria_label),
                'hasRole': 'role=' in attributes,
                'keyboardAccessible': True  # Les boutons sont toujours accessibles au clavier
            }

            # Identifier les problèmes
            issues = []
            if not label and not aria_label:
                issues.append('missing_accessible_label')
            if action_type == 'toast' and 'modal' in label.lower():
                issues.append('toast_instead_of_modal')
                self.red_flags.append({
                    'type': 'toast-instead-of-modal',
                    'file': str(file_path.relative_to(self.root_dir)),
                    'line': line_num,
                    'description': f'Button "{label}" shows toast but label suggests modal'
                })
            if onclick and len(onclick) > 200:
                issues.append('complex_inline_handler')
                self.red_flags.append({
                    'type': 'complex-inline-handler',
                    'file': str(file_path.relative_to(self.root_dir)),
                    'line': line_num,
                    'description': f'Complex inline onClick handler ({len(onclick)} chars)'
                })

            clickable = {
                'id': f'clickable-{len(self.clickables) + 1:04d}',
                'file': str(file_path.relative_to(self.root_dir)),
                'line': line_num,
                'type': tag_type.lower(),
                'label': label,
                'ariaLabel': aria_label,
                'testId': test_id,
                'expectedAction': action_type,
                'actionDescription': action_desc,
                'route': None,
                'module': module,
                'component': component,
                'handler': {
                    'type': 'inline' if onclick and '=>' in onclick else 'reference',
                    'code': onclick[:200] if onclick else None
                },
                'accessibility': accessibility,
                'issues': issues
            }

            self.clickables.append(clickable)

    def find_links(self, file_path: Path, content: str, lines: List[str], module: str):
        """Trouver tous les liens <Link> et <a>."""
        # Pattern pour <Link
        link_pattern = re.compile(
            r'<(Link|a|NavLink)[\s\n]([^>]*?)>',
            re.MULTILINE | re.DOTALL
        )

        for match in link_pattern.finditer(content):
            tag_type = match.group(1)
            attributes = match.group(2)
            start_pos = match.start()
            line_num = content[:start_pos].count('\n') + 1

            label = self.extract_label(content, match.start(), match.end())
            aria_label = self.extract_attribute(attributes, 'aria-label')
            test_id = self.extract_attribute(attributes, 'data-testid')
            to_attr = self.extract_attribute(attributes, 'to')
            href_attr = self.extract_attribute(attributes, 'href')
            onclick = self.extract_attribute(attributes, 'onClick')

            route = to_attr or href_attr

            # Déterminer le type d'action
            if onclick:
                action_type, action_desc = self.analyze_action(onclick, content, start_pos)
            else:
                action_type = 'navigation'
                action_desc = f'Navigate to {route}'

            component = file_path.stem

            accessibility = {
                'hasAriaLabel': bool(aria_label),
                'hasRole': 'role=' in attributes,
                'keyboardAccessible': True
            }

            issues = []
            if not label and not aria_label:
                issues.append('missing_accessible_label')

            clickable = {
                'id': f'clickable-{len(self.clickables) + 1:04d}',
                'file': str(file_path.relative_to(self.root_dir)),
                'line': line_num,
                'type': tag_type,
                'label': label,
                'ariaLabel': aria_label,
                'testId': test_id,
                'expectedAction': action_type,
                'actionDescription': action_desc,
                'route': route,
                'module': module,
                'component': component,
                'handler': {
                    'type': 'inline' if onclick and '=>' in onclick else 'reference',
                    'code': onclick[:200] if onclick else None
                },
                'accessibility': accessibility,
                'issues': issues
            }

            self.clickables.append(clickable)

    def find_onclick_handlers(self, file_path: Path, content: str, lines: List[str], module: str):
        """Trouver tous les éléments avec onClick mais pas déjà capturés."""
        # Pattern pour onClick sur des divs, spans, etc.
        onclick_pattern = re.compile(
            r'<(div|span|td|tr|li|img)[\s\n]([^>]*?onClick[^>]*?)>',
            re.MULTILINE | re.DOTALL
        )

        for match in onclick_pattern.finditer(content):
            tag_type = match.group(1)
            attributes = match.group(2)
            start_pos = match.start()
            line_num = content[:start_pos].count('\n') + 1

            # Vérifier si c'est un cursor-pointer (indicateur de cliquable)
            if 'cursor-pointer' not in attributes and 'clickable' not in attributes:
                continue

            label = self.extract_label(content, match.start(), match.end())
            aria_label = self.extract_attribute(attributes, 'aria-label')
            test_id = self.extract_attribute(attributes, 'data-testid')
            onclick = self.extract_attribute(attributes, 'onClick')

            action_type, action_desc = self.analyze_action(onclick, content, start_pos)
            component = file_path.stem

            accessibility = {
                'hasAriaLabel': bool(aria_label),
                'hasRole': 'role=' in attributes,
                'keyboardAccessible': 'role="button"' in attributes or 'tabIndex' in attributes
            }

            issues = []
            if not accessibility['keyboardAccessible']:
                issues.append('not_keyboard_accessible')
                self.red_flags.append({
                    'type': 'not-keyboard-accessible',
                    'file': str(file_path.relative_to(self.root_dir)),
                    'line': line_num,
                    'description': f'Clickable {tag_type} without keyboard accessibility'
                })
            if not aria_label and tag_type in ['div', 'span']:
                issues.append('missing_accessible_label')

            clickable = {
                'id': f'clickable-{len(self.clickables) + 1:04d}',
                'file': str(file_path.relative_to(self.root_dir)),
                'line': line_num,
                'type': f'{tag_type}-onClick',
                'label': label,
                'ariaLabel': aria_label,
                'testId': test_id,
                'expectedAction': action_type,
                'actionDescription': action_desc,
                'route': None,
                'module': module,
                'component': component,
                'handler': {
                    'type': 'inline' if onclick and '=>' in onclick else 'reference',
                    'code': onclick[:200] if onclick else None
                },
                'accessibility': accessibility,
                'issues': issues
            }

            self.clickables.append(clickable)

    def find_icon_buttons(self, file_path: Path, content: str, lines: List[str], module: str):
        """Trouver les icônes cliquables (X, Menu, etc.) avec onClick."""
        icon_pattern = re.compile(
            r'<(X|Menu|Bell|Search|User|LogOut|ChevronRight|ChevronDown|ChevronUp|Plus|Minus|Edit|Trash|Download|Upload|Save|Cancel|Check|Close)[\s\n]([^>]*?onClick[^>]*?)/>',
            re.MULTILINE | re.DOTALL
        )

        for match in icon_pattern.finditer(content):
            icon_type = match.group(1)
            attributes = match.group(2)
            start_pos = match.start()
            line_num = content[:start_pos].count('\n') + 1

            aria_label = self.extract_attribute(attributes, 'aria-label')
            onclick = self.extract_attribute(attributes, 'onClick')

            action_type, action_desc = self.analyze_action(onclick, content, start_pos)
            component = file_path.stem

            accessibility = {
                'hasAriaLabel': bool(aria_label),
                'hasRole': False,
                'keyboardAccessible': False  # Les icônes seules ne sont pas accessibles
            }

            issues = []
            if not aria_label:
                issues.append('icon_without_aria_label')
                self.red_flags.append({
                    'type': 'icon-without-aria-label',
                    'file': str(file_path.relative_to(self.root_dir)),
                    'line': line_num,
                    'description': f'Clickable {icon_type} icon without aria-label'
                })

            clickable = {
                'id': f'clickable-{len(self.clickables) + 1:04d}',
                'file': str(file_path.relative_to(self.root_dir)),
                'line': line_num,
                'type': 'icon-button',
                'label': icon_type,
                'ariaLabel': aria_label,
                'testId': None,
                'expectedAction': action_type,
                'actionDescription': action_desc,
                'route': None,
                'module': module,
                'component': component,
                'handler': {
                    'type': 'inline' if onclick and '=>' in onclick else 'reference',
                    'code': onclick[:200] if onclick else None
                },
                'accessibility': accessibility,
                'issues': issues
            }

            self.clickables.append(clickable)

    def find_role_buttons(self, file_path: Path, content: str, lines: List[str], module: str):
        """Trouver les éléments avec role='button'."""
        role_button_pattern = re.compile(
            r'<(\w+)[\s\n]([^>]*?role="button"[^>]*?)>',
            re.MULTILINE | re.DOTALL
        )

        for match in role_button_pattern.finditer(content):
            tag_type = match.group(1)
            attributes = match.group(2)
            start_pos = match.start()
            line_num = content[:start_pos].count('\n') + 1

            # Skip si déjà capturé comme button
            if tag_type.lower() in ['button']:
                continue

            label = self.extract_label(content, match.start(), match.end())
            aria_label = self.extract_attribute(attributes, 'aria-label')
            test_id = self.extract_attribute(attributes, 'data-testid')
            onclick = self.extract_attribute(attributes, 'onClick')

            action_type, action_desc = self.analyze_action(onclick, content, start_pos)
            component = file_path.stem

            accessibility = {
                'hasAriaLabel': bool(aria_label),
                'hasRole': True,
                'keyboardAccessible': 'tabIndex' in attributes
            }

            issues = []
            if not accessibility['keyboardAccessible']:
                issues.append('missing_tabindex')

            clickable = {
                'id': f'clickable-{len(self.clickables) + 1:04d}',
                'file': str(file_path.relative_to(self.root_dir)),
                'line': line_num,
                'type': f'{tag_type}-role-button',
                'label': label,
                'ariaLabel': aria_label,
                'testId': test_id,
                'expectedAction': action_type,
                'actionDescription': action_desc,
                'route': None,
                'module': module,
                'component': component,
                'handler': {
                    'type': 'inline' if onclick and '=>' in onclick else 'reference',
                    'code': onclick[:200] if onclick else None
                },
                'accessibility': accessibility,
                'issues': issues
            }

            self.clickables.append(clickable)

    def extract_label(self, content: str, start: int, end: int) -> str:
        """Extraire le label textuel d'un élément."""
        # Trouver le contenu entre > et </
        close_tag = content.find('>', start)
        if close_tag == -1:
            return ''

        # Chercher la balise de fermeture
        next_open = content.find('<', close_tag)
        if next_open == -1:
            return ''

        label = content[close_tag + 1:next_open].strip()

        # Nettoyer le label (enlever les {t(...)} etc.)
        label = re.sub(r'\{[^}]*\}', '', label)
        label = re.sub(r'\s+', ' ', label)

        return label[:100]  # Limiter à 100 caractères

    def extract_attribute(self, attributes: str, attr_name: str) -> str:
        """Extraire la valeur d'un attribut."""
        # Pattern pour attribut="valeur" ou attribut={valeur}
        pattern = rf'{attr_name}=(?:"([^"]*)"|{{([^}}]*)}})'
        match = re.search(pattern, attributes)
        if match:
            return match.group(1) or match.group(2)
        return None

    def analyze_action(self, onclick: str, content: str, pos: int) -> tuple:
        """Analyser le type d'action effectuée par le handler."""
        if not onclick:
            return 'unknown', 'No onClick handler'

        onclick_lower = onclick.lower()

        # Détecter les toasts
        if 'toast' in onclick_lower or 'showtoast' in onclick_lower:
            if 'setshow' in onclick_lower or 'modal' in onclick_lower:
                return 'mixed', 'Shows both toast and modal'
            return 'toast', 'Shows toast notification'

        # Détecter les modales
        if 'setshow' in onclick_lower or 'setisopen' in onclick_lower or 'openmodal' in onclick_lower:
            return 'modal', 'Opens modal dialog'

        # Détecter la navigation
        if 'navigate' in onclick_lower or 'history.push' in onclick_lower:
            return 'navigation', 'Navigates to another page'

        # Détecter les changements d'état
        if 'set' in onclick_lower and not 'setshow' in onclick_lower:
            return 'state-change', 'Changes component state'

        # Détecter les appels API
        if 'fetch' in onclick_lower or 'axios' in onclick_lower or 'api' in onclick_lower:
            return 'api-call', 'Makes API request'

        # Détecter les téléchargements
        if 'download' in onclick_lower or 'export' in onclick_lower:
            return 'download', 'Triggers download/export'

        return 'other', 'Other action'

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
        report = {
            'totalClickables': self.stats['totalClickables'],
            'byType': self.stats['byType'],
            'byAction': self.stats['byAction'],
            'byModule': self.stats['byModule'],
            'redFlags': self.red_flags,
            'clickables': self.clickables
        }

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        print(f"\n[+] Report generated: {output_file}")
        print(f"[*] Total clickables found: {self.stats['totalClickables']}")
        print(f"[!] Red flags found: {len(self.red_flags)}")
        print(f"\n[*] By Type:")
        for type_key, count in sorted(self.stats['byType'].items(), key=lambda x: x[1], reverse=True):
            print(f"  - {type_key}: {count}")
        print(f"\n[*] By Action:")
        for action_key, count in sorted(self.stats['byAction'].items(), key=lambda x: x[1], reverse=True):
            print(f"  - {action_key}: {count}")
        print(f"\n[*] By Module:")
        for module_key, count in sorted(self.stats['byModule'].items(), key=lambda x: x[1], reverse=True):
            print(f"  - {module_key}: {count}")


if __name__ == '__main__':
    scanner = ClickableScanner('C:\\devs\\WiseBook\\frontend\\src')
    scanner.scan_all_files()
    scanner.generate_report('C:\\devs\\WiseBook\\AUDIT_CLICKABLES_INVENTORY.json')
