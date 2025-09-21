import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Building, Package, TrendingDown, Calendar, AlertTriangle,
  CheckCircle, Calculator, FileText, BarChart3, Settings,
  Plus, Edit, Trash2, Search, Filter, Download, Upload,
  Eye, Clock, DollarSign, Activity, Tag, MapPin, Wrench,
  Archive, RefreshCw, ChevronRight, Info, Camera, QrCode,
  Brain, Wifi, Smartphone, Cloud, Zap, Users, Shield,
  Database, Cpu, Radio, Monitor, Globe, Link
} from 'lucide-react';
import { CompleteAssetsModulesSimple as CompleteAssetsModulesDetailed } from './CompleteAssetsModulesSimple';
import { AssetsModules3to5 } from './AssetsModules3to5';
import { AssetsModules6to9 } from './AssetsModules6to9';
import { ModernCard, CardHeader, CardBody, StatCard } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';

const CompleteAssetsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('synthese');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['synthese', 'registre', 'amortissements-ia', 'cycle-vie', 'inventaire-auto', 'iot-monitoring', 'maintenance-ia', 'wise-fm-sync', 'rapports'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Gestion des Immobilisations
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Actifs, amortissements et inventaire physique
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton variant="outline" size="sm">
            <QrCode className="w-4 h-4 mr-1" />
            Scanner QR
          </ModernButton>
          <ModernButton variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Actualiser
          </ModernButton>
        </div>
      </div>

      {/* Content - 9 modules complets */}
      <div>
        {activeTab === 'synthese' && <CompleteAssetsModulesDetailed activeModule={1} />}
        {activeTab === 'registre' && <CompleteAssetsModulesDetailed activeModule={2} />}
        {activeTab === 'amortissements-ia' && <AssetsModules3to5 activeModule={3} />}
        {activeTab === 'cycle-vie' && <AssetsModules3to5 activeModule={4} />}
        {activeTab === 'inventaire-auto' && <AssetsModules3to5 activeModule={5} />}
        {activeTab === 'iot-monitoring' && <AssetsModules6to9 activeModule={6} />}
        {activeTab === 'maintenance-ia' && <AssetsModules6to9 activeModule={7} />}
        {activeTab === 'wise-fm-sync' && <AssetsModules6to9 activeModule={8} />}
        {activeTab === 'rapports' && <AssetsModules6to9 activeModule={9} />}
      </div>
    </div>
  );
};

export default CompleteAssetsModule;