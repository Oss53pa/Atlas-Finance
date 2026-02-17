import React from 'react';
import { useFinanceContext } from '../../../../../contexts/FinanceContext';

interface FundCallGraphProps {
  previous_arrears?: number;
  critical_expense?: number;
  current_arrears?: number;
}

// Simple Chart Component (remplace ReactApexChart)
const SimpleBarChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  height?: number;
}> = ({ data, height = 300 }) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="simple-chart" style={{ height }}>
      <div className="d-flex align-items-end justify-content-around h-100 p-3">
        {data.map((item, index) => (
          <div key={index} className="d-flex flex-column align-items-center">
            <div className="mb-2 text-center">
              <small className="text-muted">{new Intl.NumberFormat('fr-FR').format(item.value)} FCFA</small>
            </div>
            <div
              className="rounded"
              style={{
                width: '60px',
                height: `${(item.value / maxValue) * 200}px`,
                backgroundColor: item.color,
                minHeight: '20px'
              }}
            ></div>
            <div className="mt-2 text-center">
              <small className="fw-bold">{item.label}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const FundCallSummary: React.FC = () => {
  const { fundCallG, enabledId } = useFinanceContext();

  const formattedDate = (date: string): string => {
    const newDate = new Date(date);
    const day = String(newDate.getDate()).padStart(2, "0");
    const month = String(newDate.getMonth() + 1).padStart(2, "0");
    const year = newDate.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Mock data pour la démonstration
  const mockFundCall = {
    reference: fundCallG.reference || 'AF-2025-0001',
    request_date: fundCallG.request_date || '2025-01-15',
    amount_requested: fundCallG.amount_requested || 2500000,
    previous_arrears: 800000,
    critical_expense: 1200000,
    current_arrears: 500000,
    previous_arrears_requested: 800000,
    previous_arrears_approved: 600000,
    critical_expenses_requested: 1200000,
    critical_expenses_approved: 1200000,
    current_expenses_requested: 500000,
    current_expenses_approved: 300000,
    total_requested: 2500000,
    total_approved: 2100000,
    aging_invoices: {
      between_0_30_days: { count: 3, amount: 750000, percentage: 30 },
      between_31_60_days: { count: 2, amount: 500000, percentage: 20 },
      between_61_90_days: { count: 1, amount: 300000, percentage: 12 },
      between_91_120_days: { count: 1, amount: 450000, percentage: 18 },
      more_120_days: { count: 2, amount: 500000, percentage: 20 }
    }
  };

  return (
    <div className="fund-call-summary w-100 h-100">
      <div className="row">
        {/* En-tête avec informations principales */}
        <div className="col-12">
          <div className="card mb-4">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">
                <i className="fas fa-chart-pie me-2"></i>
                Résumé de l'Appel de Fonds - {mockFundCall.reference}
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <table className="table table-borderless">
                    <tbody>
                      <tr>
                        <td className="fw-bold">Date de demande:</td>
                        <td>{formattedDate(mockFundCall.request_date)}</td>
                      </tr>
                      <tr>
                        <td className="fw-bold">Montant total demandé:</td>
                        <td>
                          <span className="h5 text-primary">
                            {new Intl.NumberFormat('fr-FR').format(mockFundCall.total_requested)} FCFA
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-bold">Montant approuvé:</td>
                        <td>
                          <span className="h5 text-success">
                            {new Intl.NumberFormat('fr-FR').format(mockFundCall.total_approved)} FCFA
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-bold">Taux d'approbation:</td>
                        <td>
                          <span className="badge bg-success fs-6">
                            {((mockFundCall.total_approved / mockFundCall.total_requested) * 100).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  <div className="row">
                    <div className="col-6">
                      <div className="text-center p-3 bg-light rounded">
                        <h6>Utilisateurs Autorisés</h6>
                        <h4 className="text-info">{enabledId.length}</h4>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="text-center p-3 bg-light rounded">
                        <h6>Factures</h6>
                        <h4 className="text-warning">{fundCallG.details?.length || 0}</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Graphique des montants par catégorie */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">
                <i className="fas fa-chart-bar me-2"></i>
                Répartition par Catégorie
              </h6>
            </div>
            <div className="card-body">
              <FundCallGraph
                previous_arrears={mockFundCall.previous_arrears}
                critical_expense={mockFundCall.critical_expense}
                current_arrears={mockFundCall.current_arrears}
              />
            </div>
          </div>
        </div>

        {/* Répartition Demandé vs Approuvé */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">
                <i className="fas fa-balance-scale me-2"></i>
                Demandé vs Approuvé
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Arriérés Précédents</span>
                  <span>
                    <span className="text-primary">{new Intl.NumberFormat('fr-FR').format(mockFundCall.previous_arrears_requested)}</span>
                    {' / '}
                    <span className="text-success">{new Intl.NumberFormat('fr-FR').format(mockFundCall.previous_arrears_approved)}</span>
                  </span>
                </div>
                <div className="progress">
                  <div
                    className="progress-bar bg-success"
                    style={{ width: `${(mockFundCall.previous_arrears_approved / mockFundCall.previous_arrears_requested) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Dépenses Critiques</span>
                  <span>
                    <span className="text-primary">{new Intl.NumberFormat('fr-FR').format(mockFundCall.critical_expenses_requested)}</span>
                    {' / '}
                    <span className="text-success">{new Intl.NumberFormat('fr-FR').format(mockFundCall.critical_expenses_approved)}</span>
                  </span>
                </div>
                <div className="progress">
                  <div
                    className="progress-bar bg-success"
                    style={{ width: `${(mockFundCall.critical_expenses_approved / mockFundCall.critical_expenses_requested) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Dépenses Actuelles</span>
                  <span>
                    <span className="text-primary">{new Intl.NumberFormat('fr-FR').format(mockFundCall.current_expenses_requested)}</span>
                    {' / '}
                    <span className="text-success">{new Intl.NumberFormat('fr-FR').format(mockFundCall.current_expenses_approved)}</span>
                  </span>
                </div>
                <div className="progress">
                  <div
                    className="progress-bar bg-success"
                    style={{ width: `${(mockFundCall.current_expenses_approved / mockFundCall.current_expenses_requested) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analyse de l'âge des factures */}
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">
                <i className="fas fa-clock me-2"></i>
                Analyse de l'Âge des Factures
              </h6>
            </div>
            <div className="card-body">
              <div className="row">
                {Object.entries(mockFundCall.aging_invoices).map(([key, value]) => {
                  const labels: Record<string, string> = {
                    'between_0_30_days': '0-30 jours',
                    'between_31_60_days': '31-60 jours',
                    'between_61_90_days': '61-90 jours',
                    'between_91_120_days': '91-120 jours',
                    'more_120_days': '+120 jours'
                  };

                  const colors: Record<string, string> = {
                    'between_0_30_days': 'success',
                    'between_31_60_days': 'info',
                    'between_61_90_days': 'warning',
                    'between_91_120_days': 'danger',
                    'more_120_days': 'dark'
                  };

                  return (
                    <div key={key} className="col-md-2 mb-3">
                      <div className={`card border-${colors[key]}`}>
                        <div className="card-body text-center">
                          <h6 className="card-title">{labels[key]}</h6>
                          <h5 className={`text-${colors[key]}`}>{value.count}</h5>
                          <p className="card-text">
                            {new Intl.NumberFormat('fr-FR').format(value.amount)} FCFA
                          </p>
                          <span className={`badge bg-${colors[key]}`}>{value.percentage}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FundCallGraph: React.FC<FundCallGraphProps> = ({
  previous_arrears = 0,
  critical_expense = 0,
  current_arrears = 0
}) => {
  const chartData = [
    { label: 'Arriérés\nPrécédents', value: previous_arrears, color: '#dc3545' },
    { label: 'Dépenses\nCritiques', value: critical_expense, color: '#ffc107' },
    { label: 'Arriérés\nActuels', value: current_arrears, color: '#0d6efd' }
  ];

  return (
    <div className="fund-call-graph">
      <SimpleBarChart data={chartData} height={300} />
      <div className="mt-3">
        <div className="row text-center">
          {chartData.map((item, index) => (
            <div key={index} className="col-4">
              <div className="d-flex align-items-center justify-content-center">
                <div
                  className="me-2"
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: item.color,
                    borderRadius: '2px'
                  }}
                ></div>
                <small>{item.label.replace('\n', ' ')}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FundCallSummary;