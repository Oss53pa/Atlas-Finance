import os
import re

def fix_file(file_path):
    """Corrige le problème useLanguage dans un fichier"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Pattern pour trouver l'erreur: const { t } = useLanguage() mal placé dans les paramètres
        # Cas 1: Entre les paramètres d'une fonction fléchée
        pattern1 = r'(: React\.FC[^=]*= \(\{)\s*const \{ t \} = useLanguage\(\);\s*([^}]*\}\) =>)'

        def fix_pattern1(match):
            return f"{match.group(1)}\n  {match.group(2)} {{\n  const {{ t }} = useLanguage();"

        content = re.sub(pattern1, fix_pattern1, content)

        # Cas 2: Au milieu des props destructurées
        pattern2 = r'(\(\{[^}]*?)\s*const \{ t \} = useLanguage\(\);\s*([^}]*?\}\) =>)'

        def fix_pattern2(match):
            props = match.group(1) + match.group(2)
            # Nettoyer les virgules doubles potentielles
            props = re.sub(r',\s*,', ',', props)
            return props + " {\n  const { t } = useLanguage();"

        content = re.sub(pattern2, fix_pattern2, content)

        # Si le fichier a été modifié, l'écrire
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True

        return False
    except Exception as e:
        print(f"Erreur lors du traitement de {file_path}: {e}")
        return False

def main():
    # Liste des fichiers à corriger basée sur les erreurs TypeScript
    files_to_fix = [
        r"C:\devs\WiseBook\frontend\src\AppWithDoubleSidebar.tsx",
        r"C:\devs\WiseBook\frontend\src\components\accounting\IntelligentEntryForm.tsx",
        r"C:\devs\WiseBook\frontend\src\components\dashboards\CustomerDashboard.tsx",
        r"C:\devs\WiseBook\frontend\src\components\dashboards\ExecutiveDashboard.tsx",
        r"C:\devs\WiseBook\frontend\src\components\dashboards\FinancialAnalysisDashboard.tsx",
        r"C:\devs\WiseBook\frontend\src\components\dashboards\SupplierDashboard.tsx",
    ]

    print("Correction des erreurs useLanguage dans les fichiers TypeScript...")

    fixed_count = 0
    for file_path in files_to_fix:
        if os.path.exists(file_path):
            if fix_file(file_path):
                print(f"Corrige: {file_path}")
                fixed_count += 1
        else:
            print(f"Fichier non trouve: {file_path}")

    print(f"\nTermine! {fixed_count} fichiers corriges.")

if __name__ == "__main__":
    main()