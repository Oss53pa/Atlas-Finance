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
import { useLanguage } from '@/contexts/LanguageContext';

const FinancialStatementsIndexPage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <PageContainer background="pattern" padding="lg">
      <div className="space-y-12">
        {/* Header unifié */}
        <SectionHeader
          title={t('financialStatementsIndex.title')}
          subtitle={t('financialStatementsIndex.subtitle')}
          icon={FileText}
        />

        {/* Grid d'actions unifiées */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <UnifiedCard variant="elevated" size="lg">
            <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              <Link to="/financial-statements/balance" className="group">
                <motion.div
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="bg-gradient-to-br from-primary-50/90 to-primary-100/70 rounded-2xl p-8 border border-primary-200/50 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className="p-4 bg-primary-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <BarChart3 className="h-12 w-12 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-primary-800 text-xl mb-2">{t('financialStatementsIndex.balance')}</h3>
                      <p className="text-primary-600">{t('financialStatementsIndex.balanceDesc')}</p>
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
                      <h3 className="font-bold text-green-800 text-xl mb-2">{t('financialStatementsIndex.income')}</h3>
                      <p className="text-green-600">{t('financialStatementsIndex.incomeDesc')}</p>
                    </div>
                  </div>
                </motion.div>
              </Link>

              <Link to="/financial-statements/cash-flow" className="group">
                <motion.div
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="bg-gradient-to-br from-amber-50/90 to-amber-100/70 rounded-2xl p-8 border border-amber-200/50 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className="p-4 bg-amber-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <PieChart className="h-12 w-12 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-amber-800 text-xl mb-2">{t('financialStatementsIndex.cashFlow')}</h3>
                      <p className="text-amber-600">{t('financialStatementsIndex.cashFlowDesc')}</p>
                    </div>
                  </div>
                </motion.div>
              </Link>

              <Link to="/financial-statements/analysis" className="group">
                <motion.div
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="bg-gradient-to-br from-violet-50/90 to-violet-100/70 rounded-2xl p-8 border border-violet-200/50 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className="p-4 bg-violet-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <Target className="h-12 w-12 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-violet-800 text-xl mb-2">{t('financialStatementsIndex.analysis')}</h3>
                      <p className="text-violet-600">{t('financialStatementsIndex.analysisDesc')}</p>
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
                <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg">
                  <Calculator className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">{t('financialStatementsIndex.ohadaCompliance')}</h2>
                  <p className="text-neutral-600">{t('financialStatementsIndex.ohadaComplianceDesc')}</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-neutral-800">{t('financialStatementsIndex.syscohadaFormat')}</h3>
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600">{t('financialStatementsIndex.syscohadaFormatDesc')}</p>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-neutral-800">{t('financialStatementsIndex.multiCurrency')}</h3>
                    <div className="p-2 bg-primary-100 rounded-xl">
                      <TrendingUp className="h-5 w-5 text-primary-600" />
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600">{t('financialStatementsIndex.multiCurrencyDesc')}</p>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-neutral-800">{t('financialStatementsIndex.exportPdfExcel')}</h3>
                    <div className="p-2 bg-primary-100 rounded-xl">
                      <FileText className="h-5 w-5 text-primary-600" />
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600">{t('financialStatementsIndex.exportPdfExcelDesc')}</p>
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