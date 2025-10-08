import os
import re

def fix_uselanguage_syntax(file_path):
    """
    Corrige l'erreur de syntaxe où useLanguage() est appelé dans les paramètres de fonction
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern pour détecter l'erreur: const { t } = useLanguage() dans les paramètres
    pattern = r'(const \w+: React\.FC<[^>]+> = \(\{)\s*const \{ t \} = useLanguage\(\);\s*([^}]+\}\) =>)'

    # Remplacer par la syntaxe correcte
    def replace_match(match):
        before = match.group(1)
        params = match.group(2)
        # Ajouter useLanguage() après la déclaration des paramètres
        return f"{before}\n  {params} {{\n  const {{ t }} = useLanguage();"

    new_content = re.sub(pattern, replace_match, content)

    # Pattern alternatif pour les cas où c'est directement après la parenthèse
    pattern2 = r'(: React\.FC[^=]*= \(\{)\s*const \{ t \} = useLanguage\(\);'
    new_content = re.sub(pattern2, r'\1', new_content)

    # Ajouter useLanguage après le destructuring des props si nécessaire
    pattern3 = r'(\}\) => \{)(?!\s*const \{ t \} = useLanguage)'

    if 'useLanguage' in content and 'const { t } = useLanguage()' not in new_content:
        # Si useLanguage était présent mais mal placé, l'ajouter correctement
        new_content = re.sub(pattern3, r'\1\n  const { t } = useLanguage();', new_content, 1)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def find_and_fix_files(directory):
    """
    Parcourt tous les fichiers TypeScript et corrige les erreurs de syntaxe
    """
    fixed_files = []

    for root, dirs, files in os.walk(directory):
        # Ignorer node_modules
        if 'node_modules' in root:
            continue

        for file in files:
            if file.endswith(('.tsx', '.ts')):
                file_path = os.path.join(root, file)
                try:
                    # Lire le fichier pour vérifier s'il contient l'erreur
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()

                    # Chercher le pattern d'erreur spécifique
                    if 'const { t } = useLanguage();' in content and 'React.FC' in content:
                        # Vérifier si c'est mal placé (dans les paramètres)
                        lines = content.split('\n')
                        for i, line in enumerate(lines):
                            if 'const { t } = useLanguage();' in line:
                                # Vérifier si la ligne précédente contient React.FC et une parenthèse ouvrante
                                if i > 0 and 'React.FC' in lines[i-1] and '({' in lines[i-1]:
                                    # C'est probablement l'erreur
                                    if fix_uselanguage_syntax(file_path):
                                        fixed_files.append(file_path)
                                        print(f"Corrige: {file_path}")
                                    break
                except Exception as e:
                    print(f"Erreur lors du traitement de {file_path}: {e}")

    return fixed_files

if __name__ == "__main__":
    directory = r"C:\devs\WiseBook\frontend\src"

    print("Recherche des fichiers avec erreurs de syntaxe useLanguage...")
    fixed_files = find_and_fix_files(directory)

    if fixed_files:
        print(f"\n{len(fixed_files)} fichiers corriges:")
        for file in fixed_files:
            print(f"  - {file}")
    else:
        print("\nAucun fichier a corriger trouve.")