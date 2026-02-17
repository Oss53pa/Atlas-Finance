import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface TreasuryPlan {
  id: number;
  planNumber: string;
  creationDate: string;
  period: string;
  totalInflows: number;
  totalOutflows: number;
  initialBalance: number;
  finalBalance: number;
  author: string;
}

export const SimplePrevisionTresorerie: React.FC = () => {
  const [showModal, setShowModal] = useState<boolean>(false);

  // Mock data pour prévisions trésorerie
  const mockPlans: TreasuryPlan[] = [
    {
      id: 1,
      planNumber: 'PL-2025-001',
      creationDate: '2025-01-15',
      period: 'Jan-Déc 2025',
      totalInflows: 15750000,
      totalOutflows: 12340000,
      initialBalance: 2500000,
      finalBalance: 5910000,
      author: 'Jean Dupont'
    },
    {
      id: 2,
      planNumber: 'PL-2025-002',
      creationDate: '2025-02-01',
      period: 'Fév-Jun 2025',
      totalInflows: 8250000,
      totalOutflows: 7100000,
      initialBalance: 1800000,
      finalBalance: 2950000,
      author: 'Marie Martin'
    }
  ];

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="container-fluid">
      <div className="card">
        <div className="card-header bg-info text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0">
              📊 Prévision Trésorerie
            </h4>
            <button
              className="btn btn-light btn-sm"
              onClick={() => setShowModal(true)}
            >
              ➕ Nouveau Plan
            </button>
          </div>
        </div>

        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-dark">
                <tr>
                  <th>N° Plan</th>
                  <th>Date Création</th>
                  <th>Périodes</th>
                  <th>Encaissements</th>
                  <th>Décaissements</th>
                  <th>Solde Initial</th>
                  <th>Solde Final</th>
                  <th>Auteur</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockPlans.map((plan) => (
                  <tr key={plan.id}>
                    <td>
                      <span className="badge bg-primary">{plan.planNumber}</span>
                    </td>
                    <td>{formatDate(plan.creationDate)}</td>
                    <td>{plan.period}</td>
                    <td>
                      <strong className="text-success">{formatAmount(plan.totalInflows)}</strong>
                    </td>
                    <td>
                      <strong className="text-danger">{formatAmount(plan.totalOutflows)}</strong>
                    </td>
                    <td>{formatAmount(plan.initialBalance)}</td>
                    <td>
                      <strong className={plan.finalBalance > 0 ? 'text-success' : 'text-danger'}>
                        {formatAmount(plan.finalBalance)}
                      </strong>
                    </td>
                    <td>
                      <span className="badge bg-info">{plan.author}</span>
                    </td>
                    <td>
                      <div className="dropdown">
                        <button
                          className="btn btn-sm btn-outline-secondary dropdown-toggle"
                          data-bs-toggle="dropdown"
                        >
                          ⋮
                        </button>
                        <ul className="dropdown-menu">
                          <li>
                            <Link
                              className="dropdown-item"
                              to={`/admin/finance/treasury/forecast/details/${plan.id}`}
                            >
                              👁️ Détails
                            </Link>
                          </li>
                          <li>
                            <button className="dropdown-item">✏️ Modifier</button>
                          </li>
                          <li><hr className="dropdown-divider" /></li>
                          <li>
                            <button className="dropdown-item text-danger">🗑️ Supprimer</button>
                          </li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Graphique simple des flux */}
          <div className="row mt-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">📈 Évolution des Flux Mensuels</h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'].map((month, index) => {
                      const inflow = Math.random() * 3000000 + 1000000;
                      const outflow = Math.random() * 2500000 + 800000;
                      const balance = inflow - outflow;

                      return (
                        <div key={month} className="col-md-2 mb-3">
                          <div className="card border-light">
                            <div className="card-body text-center">
                              <h6>{month} 2025</h6>
                              <div className="mb-2">
                                <small className="text-success">+{Math.round(inflow/1000)}K</small>
                              </div>
                              <div className="mb-2">
                                <small className="text-danger">-{Math.round(outflow/1000)}K</small>
                              </div>
                              <div>
                                <strong className={balance > 0 ? 'text-success' : 'text-danger'}>
                                  {balance > 0 ? '+' : ''}{Math.round(balance/1000)}K
                                </strong>
                              </div>
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
      </div>

      {/* Modal Création Plan */}
      {showModal && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">Création Plan Trésorerie</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form>
                  <div className="mb-3">
                    <label className="form-label">Nom du plan</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: Plan Trésorerie 2025"
                    />
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Date début</label>
                        <input type="date" className="form-control" />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Date fin</label>
                        <input type="date" className="form-control" />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Auteur</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Nom de l'auteur"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Solde Initial (FCFA)</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0"
                          min="0"
                          step="1000"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="alert alert-info">
                    <strong>ℹ️ Information :</strong> Après création, vous pourrez définir les flux mensuels.
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    alert('Plan de trésorerie créé avec succès !');
                    setShowModal(false);
                  }}
                >
                  Créer le Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimplePrevisionTresorerie;