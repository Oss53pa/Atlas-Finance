/**
 * AtlasTemplateDetector — Composant d'upload qui détecte automatiquement
 * le template Atlas F&A à partir d'un fichier XLSX/CSV.
 *
 * Fonctionnalités :
 *   • Upload drag-and-drop ou input file
 *   • Analyse des feuilles et en-têtes
 *   • Affichage du template reconnu avec score de confiance
 *   • Liste des colonnes matchées + colonnes manquantes
 *   • Déclenche `onTemplateDetected(templateKey, match)` pour l'import
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  X,
  Sparkles,
} from 'lucide-react';
import {
  detectTemplate,
  type DetectionResult,
  type TemplateKey,
} from '../../services/import';

export interface AtlasTemplateDetectorProps {
  /** Appelé quand un template Atlas est reconnu */
  onTemplateDetected?: (templateKey: TemplateKey, result: DetectionResult) => void;
  /** Appelé quand aucun template n'est reconnu (import libre) */
  onUnknownFile?: (file: File, result: DetectionResult) => void;
  /** Score minimum pour reconnaître un template (défaut 0.6) */
  minConfidence?: number;
  className?: string;
}

export const AtlasTemplateDetector: React.FC<AtlasTemplateDetectorProps> = ({
  onTemplateDetected,
  onUnknownFile,
  minConfidence = 0.6,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const analyzeFile = useCallback(async (file: File) => {
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const detection = detectTemplate(buffer, minConfidence);
      setResult(detection);
      setCurrentFile(file);

      if (detection.bestMatch && detection.bestMatch.score >= minConfidence) {
        onTemplateDetected?.(detection.bestMatch.template.key, detection);
      } else {
        onUnknownFile?.(file, detection);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur d\'analyse';
      setError(`Impossible d'analyser le fichier : ${msg}`);
    } finally {
      setAnalyzing(false);
    }
  }, [minConfidence, onTemplateDetected, onUnknownFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) analyzeFile(file);
  }, [analyzeFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) analyzeFile(file);
  }, [analyzeFile]);

  const reset = () => {
    setCurrentFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const bestMatch = result?.bestMatch;
  const isRecognized = !!(bestMatch && bestMatch.score >= minConfidence);

  return (
    <div className={className}>
      {/* Zone de dépôt */}
      {!currentFile && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${isDragging ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50'}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onInputChange}
            className="hidden"
          />
          <Upload className="w-10 h-10 mx-auto text-neutral-400 mb-3" />
          <p className="text-sm font-semibold text-neutral-900 mb-1">
            Déposez votre fichier ici
          </p>
          <p className="text-xs text-neutral-500">
            Excel (.xlsx, .xls) ou CSV — Atlas détectera automatiquement le type d'import
          </p>
        </div>
      )}

      {/* Analyse en cours */}
      {analyzing && (
        <div className="border border-neutral-200 rounded-xl p-6 bg-neutral-50 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-neutral-700">Analyse du fichier en cours...</span>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="border border-red-200 bg-red-50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">Erreur</p>
            <p className="text-xs text-red-700">{error}</p>
          </div>
          <button onClick={reset} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Résultat */}
      {currentFile && result && !analyzing && !error && (
        <div className="space-y-4">
          {/* Template reconnu */}
          {isRecognized && bestMatch && (
            <div className="border-2 border-green-300 bg-green-50 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-green-700" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-700">
                      Template Atlas reconnu
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-green-900">
                    {bestMatch.template.label}
                  </h3>
                  <p className="text-xs text-green-800">
                    {bestMatch.template.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-700">Confiance</p>
                  <p className="text-lg font-bold text-green-900">
                    {Math.round(bestMatch.score * 100)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs mb-4 pb-4 border-b border-green-200">
                <div>
                  <p className="text-green-700">Feuille</p>
                  <p className="font-semibold text-green-900 truncate">
                    {bestMatch.fileSheet.sheetName}
                  </p>
                </div>
                <div>
                  <p className="text-green-700">Lignes de données</p>
                  <p className="font-semibold text-green-900">
                    {bestMatch.fileSheet.rowCount.toLocaleString('fr-FR')}
                  </p>
                </div>
                <div>
                  <p className="text-green-700">Colonnes reconnues</p>
                  <p className="font-semibold text-green-900">
                    {bestMatch.matchedColumns.length} / {bestMatch.matchedSheet.columns.length}
                  </p>
                </div>
              </div>

              {bestMatch.missingRequired.length > 0 && (
                <div className="bg-amber-100 border border-amber-200 rounded-lg p-3 mb-3">
                  <p className="text-xs font-semibold text-amber-900 mb-1">
                    Colonnes obligatoires manquantes :
                  </p>
                  <ul className="text-xs text-amber-800 space-y-0.5">
                    {bestMatch.missingRequired.map(c => (
                      <li key={c.key}>• {c.header}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs text-green-800">
                <span className="font-semibold">Fichier :</span> {currentFile.name}
                <span className="mx-2">•</span>
                <span>{(currentFile.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          )}

          {/* Template non reconnu */}
          {!isRecognized && (
            <div className="border-2 border-amber-300 bg-amber-50 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-amber-900 mb-1">
                    Format non reconnu automatiquement
                  </h3>
                  <p className="text-xs text-amber-800 mb-3">
                    Aucun template Atlas officiel ne correspond à ce fichier avec une confiance suffisante.
                    Vous pouvez continuer en mode mapping manuel, ou télécharger un modèle officiel Atlas.
                  </p>
                  {result.candidates.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-900 mb-1">
                        Suggestions ({result.candidates.length}) :
                      </p>
                      <ul className="text-xs text-amber-800 space-y-1">
                        {result.candidates.slice(0, 3).map((c, i) => (
                          <li key={i}>
                            • {c.template.label} ({Math.round(c.score * 100)}%)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Détail des feuilles du fichier */}
          {result.fileSheets.length > 0 && (
            <div className="border border-neutral-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-neutral-700 mb-2">
                Feuilles détectées dans le fichier ({result.fileSheets.length}) :
              </p>
              <ul className="space-y-1.5">
                {result.fileSheets.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-neutral-600">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="font-mono font-semibold">{s.sheetName}</span>
                    <span className="text-neutral-400">•</span>
                    <span>{s.headers.length} colonnes</span>
                    <span className="text-neutral-400">•</span>
                    <span>{s.rowCount} lignes</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={reset}
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
            ← Analyser un autre fichier
          </button>
        </div>
      )}
    </div>
  );
};

export default AtlasTemplateDetector;
