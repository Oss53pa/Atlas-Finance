import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../../../contexts/LanguageContext';
import { Link } from 'react-router-dom';

interface FundCall {
  id: number;
  request_date: string;
  reference: string;
  is_mark_as_pre_approved: boolean;
  amount_requested: number;
  create_by_user: { fullname: string };
  comment: string;
  leveling_account_from_info: { french_description: string };
  leveling_account_to_info: { french_description: string };
}

export const SimpleFundCalls: React.FC = () => {
  const { t } = useLanguage();
  const [fundsCall, setFundsCall] = useState<FundCall[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Mock data immédiatement visible
  useEffect(() => {
    const mockData: FundCall[] = [
      {
        id: 1,
        request_date: "2025-01-15",
        reference: "AF-2025-0001",
        is_mark_as_pre_approved: true,
        amount_requested: 2500000,
        create_by_user: { fullname: "Jean Dupont" },
        comment: "Appel de fonds pour projet Alpha",
        leveling_account_from_info: { french_description: "Banque BCA" },
        leveling_account_to_info: { french_description: "Banque UBA" }
      },
      {
        id: 2,
        request_date: "2025-02-01",
        reference: "AF-2025-0002",
        is_mark_as_pre_approved: false,
        amount_requested: 1800000,
        create_by_user: { fullname: "Marie Martin" },
        comment: "Financement équipements Beta",
        leveling_account_from_info: { french_description: "Caisse Centrale" },
        leveling_account_to_info: { french_description: "Banque Atlantique" }
      }
    ];

    setTimeout(() => {
      setFundsCall(mockData);
      setLoading(false);
    }, 500);
  }, []);

  const formatDate = (date: string): string => {
    const newDate = new Date(date);
    return newDate.toLocaleDateString('fr-FR');
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  return (
    <div className="container-fluid">
      <div className="card">
        <div className="card-header bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0">
              💰 Appels de Fonds
            </h4>
            <button
              className="btn btn-light btn-sm"
              onClick={() => setShowModal(true)}
            >
              ➕ Nouveau
            </button>
          </div>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="text-center p-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">{t('common.loading')}</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>{t('common.date')}</th>
                    <th>Référence</th>
                    <th>Statut</th>
                    <th>Banque départ</th>
                    <th>Banque arrivée</th>
                    <th>Montant</th>
                    <th>Initié par</th>
                    <th>Commentaires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fundsCall.map((fundCall) => (
                    <tr key={fundCall.id}>
                      <td>{formatDate(fundCall.request_date)}</td>
                      <td>
                        <span className="badge bg-dark">{fundCall.reference}</span>
                      </td>
                      <td>
                        {fundCall.is_mark_as_pre_approved ? (
                          <span className="badge bg-success">🔒 Approuvé</span>
                        ) : (
                          <span className="badge bg-warning">🔓 En attente</span>
                        )}
                      </td>
                      <td>{fundCall.leveling_account_from_info.french_description}</td>
                      <td>{fundCall.leveling_account_to_info.french_description}</td>
                      <td>
                        <strong className="text-success">{formatAmount(fundCall.amount_requested)}</strong>
                      </td>
                      <td>
                        <span className="badge bg-info">{fundCall.create_by_user.fullname}</span>
                      </td>
                      <td>{fundCall.comment}</td>
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
                                to={`/admin/finance/cash-flow/payment-management/fund-calls/details/${fundCall.id}/summary`}
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
          )}

          {/* Statistiques */}
          <div className="row mt-4">
            <div className="col-md-3">
              <div className="card bg-info text-white">
                <div className="card-body text-center">
                  <h5>{fundsCall.length}</h5>
                  <p className="mb-0">Total Appels</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-success text-white">
                <div className="card-body text-center">
                  <h5>{fundsCall.filter(f => f.is_mark_as_pre_approved).length}</h5>
                  <p className="mb-0">Approuvés</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-warning text-dark">
                <div className="card-body text-center">
                  <h5>{fundsCall.filter(f => !f.is_mark_as_pre_approved).length}</h5>
                  <p className="mb-0">{t('status.pending')}</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-primary text-white">
                <div className="card-body text-center">
                  <h5>{formatAmount(fundsCall.reduce((sum, f) => sum + f.amount_requested, 0))}</h5>
                  <p className="mb-0">Montant Total</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Simple */}
      {showModal && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Nouvel Appel de Fonds</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form>
                  <div className="mb-3">
                    <label className="form-label">Date de demande</label>
                    <input type="date" className="form-control" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Montant (FCFA)</label>
                    <input type="number" className="form-control" placeholder="0" min="0" step="1000" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Compte de départ</label>
                    <select className="form-select">
                      <option>Sélectionner un compte...</option>
                      <option>5211 - Banque BCA</option>
                      <option>5212 - Banque UBA</option>
                      <option>5200 - Caisse Centrale</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Compte d'arrivée</label>
                    <select className="form-select">
                      <option>Sélectionner un compte...</option>
                      <option>5211 - Banque BCA</option>
                      <option>5212 - Banque UBA</option>
                      <option>5213 - Banque Atlantique</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Commentaire</label>
                    <textarea className="form-control" rows={3} placeholder="Raison de l'appel de fonds..."></textarea>
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
                    alert('Appel de fonds créé avec succès !');
                    setShowModal(false);
                  }}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleFundCalls;