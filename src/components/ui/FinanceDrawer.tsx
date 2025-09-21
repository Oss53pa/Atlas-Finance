import React from 'react';

interface Header {
  name: string;
}

interface ContentFunCallsProps {
  contentDrawerActive: any;
  listFilter: any[];
  headerList: Header[];
}

export const CashFlowCashAccountManagement_content_funCalls: React.FC<ContentFunCallsProps> = ({
  contentDrawerActive,
  listFilter,
  headerList
}) => {
  return (
    <div className="finance-drawer-content">
      <h6>Gestion des Appels de Fonds</h6>
      <div className="row">
        <div className="col-md-6">
          <h7>Filtres Disponibles:</h7>
          <ul className="list-group">
            <li className="list-group-item">Filtrer par date</li>
            <li className="list-group-item">Filtrer par statut</li>
            <li className="list-group-item">Filtrer par montant</li>
          </ul>
        </div>
        <div className="col-md-6">
          <h7>Colonnes:</h7>
          <ul className="list-group">
            {headerList.map((header, index) => (
              <li key={index} className="list-group-item">{header.name}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export const cashFlowCashAccountManagement_items_funCalls = [
  {
    id: 'export',
    title: 'Exporter les données',
    icon: 'download',
    action: 'export'
  },
  {
    id: 'filter',
    title: 'Filtres avancés',
    icon: 'filter',
    action: 'filter'
  },
  {
    id: 'refresh',
    title: 'Actualiser',
    icon: 'refresh',
    action: 'refresh'
  }
];

// Components for Treasury Forecast
interface ContentPrevisionTresorerieProps {
  contentDrawerActive: any;
  listFilter: any[];
  headerList: Header[];
}

export const Finance_Content_Prevision_Tresorerie: React.FC<ContentPrevisionTresorerieProps> = ({
  contentDrawerActive,
  listFilter,
  headerList
}) => {
  return (
    <div className="treasury-forecast-drawer-content">
      <h6>Outils de Prévision Trésorerie</h6>
      <div className="row">
        <div className="col-md-6">
          <h7>Analyses Disponibles:</h7>
          <ul className="list-group">
            <li className="list-group-item">
              <i className="fas fa-chart-line me-2"></i>Évolution des flux
            </li>
            <li className="list-group-item">
              <i className="fas fa-balance-scale me-2"></i>Équilibre trésorerie
            </li>
            <li className="list-group-item">
              <i className="fas fa-calendar-alt me-2"></i>Prévisions mensuelles
            </li>
          </ul>
        </div>
        <div className="col-md-6">
          <h7>Périodes:</h7>
          <ul className="list-group">
            {headerList.slice(0, 6).map((header, index) => (
              <li key={index} className="list-group-item">
                <i className="fas fa-calendar me-2"></i>{header.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-3">
        <div className="alert alert-info">
          <i className="fas fa-lightbulb me-2"></i>
          <strong>Conseil :</strong> Utilisez les scénarios multiples pour anticiper différentes situations économiques.
        </div>
      </div>
    </div>
  );
};

export const Finance_items_Prevision_Tresorerie = [
  {
    id: 'new-plan',
    title: 'Nouveau Plan',
    icon: 'plus',
    action: 'create'
  },
  {
    id: 'scenarios',
    title: 'Scénarios',
    icon: 'sitemap',
    action: 'scenarios'
  },
  {
    id: 'reports',
    title: 'Rapports',
    icon: 'file-alt',
    action: 'reports'
  },
  {
    id: 'export-excel',
    title: 'Export Excel',
    icon: 'file-excel',
    action: 'excel'
  },
  {
    id: 'forecast-analysis',
    title: 'Analyse Prédictive',
    icon: 'brain',
    action: 'analysis'
  },
  {
    id: 'compare',
    title: 'Comparer Plans',
    icon: 'compress-arrows-alt',
    action: 'compare'
  }
];