import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

interface FundCallDetails {
  id: number;
  request_date: string;
  reference: string;
  is_mark_as_pre_approved: boolean;
  amount_requested: number;
  create_by_user: { fullname: string };
  comment: string;
  leveling_account_from_info: { french_description: string; account_number: string };
  leveling_account_to_info: { french_description: string; account_number: string };
}

export const SimpleFundCallDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [fundCall, setFundCall] = useState<FundCallDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Mock data basée sur l'ID
    const mockData: FundCallDetails = {
      id: parseInt(id || '1'),
      request_date: "2025-01-15",
      reference: `AF-2025-${id?.padStart(4, '0')}`,
      is_mark_as_pre_approved: parseInt(id || '1') % 2 === 1,
      amount_requested: 2500000,
      create_by_user: { fullname: "Jean Dupont" },
      comment: `Appel de fonds détaillé pour le projet ${id}`,
      leveling_account_from_info: {
        french_description: "Banque BCA",
        account_number: "5211"
      },
      leveling_account_to_info: {
        french_description: "Banque UBA",
        account_number: "5212"
      }
    };

    setTimeout(() => {
      setFundCall(mockData);
      setLoading(false);
    }, 300);
  }, [id]);

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!fundCall) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">
          <h4>Erreur</h4>
          <p>Appel de fonds introuvable</p>
          <Link to="/admin/finance/cash-flow/fund-calls" className="btn btn-secondary">
            ← Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          {/* Navigation */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">
                💰 Détails de l'Appel de Fonds
              </h2>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <Link to="/admin/finance/cash-flow/fund-calls">Appels de Fonds</Link>
                  </li>
                  <li className="breadcrumb-item active">{fundCall.reference}</li>
                </ol>
              </nav>
            </div>
            <div>
              <Link
                to="/admin/finance/cash-flow/fund-calls"
                className="btn btn-outline-secondary me-2"
              >
                ← Retour
              </Link>
              <button className="btn btn-primary">
                ✏️ Modifier
              </button>
            </div>
          </div>

          {/* Informations Principales */}
          <div className="row">
            <div className="col-lg-8">
              <div className="card mb-4">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0">
                    📋 Informations Générales
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <table className="table table-borderless">
                        <tbody>
                          <tr>
                            <td className="fw-bold">Référence:</td>
                            <td>
                              <span className="badge bg-dark fs-6">{fundCall.reference}</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Date de demande:</td>
                            <td>{formatDate(fundCall.request_date)}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Montant demandé:</td>
                            <td>
                              <span className="h4 text-success">
                                {formatAmount(fundCall.amount_requested)}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Statut:</td>
                            <td>
                              {fundCall.is_mark_as_pre_approved ? (
                                <span className="badge bg-success fs-6">
                                  🔒 Approuvé
                                </span>
                              ) : (
                                <span className="badge bg-warning fs-6">
                                  🔓 En attente d'approbation
                                </span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="col-md-6">
                      <table className="table table-borderless">
                        <tbody>
                          <tr>
                            <td className="fw-bold">Initié par:</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="bg-secondary rounded-circle me-2 d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                                  👤
                                </div>
                                {fundCall.create_by_user.fullname}
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Créé le:</td>
                            <td>{formatDate(fundCall.request_date)}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Dernière modif:</td>
                            <td>{formatDate(fundCall.request_date)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Commentaire */}
                  {fundCall.comment && (
                    <div className="mt-3">
                      <h6 className="fw-bold">Commentaire:</h6>
                      <div className="alert alert-light">
                        💬 {fundCall.comment}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions et Transfert */}
            <div className="col-lg-4">
              <div className="card mb-4">
                <div className="card-header bg-secondary text-white">
                  <h5 className="mb-0">
                    ⚙️ Actions
                  </h5>
                </div>
                <div className="card-body">
                  <div className="d-grid gap-2">
                    {!fundCall.is_mark_as_pre_approved ? (
                      <button className="btn btn-success">
                        ✅ Approuver
                      </button>
                    ) : (
                      <button className="btn btn-warning">
                        ❌ Rejeter
                      </button>
                    )}
                    <button className="btn btn-primary">
                      ✏️ Modifier
                    </button>
                    <button className="btn btn-info">
                      🖨️ Imprimer
                    </button>
                    <button className="btn btn-outline-danger">
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              </div>

              {/* Informations de transfert */}
              <div className="card">
                <div className="card-header bg-info text-white">
                  <h5 className="mb-0">
                    🔄 Transfert Bancaire
                  </h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <h6 className="text-muted">Compte de départ</h6>
                    <div className="card bg-light">
                      <div className="card-body py-2">
                        <div className="fw-bold">
                          {fundCall.leveling_account_from_info.account_number}
                        </div>
                        <div className="text-muted small">
                          {fundCall.leveling_account_from_info.french_description}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mb-3">
                    <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                      ⬇️
                    </div>
                  </div>

                  <div>
                    <h6 className="text-muted">Compte d'arrivée</h6>
                    <div className="card bg-light">
                      <div className="card-body py-2">
                        <div className="fw-bold">
                          {fundCall.leveling_account_to_info.account_number}
                        </div>
                        <div className="text-muted small">
                          {fundCall.leveling_account_to_info.french_description}
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr />

                  <div className="text-center">
                    <div className="text-muted small">Montant du transfert</div>
                    <div className="h3 text-success mb-0">
                      {formatAmount(fundCall.amount_requested)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historique */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header bg-dark text-white">
                  <h5 className="mb-0">
                    📅 Historique des Actions
                  </h5>
                </div>
                <div className="card-body">
                  <div className="timeline">
                    <div className="d-flex mb-3">
                      <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px', minWidth: '40px'}}>
                        ➕
                      </div>
                      <div>
                        <h6>Création de l'appel de fonds</h6>
                        <p className="text-muted mb-1">
                          Par {fundCall.create_by_user.fullname}
                        </p>
                        <small className="text-muted">
                          {formatDate(fundCall.request_date)} à 10:30
                        </small>
                      </div>
                    </div>

                    {fundCall.is_mark_as_pre_approved && (
                      <div className="d-flex mb-3">
                        <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px', minWidth: '40px'}}>
                          ✅
                        </div>
                        <div>
                          <h6>Appel de fonds approuvé</h6>
                          <p className="text-muted mb-1">Validation automatique</p>
                          <small className="text-muted">
                            {formatDate(fundCall.request_date)} à 14:45
                          </small>
                        </div>
                      </div>
                    )}

                    <div className="d-flex">
                      <div className="bg-info text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px', minWidth: '40px'}}>
                        👁️
                      </div>
                      <div>
                        <h6>Consultation des détails</h6>
                        <p className="text-muted mb-1">Visualisation en cours</p>
                        <small className="text-muted">
                          Maintenant
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleFundCallDetails;