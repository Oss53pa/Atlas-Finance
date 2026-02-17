import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  BarChart3,
  TrendingUp,
  PieChart,
  FileText,
  Calculator,
  Target
} from 'lucide-react';
import { 
  UnifiedCard,
  SectionHeader,
  PageContainer
} from '../../components/ui/DesignSystem';

const FinancialStatementsIndexPage: React.FC = () => {
  return (
    <PageContainer background="pattern" padding="lg">
      <div className="space-y-12">
        {/* Header unifié */}
        <SectionHeader
          title="États Financiers SYSCOHADA"
          subtitle="📊 États réglementaires conformes OHADA 2017"
          icon={FileText}
        />

        {/* Grid d'actions unifiées */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <UnifiedCard variant="elevated" size="lg">
            <div className="grid gap-8 sm:grid-cols-1 lg:grid-cols-3">
              <Link to="/financial-statements/balance" className="group">
                <motion.div
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="bg-gradient-to-br from-slate-50/90 to-slate-100/70 rounded-2xl p-8 border border-slate-200/50 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className="p-4 bg-slate-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <BarChart3 className="h-12 w-12 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-xl mb-2">Bilan SYSCOHADA</h3>
                      <p className="text-slate-600">Situation patrimoniale détaillée</p>
                    </div>
                  </div>
                </motion.div>
              </Link>

              <Link to="/financial-statements/income" className="group">
                <motion.div
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="bg-gradient-to-br from-green-50/90 to-green-100/70 rounded-2xl p-8 border border-green-200/50 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className="p-4 bg-green-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="h-12 w-12 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-green-800 text-xl mb-2">Compte de Résultat</h3>
                      <p className="text-green-600">Performance économique</p>
                    </div>
                  </div>
                </motion.div>
              </Link>

              <Link to="/financial-statements/cashflow" className="group">
                <motion.div
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="bg-gradient-to-br from-amber-50/90 to-amber-100/70 rounded-2xl p-8 border border-amber-200/50 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className="p-4 bg-amber-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <PieChart className="h-12 w-12 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-amber-800 text-xl mb-2">Tableau de Flux</h3>
                      <p className="text-amber-600">TAFIRE - Flux de trésorerie</p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </div>
          </UnifiedCard>
        </motion.div>

        {/* Section complémentaire */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <UnifiedCard variant="glass" size="lg">
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg">
                  <Calculator className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Conformité OHADA 2017</h2>
                  <p className="text-neutral-600">États financiers certifiés pour l'Afrique</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-neutral-800">Format SYSCOHADA</h3>
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600">Respect strict des normes comptables africaines</p>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-neutral-800">Multi-devises</h3>
                    <div className="p-2 bg-emerald-100 rounded-xl">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600">FCFA, EUR, USD - Conversion automatique</p>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-neutral-800">Export PDF/Excel</h3>
                    <div className="p-2 bg-purple-100 rounded-xl">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600">Prêt pour audits et déclarations</p>
                </div>
              </div>
            </div>
          </UnifiedCard>
        </motion.div>
      </div>
    </PageContainer>
  );
};

export default FinancialStatementsIndexPage;