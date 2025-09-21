import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { addressIpApi, authenticated_header } from '../../../../../globals/api';
import axios, { AxiosError } from 'axios';
import Spinner from '../../../../../components/common/Spinner';
import { DICTIONNARY, useLanguage } from '../../../../../globals/dictionnary';
import { FaLock, FaLockOpen, BsThreeDotsVertical } from '../../../../../components/ui/Icons';

interface FundCallDetails {
  id: number;
  request_date: string;
  reference: string;
  is_mark_as_pre_approved: boolean;
  leveling_account_from_info: {
    id: number;
    french_description: string;
    account_number: string;
  } | null;
  leveling_account_to_info: {
    id: number;
    french_description: string;
    account_number: string;
  } | null;
  amount_requested: number;
  create_by_user: {
    id: number;
    fullname: string;
  } | null;
  comment: string;
  created_at?: string;
  updated_at?: string;
}

export const FundCallDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [loading, setLoading] = useState<boolean>(true);
  const [fundCall, setFundCall] = useState<FundCallDetails | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchFundCallDetails = async () => {
      if (!id) return;

      try {
        setLoading(true);
        // Simuler l'appel API avec les données de test
        const mockData: FundCallDetails = {
          id: parseInt(id),
          request_date: "2025-01-15",
          reference: `AF-2025-${id.padStart(4, '0')}`,
          is_mark_as_pre_approved: parseInt(id) % 2 === 1, // Alternance approuvé/en attente
          leveling_account_from_info: {
            id: 1,
            french_description: "Banque BCA",
            account_number: "5211"
          },
          leveling_account_to_info: {
            id: 2,
            french_description: "Banque UBA",
            account_number: "5212"
          },
          amount_requested: 2500000,
          create_by_user: {
            id: 1,
            fullname: "Jean Dupont"
          },
          comment: `Appel de fonds détaillé pour le projet ${id}`,
          created_at: "2025-01-15T10:30:00Z",
          updated_at: "2025-01-15T14:45:00Z"
        };

        setFundCall(mockData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching fund call details:", (error as AxiosError).message);
        setError("Erreur lors du chargement des détails");
        setLoading(false);
      }
    };

    fetchFundCallDetails();
  }, [id]);

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
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

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !fundCall) {
    return (
      <div className="alert alert-danger m-3">
        <h4>Erreur</h4>
        <p>{error || "Appel de fonds introuvable"}</p>
        <Link to="/admin/finance/cash-flow/fund-calls" className="btn btn-secondary">
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <section id="fund-call-details" className="container-fluid">
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">
                <i className="fas fa-file-invoice-dollar me-2 text-primary"></i>
                Détails de l'Appel de Fonds
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
                <i className="fas fa-edit me-2"></i>Modifier
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="row">
            {/* Informations Générales */}
            <div className="col-lg-8">
              <div className="card mb-4">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0">
                    <i className="fas fa-info-circle me-2"></i>
                    Informations Générales
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
                                  <FaLock size={12} className="me-1" />
                                  Approuvé
                                </span>
                              ) : (
                                <span className="badge bg-warning fs-6">
                                  <FaLockOpen size={12} className="me-1" />
                                  En attente d'approbation
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
                                <div className="avatar avatar-sm bg-secondary rounded-circle me-2 d-flex align-items-center justify-content-center">
                                  <i className="fas fa-user text-white"></i>
                                </div>
                                {fundCall.create_by_user?.fullname || 'Utilisateur inconnu'}
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Créé le:</td>
                            <td>{fundCall.created_at && formatDateTime(fundCall.created_at)}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Modifié le:</td>
                            <td>{fundCall.updated_at && formatDateTime(fundCall.updated_at)}</td>
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
                        <i className="fas fa-comment me-2"></i>
                        {fundCall.comment}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions et Statut */}
            <div className="col-lg-4">
              <div className="card mb-4">
                <div className="card-header bg-secondary text-white">
                  <h5 className="mb-0">
                    <i className="fas fa-cogs me-2"></i>
                    Actions
                  </h5>
                </div>
                <div className="card-body">
                  <div className="d-grid gap-2">
                    {!fundCall.is_mark_as_pre_approved ? (
                      <button className="btn btn-success">
                        <i className="fas fa-check me-2"></i>
                        Approuver
                      </button>
                    ) : (
                      <button className="btn btn-warning">
                        <i className="fas fa-times me-2"></i>
                        Rejeter
                      </button>
                    )}
                    <button className="btn btn-primary">
                      <i className="fas fa-edit me-2"></i>
                      Modifier
                    </button>
                    <button className="btn btn-info">
                      <i className="fas fa-print me-2"></i>
                      Imprimer
                    </button>
                    <button className="btn btn-outline-danger">
                      <i className="fas fa-trash me-2"></i>
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>

              {/* Informations de transfert */}
              <div className="card">
                <div className="card-header bg-info text-white">
                  <h5 className="mb-0">
                    <i className="fas fa-exchange-alt me-2"></i>
                    Transfert Bancaire
                  </h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <h6 className="text-muted">Compte de départ</h6>
                    <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <div className="fw-bold">
                          {fundCall.leveling_account_from_info?.account_number}
                        </div>
                        <div className="text-muted small">
                          {fundCall.leveling_account_from_info?.french_description}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mb-3">
                    <i className="fas fa-arrow-down text-primary fs-3"></i>
                  </div>

                  <div>
                    <h6 className="text-muted">Compte d'arrivée</h6>
                    <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <div className="fw-bold">
                          {fundCall.leveling_account_to_info?.account_number}
                        </div>
                        <div className="text-muted small">
                          {fundCall.leveling_account_to_info?.french_description}
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

          {/* Historique des actions (placeholder) */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header bg-dark text-white">
                  <h5 className="mb-0">
                    <i className="fas fa-history me-2"></i>
                    Historique des Actions
                  </h5>
                </div>
                <div className="card-body">
                  <div className="timeline">
                    <div className="timeline-item">
                      <div className="timeline-marker bg-primary"></div>
                      <div className="timeline-content">
                        <h6>Création de l'appel de fonds</h6>
                        <p className="text-muted mb-1">
                          Par {fundCall.create_by_user?.fullname}
                        </p>
                        <small className="text-muted">
                          {fundCall.created_at && formatDateTime(fundCall.created_at)}
                        </small>
                      </div>
                    </div>

                    {fundCall.is_mark_as_pre_approved && (
                      <div className="timeline-item">
                        <div className="timeline-marker bg-success"></div>
                        <div className="timeline-content">
                          <h6>Appel de fonds approuvé</h6>
                          <p className="text-muted mb-1">Validation automatique</p>
                          <small className="text-muted">
                            {fundCall.updated_at && formatDateTime(fundCall.updated_at)}
                          </small>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .timeline {
          position: relative;
          padding-left: 30px;
        }

        .timeline-item {
          position: relative;
          margin-bottom: 30px;
        }

        .timeline-marker {
          position: absolute;
          left: -15px;
          top: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 0 2px #dee2e6;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: -9px;
          top: 0;
          height: 100%;
          width: 2px;
          background: #dee2e6;
        }

        .avatar {
          width: 32px;
          height: 32px;
        }
      `}</style>
    </section>
  );
};

export default FundCallDetails;