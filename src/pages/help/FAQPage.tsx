import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'f1',
    category: 'Démarrage',
    question: 'Comment créer mon premier exercice comptable ?',
    answer: "Allez dans Paramètres → Exercices → Nouvel exercice. Saisissez les dates de début et fin, puis validez. Atlas Finance crée automatiquement les 12 périodes mensuelles ouvertes.",
  },
  {
    id: 'f2',
    category: 'Démarrage',
    question: 'Puis-je importer mon plan comptable existant ?',
    answer: "Oui. Paramètres → Import/Export → Plan comptable. Formats acceptés : CSV, XLSX. Atlas Finance supporte le plan SYSCOHADA révisé 2017 pré-configuré.",
  },
  {
    id: 'f3',
    category: 'Comptabilité',
    question: 'Pourquoi mon écriture est-elle refusée ?',
    answer: "Les 3 causes les plus fréquentes : (1) somme débit ≠ somme crédit, (2) période verrouillée, (3) compte inexistant dans le plan comptable. Vérifiez l'indicateur d'équilibre dans le formulaire.",
  },
  {
    id: 'f4',
    category: 'Comptabilité',
    question: 'Comment annuler une écriture validée ?',
    answer: "Les écritures validées sont immuables (piste d'audit SYSCOHADA). Pour annuler, créez une écriture de contre-passation avec les comptes inversés dans le journal OD.",
  },
  {
    id: 'f5',
    category: 'Trésorerie',
    question: 'Atlas Finance se connecte-t-il à ma banque ?',
    answer: "Oui, via les connexions bancaires (Trésorerie → Connexions). Nous utilisons les API PSD2 pour les banques UEMOA partenaires. Sinon import manuel CSV/OFX.",
  },
  {
    id: 'f6',
    category: 'Clôtures',
    question: 'Puis-je réouvrir une clôture annuelle ?',
    answer: "Non. L'Art. 19 SYSCOHADA interdit la réouverture d'un exercice clos. Seules les clôtures mensuelles peuvent être réouvertes par un administrateur.",
  },
  {
    id: 'f7',
    category: 'Fiscalité',
    question: 'La TVA est-elle calculée automatiquement ?',
    answer: "Oui. Atlas Finance détecte le pays de l'organisation et applique le taux approprié (18% UEMOA, 19,25% Cameroun, etc.) sur les écritures AC et VE.",
  },
  {
    id: 'f8',
    category: 'Fiscalité',
    question: 'Comment générer la liasse fiscale ?',
    answer: "Fiscalité → Liasse fiscale → Générer. Sélectionnez l'exercice et le pays. Atlas Finance produit les états DGI conformes au modèle OHADA.",
  },
  {
    id: 'f9',
    category: 'Utilisateurs',
    question: "Combien d'utilisateurs puis-je inviter ?",
    answer: "Dépend de votre plan : Starter 3, Business 10, Enterprise illimité. Voir /client/billing pour votre forfait actuel.",
  },
  {
    id: 'f10',
    category: 'Utilisateurs',
    question: "Comment changer le rôle d'un collaborateur ?",
    answer: "Paramètres → Utilisateurs → cliquer sur le nom → changer le rôle dans le menu déroulant. Action tracée dans la piste d'audit.",
  },
  {
    id: 'f11',
    category: 'Sécurité',
    question: 'Mes données sont-elles sauvegardées ?',
    answer: "Oui. Sauvegardes automatiques quotidiennes (rétention 30 jours). Export manuel disponible dans Paramètres → Sauvegarde.",
  },
  {
    id: 'f12',
    category: 'Sécurité',
    question: 'Atlas Finance est-il conforme RGPD ?',
    answer: "Oui. Hébergement en Europe, chiffrement AES-256 au repos, TLS 1.3 en transit, DPO dédié. Voir notre politique de confidentialité.",
  },
];

export default function FAQPage() {
  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(f =>
      f.question.toLowerCase().includes(q) ||
      f.answer.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
    );
  }, [query]);

  const byCategory = useMemo(() => {
    const map = new Map<string, FAQItem[]>();
    filtered.forEach(item => {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const toggle = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <>
      <Helmet>
        <title>FAQ | Atlas Finance</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/help"
            className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour au centre d'aide
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Questions fréquentes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Réponses rapides aux questions les plus posées sur Atlas Finance.
          </p>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans la FAQ..."
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* FAQ Accordions by category */}
          <div className="space-y-6">
            {byCategory.map(([category, items]) => (
              <div key={category}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {category}
                </h2>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map(item => {
                    const isOpen = openIds.has(item.id);
                    return (
                      <div key={item.id}>
                        <button
                          onClick={() => toggle(item.id)}
                          className="w-full flex items-start justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <span className="font-medium text-gray-900 dark:text-white pr-4">
                            {item.question}
                          </span>
                          {isOpen ? (
                            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            {item.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl">
                Aucune question ne correspond à votre recherche.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
