"""
Service d'indexation du code source pour Paloma
Paloma connaît tout le projet WiseBook par cœur
"""
import logging
import os
import ast
import inspect
from typing import List, Dict, Any, Optional
from pathlib import Path
from django.apps import apps
from django.db import transaction

from apps.advanced_bi.models import DocumentSource, DocumentChunk
from apps.advanced_bi.services.embedding_service import get_embedding_service

logger = logging.getLogger(__name__)


class CodeIndexer:
    """
    Indexe automatiquement tout le code source WiseBook
    pour que Paloma puisse répondre aux questions sur le logiciel
    """

    def __init__(self, base_dir: str = None):
        self.base_dir = Path(base_dir) if base_dir else Path.cwd()
        self.embedding_service = get_embedding_service()

    def index_entire_project(self, company=None) -> Dict[str, Any]:
        """
        Indexe tout le projet WiseBook

        Returns:
            Statistiques d'indexation
        """
        logger.info("Début indexation complète du projet WiseBook")

        results = {
            'models_indexed': 0,
            'views_indexed': 0,
            'services_indexed': 0,
            'total_chunks': 0,
            'modules_indexed': []
        }

        # 1. Indexer tous les modèles Django
        models_doc = self.index_all_django_models()
        results['models_indexed'] = len(models_doc['models'])

        # 2. Indexer les vues et API endpoints
        views_doc = self.index_all_views()
        results['views_indexed'] = len(views_doc['views'])

        # 3. Indexer les services métier
        services_doc = self.index_all_services()
        results['services_indexed'] = len(services_doc['services'])

        # 4. Créer le document source
        doc_source = self._create_code_documentation_source(company)

        # 5. Créer les chunks avec embeddings
        all_chunks = []
        all_chunks.extend(models_doc['chunks'])
        all_chunks.extend(views_doc['chunks'])
        all_chunks.extend(services_doc['chunks'])

        # Générer embeddings et sauvegarder
        self._save_chunks_with_embeddings(doc_source, all_chunks)

        results['total_chunks'] = len(all_chunks)
        results['document_id'] = doc_source.id

        logger.info(f"Indexation terminée: {results['total_chunks']} chunks créés")
        return results

    def index_all_django_models(self) -> Dict[str, Any]:
        """
        Indexe tous les modèles Django du projet
        Extrait: champs, relations, méthodes, docstrings
        """
        logger.info("Indexation des modèles Django...")

        models_data = []
        chunks = []

        for app_config in apps.get_app_configs():
            if not app_config.name.startswith('apps.'):
                continue  # Ignorer les apps Django/third-party

            for model in app_config.get_models():
                model_info = self._extract_model_documentation(model)
                models_data.append(model_info)

                # Créer un chunk pour ce modèle
                chunk_content = self._format_model_as_text(model_info)
                chunks.append({
                    'content': chunk_content,
                    'metadata': {
                        'type': 'model',
                        'app_label': app_config.label,
                        'model_name': model.__name__,
                        'module': model.__module__
                    },
                    'section_title': f"Modèle {model.__name__}"
                })

        logger.info(f"{len(models_data)} modèles indexés")
        return {
            'models': models_data,
            'chunks': chunks
        }

    def _extract_model_documentation(self, model) -> Dict[str, Any]:
        """
        Extrait toute la documentation d'un modèle Django
        """
        model_info = {
            'name': model.__name__,
            'app_label': model._meta.app_label,
            'table_name': model._meta.db_table,
            'verbose_name': str(model._meta.verbose_name),
            'verbose_name_plural': str(model._meta.verbose_name_plural),
            'docstring': inspect.getdoc(model) or '',
            'fields': [],
            'properties': [],
            'methods': [],
            'relations': []
        }

        # Extraire les champs
        for field in model._meta.get_fields():
            field_info = {
                'name': field.name,
                'type': field.get_internal_type(),
                'verbose_name': getattr(field, 'verbose_name', ''),
                'help_text': getattr(field, 'help_text', ''),
                'null': getattr(field, 'null', False),
                'blank': getattr(field, 'blank', False),
                'unique': getattr(field, 'unique', False),
                'choices': getattr(field, 'choices', None),
            }

            # Relations
            if field.is_relation:
                field_info['related_model'] = field.related_model.__name__ if field.related_model else None
                field_info['relation_type'] = field.__class__.__name__
                model_info['relations'].append(field_info)
            else:
                model_info['fields'].append(field_info)

        # Extraire les properties
        for attr_name in dir(model):
            if attr_name.startswith('_'):
                continue
            try:
                attr = getattr(model, attr_name)
                if isinstance(attr, property):
                    prop_doc = inspect.getdoc(attr.fget) if attr.fget else ''
                    model_info['properties'].append({
                        'name': attr_name,
                        'docstring': prop_doc
                    })
            except:
                pass

        # Extraire les méthodes importantes
        for method_name in dir(model):
            if method_name.startswith('_') and method_name not in ['__str__', '__repr__']:
                continue
            try:
                method = getattr(model, method_name)
                if callable(method) and hasattr(method, '__func__'):
                    method_doc = inspect.getdoc(method)
                    if method_doc or method_name in ['__str__', 'save', 'delete', 'clean']:
                        model_info['methods'].append({
                            'name': method_name,
                            'docstring': method_doc or '',
                            'signature': str(inspect.signature(method)) if hasattr(inspect, 'signature') else ''
                        })
            except:
                pass

        return model_info

    def _format_model_as_text(self, model_info: Dict[str, Any]) -> str:
        """
        Formate les informations du modèle en texte lisible pour l'IA
        """
        lines = [
            f"# MODÈLE DJANGO: {model_info['name']}",
            f"App: {model_info['app_label']}",
            f"Table: {model_info['table_name']}",
            f"Description: {model_info['verbose_name']} ({model_info['verbose_name_plural']})",
            "",
            f"Documentation: {model_info['docstring']}",
            "",
            "## CHAMPS:",
        ]

        # Champs
        for field in model_info['fields']:
            field_desc = f"- {field['name']} ({field['type']})"
            if field['verbose_name']:
                field_desc += f": {field['verbose_name']}"
            if field['help_text']:
                field_desc += f" - {field['help_text']}"
            if field['choices']:
                choices_str = ', '.join([str(c[0]) for c in field['choices'][:5]])
                field_desc += f" [Choix: {choices_str}]"
            lines.append(field_desc)

        # Relations
        if model_info['relations']:
            lines.append("\n## RELATIONS:")
            for rel in model_info['relations']:
                lines.append(f"- {rel['name']} ({rel['relation_type']}) → {rel['related_model']}")

        # Properties
        if model_info['properties']:
            lines.append("\n## PROPRIÉTÉS:")
            for prop in model_info['properties']:
                lines.append(f"- {prop['name']}: {prop['docstring']}")

        # Méthodes
        if model_info['methods']:
            lines.append("\n## MÉTHODES:")
            for method in model_info['methods']:
                method_desc = f"- {method['name']}{method['signature']}"
                if method['docstring']:
                    method_desc += f": {method['docstring']}"
                lines.append(method_desc)

        return "\n".join(lines)

    def index_all_views(self) -> Dict[str, Any]:
        """
        Indexe toutes les vues et API endpoints
        """
        logger.info("Indexation des vues et API...")

        views_data = []
        chunks = []

        # Parcourir les apps
        for app_config in apps.get_app_configs():
            if not app_config.name.startswith('apps.'):
                continue

            # Chercher views.py et api_views.py
            app_path = Path(app_config.path)

            for views_file in ['views.py', 'api_views.py']:
                views_path = app_path / views_file
                if views_path.exists():
                    views_info = self._extract_views_from_file(
                        str(views_path),
                        app_config.label
                    )
                    views_data.extend(views_info['views'])
                    chunks.extend(views_info['chunks'])

        logger.info(f"{len(views_data)} vues indexées")
        return {
            'views': views_data,
            'chunks': chunks
        }

    def _extract_views_from_file(self, file_path: str, app_label: str) -> Dict[str, Any]:
        """
        Extrait les vues d'un fichier Python
        """
        views = []
        chunks = []

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            tree = ast.parse(content)

            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    # Vérifier si c'est une ViewSet ou APIView
                    is_view = any(
                        base.id in ['ViewSet', 'APIView', 'ModelViewSet', 'GenericAPIView']
                        for base in node.bases
                        if hasattr(base, 'id')
                    )

                    if is_view:
                        view_info = {
                            'name': node.name,
                            'type': 'class-based-view',
                            'app_label': app_label,
                            'docstring': ast.get_docstring(node) or '',
                            'methods': []
                        }

                        # Extraire les méthodes
                        for item in node.body:
                            if isinstance(item, ast.FunctionDef):
                                method_info = {
                                    'name': item.name,
                                    'docstring': ast.get_docstring(item) or ''
                                }
                                view_info['methods'].append(method_info)

                        views.append(view_info)

                        # Créer chunk
                        chunk_content = self._format_view_as_text(view_info)
                        chunks.append({
                            'content': chunk_content,
                            'metadata': {
                                'type': 'view',
                                'app_label': app_label,
                                'view_name': view_info['name']
                            },
                            'section_title': f"Vue {view_info['name']}"
                        })

        except Exception as e:
            logger.error(f"Erreur extraction vues {file_path}: {e}")

        return {
            'views': views,
            'chunks': chunks
        }

    def _format_view_as_text(self, view_info: Dict[str, Any]) -> str:
        """
        Formate une vue en texte lisible
        """
        lines = [
            f"# VUE API: {view_info['name']}",
            f"App: {view_info['app_label']}",
            f"Type: {view_info['type']}",
            "",
            f"Documentation: {view_info['docstring']}",
            "",
            "## ENDPOINTS/MÉTHODES:",
        ]

        for method in view_info['methods']:
            method_desc = f"- {method['name']}"
            if method['docstring']:
                method_desc += f": {method['docstring']}"
            lines.append(method_desc)

        return "\n".join(lines)

    def index_all_services(self) -> Dict[str, Any]:
        """
        Indexe tous les services métier
        """
        logger.info("Indexation des services...")

        services_data = []
        chunks = []

        for app_config in apps.get_app_configs():
            if not app_config.name.startswith('apps.'):
                continue

            # Chercher le dossier services
            services_dir = Path(app_config.path) / 'services'
            if services_dir.exists() and services_dir.is_dir():
                for service_file in services_dir.glob('*.py'):
                    if service_file.name == '__init__.py':
                        continue

                    service_info = self._extract_services_from_file(
                        str(service_file),
                        app_config.label
                    )
                    services_data.extend(service_info['services'])
                    chunks.extend(service_info['chunks'])

        logger.info(f"{len(services_data)} services indexés")
        return {
            'services': services_data,
            'chunks': chunks
        }

    def _extract_services_from_file(self, file_path: str, app_label: str) -> Dict[str, Any]:
        """
        Extrait les services d'un fichier
        """
        services = []
        chunks = []

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            tree = ast.parse(content)

            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    service_info = {
                        'name': node.name,
                        'app_label': app_label,
                        'file': Path(file_path).name,
                        'docstring': ast.get_docstring(node) or '',
                        'methods': []
                    }

                    # Extraire méthodes
                    for item in node.body:
                        if isinstance(item, ast.FunctionDef):
                            method_info = {
                                'name': item.name,
                                'docstring': ast.get_docstring(item) or '',
                                'is_public': not item.name.startswith('_')
                            }
                            service_info['methods'].append(method_info)

                    services.append(service_info)

                    # Créer chunk
                    chunk_content = self._format_service_as_text(service_info)
                    chunks.append({
                        'content': chunk_content,
                        'metadata': {
                            'type': 'service',
                            'app_label': app_label,
                            'service_name': service_info['name']
                        },
                        'section_title': f"Service {service_info['name']}"
                    })

        except Exception as e:
            logger.error(f"Erreur extraction services {file_path}: {e}")

        return {
            'services': services,
            'chunks': chunks
        }

    def _format_service_as_text(self, service_info: Dict[str, Any]) -> str:
        """
        Formate un service en texte lisible
        """
        lines = [
            f"# SERVICE: {service_info['name']}",
            f"App: {service_info['app_label']}",
            f"Fichier: {service_info['file']}",
            "",
            f"Documentation: {service_info['docstring']}",
            "",
            "## MÉTHODES PUBLIQUES:",
        ]

        for method in service_info['methods']:
            if method['is_public']:
                method_desc = f"- {method['name']}"
                if method['docstring']:
                    method_desc += f": {method['docstring']}"
                lines.append(method_desc)

        return "\n".join(lines)

    def _create_code_documentation_source(self, company=None) -> DocumentSource:
        """
        Crée le DocumentSource pour la documentation du code
        """
        doc_source = DocumentSource.objects.create(
            company=company,
            title="Documentation Code Source WiseBook",
            document_type="CODE_DOCUMENTATION",
            description="Documentation automatique de tous les modèles, vues, et services WiseBook",
            status="PROCESSING"
        )
        return doc_source

    def _save_chunks_with_embeddings(
        self,
        doc_source: DocumentSource,
        chunks: List[Dict[str, Any]]
    ):
        """
        Sauvegarde les chunks avec leurs embeddings
        """
        logger.info(f"Génération de {len(chunks)} embeddings...")

        # Extraire les contenus
        contents = [chunk['content'] for chunk in chunks]

        # Générer embeddings en batch
        embeddings = self.embedding_service.generate_embeddings_batch(
            texts=contents,
            batch_size=32,
            show_progress=True
        )

        # Sauvegarder
        with transaction.atomic():
            for idx, (chunk_data, embedding) in enumerate(zip(chunks, embeddings)):
                DocumentChunk.objects.create(
                    document_source=doc_source,
                    content=chunk_data['content'],
                    chunk_index=idx,
                    embedding=embedding,
                    section_title=chunk_data.get('section_title', ''),
                    char_count=len(chunk_data['content']),
                    metadata=chunk_data.get('metadata', {})
                )

        # Mettre à jour le document source
        doc_source.total_chunks = len(chunks)
        doc_source.total_embeddings = len(chunks)
        doc_source.status = "INDEXED"
        doc_source.save()

        logger.info(f"{len(chunks)} chunks sauvegardés avec succès")

    def create_project_structure_documentation(self) -> str:
        """
        Crée une documentation de la structure du projet
        """
        structure = [
            "# STRUCTURE DU PROJET WISEBOOK",
            "",
            "WiseBook est un ERP de comptabilité conforme SYSCOHADA/OHADA.",
            "",
            "## APPLICATIONS PRINCIPALES:",
        ]

        for app_config in apps.get_app_configs():
            if not app_config.name.startswith('apps.'):
                continue

            app_doc = [
                f"\n### {app_config.verbose_name} ({app_config.label})",
                f"Module: {app_config.name}",
            ]

            # Compter les modèles
            models = app_config.get_models()
            if models:
                app_doc.append(f"Modèles: {len(models)}")
                model_names = [m.__name__ for m in models[:5]]
                app_doc.append(f"  - {', '.join(model_names)}")
                if len(models) > 5:
                    app_doc.append(f"  - ... et {len(models) - 5} autres")

            structure.extend(app_doc)

        return "\n".join(structure)


def get_code_indexer() -> CodeIndexer:
    """
    Factory pour créer un indexeur de code
    """
    return CodeIndexer()
