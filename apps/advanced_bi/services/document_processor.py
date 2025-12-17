"""
Service de traitement et découpage de documents
Support PDF, DOCX, et textes pour le système RAG
"""
import logging
from typing import List, Dict, Any, Optional
import re
from pathlib import Path

# PDF Processing
import pdfplumber
from pypdf import PdfReader

# Document Processing
from langchain.text_splitter import RecursiveCharacterTextSplitter
import tiktoken

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """
    Service de traitement de documents pour le RAG
    Découpe les documents en chunks optimaux pour les embeddings
    """

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        encoding_name: str = 'cl100k_base'
    ):
        """
        Initialise le processeur de documents

        Args:
            chunk_size: Taille des chunks en tokens/caractères
            chunk_overlap: Chevauchement entre chunks
            encoding_name: Nom de l'encoding tokenizer
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.encoding_name = encoding_name

        # Initialiser le text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=[
                "\n\n\n",  # Sections majeures
                "\n\n",    # Paragraphes
                "\n",      # Lignes
                ".",       # Phrases
                ",",       # Clauses
                " ",       # Mots
                ""         # Caractères
            ]
        )

        # Tokenizer pour compter les tokens
        try:
            self.tokenizer = tiktoken.get_encoding(encoding_name)
        except Exception as e:
            logger.warning(f"Impossible de charger tokenizer {encoding_name}: {e}")
            self.tokenizer = None

    def extract_text_from_pdf(self, file_path: str) -> Dict[str, Any]:
        """
        Extrait le texte d'un fichier PDF

        Args:
            file_path: Chemin vers le fichier PDF

        Returns:
            Dict avec texte et métadonnées
        """
        try:
            text_pages = []
            total_text = ""

            with pdfplumber.open(file_path) as pdf:
                total_pages = len(pdf.pages)

                for page_num, page in enumerate(pdf.pages, start=1):
                    page_text = page.extract_text()

                    if page_text:
                        text_pages.append({
                            'page_number': page_num,
                            'text': page_text,
                            'char_count': len(page_text)
                        })
                        total_text += page_text + "\n\n"

            return {
                'success': True,
                'total_pages': total_pages,
                'pages': text_pages,
                'full_text': total_text,
                'total_chars': len(total_text)
            }

        except Exception as e:
            logger.error(f"Erreur extraction PDF: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def extract_syscohada_metadata(self, text: str) -> Dict[str, Any]:
        """
        Extrait les métadonnées spécifiques SYSCOHADA du texte

        Args:
            text: Texte à analyser

        Returns:
            Métadonnées extraites
        """
        metadata = {
            'article_numbers': [],
            'section_numbers': [],
            'regulation_references': []
        }

        # Pattern pour articles (ex: "Article 15", "Art. 342")
        article_pattern = r'(?:Article|Art\.?)\s+(\d+(?:[-.]\d+)*)'
        articles = re.findall(article_pattern, text, re.IGNORECASE)
        metadata['article_numbers'] = list(set(articles))

        # Pattern pour sections (ex: "Section 3.2", "Titre II")
        section_pattern = r'(?:Section|Titre)\s+([IVX\d]+(?:\.\d+)*)'
        sections = re.findall(section_pattern, text, re.IGNORECASE)
        metadata['section_numbers'] = list(set(sections))

        # Pattern pour références réglementaires
        reg_pattern = r'(?:OHADA|SYSCOHADA)\s+(?:Article|Art\.?)\s+(\d+(?:[-.]\d+)*)'
        regulations = re.findall(reg_pattern, text, re.IGNORECASE)
        metadata['regulation_references'] = list(set(regulations))

        return metadata

    def split_text_into_chunks(
        self,
        text: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Découpe un texte en chunks avec métadonnées

        Args:
            text: Texte à découper
            metadata: Métadonnées additionnelles

        Returns:
            Liste de chunks avec métadonnées
        """
        if not text or not text.strip():
            return []

        try:
            # Découpage du texte
            text_chunks = self.text_splitter.split_text(text)

            chunks = []
            for idx, chunk_text in enumerate(text_chunks):
                # Compter tokens si tokenizer disponible
                token_count = None
                if self.tokenizer:
                    try:
                        token_count = len(self.tokenizer.encode(chunk_text))
                    except:
                        pass

                # Extraire métadonnées SYSCOHADA du chunk
                syscohada_meta = self.extract_syscohada_metadata(chunk_text)

                chunk_data = {
                    'chunk_index': idx,
                    'content': chunk_text,
                    'char_count': len(chunk_text),
                    'token_count': token_count,
                    'syscohada_metadata': syscohada_meta
                }

                # Ajouter métadonnées globales si fournies
                if metadata:
                    chunk_data['metadata'] = metadata

                chunks.append(chunk_data)

            logger.info(f"Texte découpé en {len(chunks)} chunks")
            return chunks

        except Exception as e:
            logger.error(f"Erreur découpage texte: {e}")
            return []

    def process_pdf_document(
        self,
        file_path: str,
        document_type: str = 'SYSCOHADA_GUIDE'
    ) -> Dict[str, Any]:
        """
        Traitement complet d'un document PDF pour le RAG

        Args:
            file_path: Chemin vers le PDF
            document_type: Type de document

        Returns:
            Dict avec chunks et métadonnées
        """
        logger.info(f"Traitement du PDF: {file_path}")

        # Extraction du texte
        extraction_result = self.extract_text_from_pdf(file_path)

        if not extraction_result['success']:
            return {
                'success': False,
                'error': extraction_result['error']
            }

        # Métadonnées globales
        file_info = Path(file_path)
        global_metadata = {
            'source_file': file_info.name,
            'document_type': document_type,
            'total_pages': extraction_result['total_pages']
        }

        # Découpage en chunks
        chunks = self.split_text_into_chunks(
            extraction_result['full_text'],
            metadata=global_metadata
        )

        # Enrichissement des chunks avec numéros de page
        enriched_chunks = self._enrich_chunks_with_pages(
            chunks,
            extraction_result['pages']
        )

        return {
            'success': True,
            'total_pages': extraction_result['total_pages'],
            'total_chunks': len(enriched_chunks),
            'total_chars': extraction_result['total_chars'],
            'chunks': enriched_chunks,
            'metadata': global_metadata
        }

    def _enrich_chunks_with_pages(
        self,
        chunks: List[Dict[str, Any]],
        pages: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Enrichit les chunks avec les numéros de page

        Args:
            chunks: Liste de chunks
            pages: Liste de pages extraites

        Returns:
            Chunks enrichis
        """
        # Créer un mapping position -> page
        position_map = []
        current_position = 0

        for page in pages:
            page_length = len(page['text'])
            position_map.append({
                'page_number': page['page_number'],
                'start': current_position,
                'end': current_position + page_length
            })
            current_position += page_length + 2  # +2 pour les \n\n

        # Enrichir chaque chunk
        enriched = []
        full_text = "".join([p['text'] + "\n\n" for p in pages])

        for chunk in chunks:
            # Trouver la position du chunk dans le texte complet
            chunk_position = full_text.find(chunk['content'])

            # Déterminer la page
            page_number = None
            for page_info in position_map:
                if page_info['start'] <= chunk_position < page_info['end']:
                    page_number = page_info['page_number']
                    break

            chunk['page_number'] = page_number
            enriched.append(chunk)

        return enriched

    def extract_section_title(self, text: str) -> Optional[str]:
        """
        Extrait le titre de section d'un chunk de texte

        Args:
            text: Texte à analyser

        Returns:
            Titre de section ou None
        """
        # Patterns pour titres
        title_patterns = [
            r'^([A-ZÀÂÄÇÉÈÊËÏÎÔŒÙÛÜ][A-ZÀÂÄÇÉÈÊËÏÎÔŒÙÛÜ\s\d\.:-]{5,80})\n',
            r'^((?:TITRE|CHAPITRE|SECTION)\s+[IVX\d]+\s*[:-]?\s*.+)\n',
        ]

        for pattern in title_patterns:
            match = re.search(pattern, text, re.MULTILINE)
            if match:
                return match.group(1).strip()

        return None

    def get_statistics(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calcule des statistiques sur les chunks

        Args:
            chunks: Liste de chunks

        Returns:
            Statistiques
        """
        if not chunks:
            return {}

        char_counts = [c['char_count'] for c in chunks]
        token_counts = [c.get('token_count', 0) for c in chunks if c.get('token_count')]

        stats = {
            'total_chunks': len(chunks),
            'avg_chunk_size_chars': sum(char_counts) / len(char_counts),
            'min_chunk_size_chars': min(char_counts),
            'max_chunk_size_chars': max(char_counts),
        }

        if token_counts:
            stats.update({
                'avg_chunk_size_tokens': sum(token_counts) / len(token_counts),
                'min_chunk_size_tokens': min(token_counts),
                'max_chunk_size_tokens': max(token_counts),
                'total_tokens': sum(token_counts)
            })

        return stats


# Instance globale
_document_processor_instance = None


def get_document_processor(
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> DocumentProcessor:
    """
    Récupère l'instance du processeur de documents

    Args:
        chunk_size: Taille des chunks
        chunk_overlap: Chevauchement

    Returns:
        Instance DocumentProcessor
    """
    global _document_processor_instance

    if _document_processor_instance is None:
        _document_processor_instance = DocumentProcessor(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

    return _document_processor_instance
