import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../../../../../contexts/DataContext';
import SweetAlertComponent from '../../../../../components/common/SweetAlert';
import { useCenter } from '../../../../../components/common/Footer';
import { DICTIONNARY, useLanguage } from '../../../../../globals/dictionnary';
import { useFinanceContext } from '../../../../../contexts/FinanceContext';
import { FaEdit } from '../../../../../components/ui/Icons';
import { TbSquareMinusFilled, BsPlusSquareFill } from '../../../../../components/ui/Icons';

const PROCESS_ID = 52;

interface RouteParams {
  id_fund_call: string;
}

interface ShowContentState {
  [key: string]: boolean;
}

interface SelfDictionary {
  ApprovalMsgError: {
    en: string;
    fr: string;
  };
}

interface ApprovalCase {
  objectId: string;
  object_detail?: {
    content: Record<string, unknown>;
  };
}

interface FundCallNotifyProps {
  case: ApprovalCase;
  header?: React.ReactNode;
  notif?: Record<string, unknown>;
}

// Mock session hook
const useSession = () => ({
  loggedUser: { id: 1, username: 'admin' }
});

// Mock loading hook
const useLoading = () => ({
  setIsLoadingCancelable: (_loading: boolean) => {}
});

export const FundCallExpense: React.FC = () => {
  const { t } = useLanguage();
  const { center, financialYear } = useCenter();
  const { language } = useLanguage();
  const { loggedUser } = useSession();
  const { id_fund_call } = useParams<RouteParams>();
  const { setIsLoadingCancelable } = useLoading();
  const { fundCallG, handleChangeFundCall, enabledId } = useFinanceContext();
  const { adapter } = useData();

  const SELF_DICTIONNARY: SelfDictionary = {
    ApprovalMsgError: {
      en: "Please select a decision before submitting it for validation.",
      fr: "Veuillez sélectionner une décision avant de la soumettre pour validation."
    },
  };

  const [canEdit, setCanEdit] = useState<boolean>(false);
  const [newApprovedAmount, setNewApprovedAmount] = useState<number>(fundCallG?.pre_mandatory_amount ?? 0);
  const [showContent, setShowContent] = useState<ShowContentState>({});
  const [detailsFundCall, setDetailsFundCall] = useState(fundCallG.details ?? []);
  const [amountPreApproved, setAmountPreApproved] = useState<number>(0);

  const sweetAlertRef = useRef<{ show: (options: Record<string, unknown>) => void } | null>(null);

  const getFundCallApprovalInfo = async (): Promise<void> => {
    try {
      const setting = await adapter.getById<{ value: string }>('settings', 'fund_call_approval_users');
      if (setting) {
        const parsed = JSON.parse(setting.value);
        const enabledUsers: number[] = Array.isArray(parsed) ? parsed : [];
        // handleChangeFundCallEnabledUser(enabledUsers);
        void enabledUsers;
      }
    } catch (error) {
      console.error("Error fetching approval info:", error);
    }
  };

  useEffect(() => {
    if (fundCallG.id && fundCallG.approval_status !== 0) {
      getFundCallApprovalInfo();
    }
  }, [fundCallG]);

  useEffect(() => {
    const userId = loggedUser?.id ?? null;
    if (userId) {
      setCanEdit(enabledId.includes(userId) && !fundCallG.date_completion);
    } else {
      setCanEdit(false);
    }
  }, [loggedUser, enabledId, fundCallG]);

  const toggleContent = (propertyCode: string): void => {
    setShowContent((prevShowContent) => ({
      ...prevShowContent,
      [propertyCode]: !prevShowContent[propertyCode],
    }));
  };

  const formattedDate = (date: string): string => {
    const newDate = new Date(date);
    const day = String(newDate.getDate()).padStart(2, "0");
    const month = String(newDate.getMonth() + 1).padStart(2, "0");
    const year = newDate.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSelectInvoice = (rowId: number): void => {
    const updatedRows = detailsFundCall.map((row) =>
      row.id === rowId ? { ...row, is_pre_approved: !row.is_pre_approved } : row
    );
    setDetailsFundCall(updatedRows);
  };

  useEffect(() => {
    const amount = detailsFundCall.reduce((total_amount, item) => {
      if (item.is_pre_approved) {
        return total_amount + item.outstanding;
      }
      return total_amount;
    }, 0);
    setAmountPreApproved(amount);
  }, [detailsFundCall]);

  const getFundCall = async (): Promise<void> => {
    try {
      setIsLoadingCancelable(true);
      const setting = await adapter.getById<{ value: string }>('settings', 'fund_calls');
      if (setting) {
        const parsed = JSON.parse(setting.value);
        const allCalls = Array.isArray(parsed) ? parsed : [];
        const found = allCalls.find(
          (fc: Record<string, unknown>) => String(fc.id) === String(id_fund_call)
        );
        if (found) {
          handleChangeFundCall(found);
          setDetailsFundCall(found.details ?? []);
        }
      }
      setIsLoadingCancelable(false);
    } catch (error) {
      console.error("Error fetching fund call data:", error);
      setIsLoadingCancelable(false);
    }
  };

  const handlePreApproved = async (): Promise<void> => {
    if (amountPreApproved > (fundCallG.mandatory_amount || 0)) {
      sweetAlertRef.current?.afficherAlerte(
        'error',
        `Le montant total (${new Intl.NumberFormat("fr-FR").format(amountPreApproved)}) pré-approuvé est supérieur au montant maximal autorisé (${new Intl.NumberFormat("fr-FR").format(fundCallG.mandatory || 0)}).`
      );
    } else {
      const answer = await sweetAlertRef.current?.afficherConfirmation(
        'Voulez-vous vraiment pré-approuver ces factures ?',
        DICTIONNARY.Yes[language],
        DICTIONNARY.Cancel[language]
      );

      if (answer) {
        const answer1 = await sweetAlertRef.current?.afficherConfirmation(
          'Cette action est irréversible, voulez-vous continuer ?',
          DICTIONNARY.Yes[language],
          DICTIONNARY.Cancel[language]
        );

        if (answer1) {
          try {
            // Mock save operation
            await getFundCall();
            sweetAlertRef.current?.afficherAlerte('success', DICTIONNARY.EnregistrementEffectueAvecSucces[language]);
          } catch (error) {
            sweetAlertRef.current?.afficherAlerte('error', DICTIONNARY.AnErrorOccurredDuringRegistration[language]);
            console.error("Error saving fund call:", error);
          }
        }
      }
    }
  };

  const handleSaveApprovedAmount = async (): Promise<void> => {
    const answer = await sweetAlertRef.current?.afficherConfirmation(
      DICTIONNARY.VoulezVousVraimentEnregistré[language],
      DICTIONNARY.Yes[language],
      DICTIONNARY.Cancel[language]
    );

    const formData = {
      pre_mandatory_amount: newApprovedAmount
    };

    if (answer) {
      try {
        // Mock save operation
        sweetAlertRef.current?.afficherAlerte('success', DICTIONNARY.EnregistrementEffectueAvecSucces[language]);
      } catch (error) {
        sweetAlertRef.current?.afficherAlerte('error', DICTIONNARY.AnErrorOccurredDuringRegistration[language]);
        console.error("Error saving fund call:", error);
      }
    }
  };

  useEffect(() => {
    if (id_fund_call) {
      getFundCall();
    }
  }, [id_fund_call]);

  const groupInvoicesByVendor = (invoices: Record<string, unknown>[]): Record<string, Record<string, unknown>[]> => {
    return invoices.reduce((acc: Record<string, Record<string, unknown>[]>, invoice) => {
      const vendor = invoice.vendor as string;
      if (!acc[vendor]) {
        acc[vendor] = [];
      }
      acc[vendor].push(invoice);
      return acc;
    }, {});
  };

  const groupedSelectedInvoices = groupInvoicesByVendor(detailsFundCall);

  const invoiceStatus = (value: string): string => {
    const statusMap: Record<string, string> = {
      'PA': 'Previous Arrears',
      'CE': 'Critical Expenses',
      'CA': 'Current Arrears',
      'OE': 'Ongoing Expenses'
    };
    return statusMap[value] || '-';
  };

  const recommandation = (value: string): string => {
    const recommendationMap: Record<string, string> = {
      'TBP': 'To be Paid',
      'CFB': 'Critical for the Business',
      'CW': 'Can wait',
      'P': 'Paid'
    };
    return recommendationMap[value] || '-';
  };

  return (
    <div className="fund-call-expense">
      <div className="card">
        <div className="card-header bg-warning text-dark">
          <h5 className="mb-0">
            <i className="fas fa-receipt me-2"></i>
            Gestion des Dépenses - {fundCallG.reference}
          </h5>
        </div>
        <div className="card-body">
          {/* Summary Cards */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card bg-info text-white">
                <div className="card-body text-center">
                  <h6>Montant Total</h6>
                  <h4>{new Intl.NumberFormat('fr-FR').format(fundCallG.amount_requested || 0)} FCFA</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-success text-white">
                <div className="card-body text-center">
                  <h6>Pré-approuvé</h6>
                  <h4>{new Intl.NumberFormat('fr-FR').format(amountPreApproved)} FCFA</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-warning text-dark">
                <div className="card-body text-center">
                  <h6>{t('status.pending')}</h6>
                  <h4>{new Intl.NumberFormat('fr-FR').format((fundCallG.amount_requested || 0) - amountPreApproved)} FCFA</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-primary text-white">
                <div className="card-body text-center">
                  <h6>Factures</h6>
                  <h4>{detailsFundCall.length}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="row mb-3">
              <div className="col-12">
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-success"
                    onClick={handlePreApproved}
                    disabled={amountPreApproved === 0}
                  >
                    <i className="fas fa-check me-2"></i>
                    Pré-approuver ({detailsFundCall.filter(d => d.is_pre_approved).length} factures)
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveApprovedAmount}
                  >
                    <i className="fas fa-save me-2"></i>
                    Sauvegarder le montant
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Invoice List by Vendor */}
          <div className="row">
            <div className="col-12">
              <h6>Factures par Fournisseur</h6>
              {Object.entries(groupedSelectedInvoices).map(([vendor, invoices]) => (
                <div key={vendor} className="card mb-3">
                  <div
                    className="card-header bg-light cursor-pointer d-flex justify-content-between align-items-center"
                    onClick={() => toggleContent(vendor)}
                  >
                    <h6 className="mb-0">
                      <i className="fas fa-building me-2"></i>
                      {vendor} ({invoices.length} factures)
                    </h6>
                    <div className="d-flex align-items-center">
                      <span className="badge bg-secondary me-2">
                        {new Intl.NumberFormat('fr-FR').format(
                          invoices.reduce((sum, inv) => sum + inv.outstanding, 0)
                        )} FCFA
                      </span>
                      {showContent[vendor] ? <TbSquareMinusFilled /> : <BsPlusSquareFill />}
                    </div>
                  </div>

                  {showContent[vendor] && (
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-dark">
                            <tr>
                              <th>Sélection</th>
                              <th>Référence</th>
                              <th>Date facture</th>
                              <th>Description</th>
                              <th>Montant</th>
                              <th>Impayé</th>
                              <th>Âge (jours)</th>
                              <th>Statut</th>
                              <th>Recommandation</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoices.map((invoice) => (
                              <tr key={invoice.id} className={invoice.is_pre_approved ? 'table-success' : ''}>
                                <td>
                                  <div className="form-check">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      checked={invoice.is_pre_approved || false}
                                      onChange={() => handleSelectInvoice(invoice.id)}
                                      disabled={!canEdit}
                                    />
                                  </div>
                                </td>
                                <td>
                                  <strong>{invoice.reference}</strong>
                                  <br />
                                  <small className="text-muted">{invoice.entry_code}</small>
                                </td>
                                <td>{formattedDate(invoice.invoice_date)}</td>
                                <td>{invoice.description}</td>
                                <td>{new Intl.NumberFormat('fr-FR').format(invoice.credit)} FCFA</td>
                                <td>
                                  <span className={`badge ${invoice.outstanding > 0 ? 'bg-danger' : 'bg-success'}`}>
                                    {new Intl.NumberFormat('fr-FR').format(invoice.outstanding)} FCFA
                                  </span>
                                </td>
                                <td>
                                  <span className={`badge ${invoice.age > 30 ? 'bg-warning' : 'bg-info'}`}>
                                    {invoice.age}
                                  </span>
                                </td>
                                <td>
                                  <span className="badge bg-secondary">
                                    {invoiceStatus(invoice.invoice_status)}
                                  </span>
                                </td>
                                <td>
                                  <span className={`badge ${
                                    invoice.cm_recommendation === 'TBP' ? 'bg-danger' :
                                    invoice.cm_recommendation === 'CFB' ? 'bg-warning' :
                                    'bg-info'
                                  }`}>
                                    {recommandation(invoice.cm_recommendation || '')}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    disabled={!canEdit}
                                  >
                                    <FaEdit size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {Object.keys(groupedSelectedInvoices).length === 0 && (
                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  Aucune facture trouvée pour cet appel de fonds.
                </div>
              )}
            </div>
          </div>

          {/* Amount Summary */}
          <div className="row mt-4">
            <div className="col-12">
              <div className="card bg-light">
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-md-4">
                      <h6>Montant Total Sélectionné</h6>
                      <h4 className="text-primary">{new Intl.NumberFormat('fr-FR').format(amountPreApproved)} FCFA</h4>
                    </div>
                    <div className="col-md-4">
                      <h6>Montant Autorisé</h6>
                      <h4 className="text-success">{new Intl.NumberFormat('fr-FR').format(fundCallG.mandatory_amount || 0)} FCFA</h4>
                    </div>
                    <div className="col-md-4">
                      <h6>Différence</h6>
                      <h4 className={`${(fundCallG.mandatory_amount || 0) - amountPreApproved >= 0 ? 'text-success' : 'text-danger'}`}>
                        {new Intl.NumberFormat('fr-FR').format((fundCallG.mandatory_amount || 0) - amountPreApproved)} FCFA
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SweetAlertComponent ref={sweetAlertRef} />
    </div>
  );

  function handleSelectInvoice(rowId: number): void {
    const updatedRows = detailsFundCall.map((row) =>
      row.id === rowId ? { ...row, is_pre_approved: !row.is_pre_approved } : row
    );
    setDetailsFundCall(updatedRows);
  }

  function invoiceStatus(invoice_status: string): string {
    const statusMap: Record<string, string> = {
      'PA': 'Arriérés Précédents',
      'CE': 'Dépenses Critiques',
      'CA': 'Arriérés Actuels',
      'OE': 'Dépenses en Cours'
    };
    return statusMap[invoice_status] || '-';
  }

  function recommandation(value: string): string {
    const recommendationMap: Record<string, string> = {
      'TBP': 'À Payer',
      'CFB': 'Critique pour l\'Entreprise',
      'CW': 'Peut Attendre',
      'P': 'Payé'
    };
    return recommendationMap[value] || '-';
  }
};

export default FundCallExpense;