import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { addressIpApi, authenticated_header } from '../../../../../globals/api';
import axios, { AxiosError } from 'axios';
import SweetAlertComponent from '../../../../../components/common/SweetAlert';
import { useCenter } from '../../../../../components/common/Footer';
import { DICTIONNARY, useLanguage } from '../../../../../globals/dictionnary';
import { useFinanceContext } from '../../../../../contexts/FinanceContext';
import { BsPlusSquareFill, TbSquareMinusFilled } from '../../../../../components/ui/Icons';

interface RouteParams {
  id_fund_call: string;
}

interface Invoice {
  id: number;
  vendor: string;
  invoice_date: string;
  entry_code: string;
  reference: string;
  description: string;
  credit: number;
  outstanding: number;
  type_entry: string;
  age: number;
  invoice_status?: string;
  cm_recommendation?: string;
}

interface VendorGroup {
  vendor: string;
  entries: Invoice[];
}

interface ShowContentState {
  [key: string]: boolean;
}

// Mock session and loading hooks
const useSession = () => ({
  loggedUser: { id: 1, username: 'admin' }
});

const useLoading = () => ({
  setIsLoadingCancelable: (loading: boolean) => console.log('Loading:', loading)
});

export const FundCallPlan: React.FC = () => {
  const { center, financialYear } = useCenter();
  const { language } = useLanguage();
  const { id_fund_call } = useParams<RouteParams>();
  const { loggedUser } = useSession();
  const { fundCallG, handleChangeFundCall, handleChangeFundCallEnabledUser, enabledId } = useFinanceContext();

  const sweetAlertRef = useRef<any>();
  const [showContent, setShowContent] = useState<ShowContentState>({});
  const [showContent1, setShowContent1] = useState<ShowContentState>({});
  const [optionsInitiales, setOptionsInitiales] = useState<VendorGroup[]>([]);
  const [options, setOptions] = useState<VendorGroup[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Invoice[]>(fundCallG?.details ?? []);
  const { setIsLoadingCancelable } = useLoading();
  const [year, setYear] = useState<number>(financialYear);
  const [canEdit, setCanEdit] = useState<boolean>(false);
  const [outstandingAmount, setOutstandingAmount] = useState<number>(0);
  const [amountRequired, setAmountRequired] = useState<number>(0);

  const getFundCall = async (): Promise<void> => {
    try {
      // Mock fund call data
      const mockFundCall = {
        id: parseInt(id_fund_call || '1'),
        reference: `AF-2025-${id_fund_call?.padStart(4, '0')}`,
        approval_status: 1,
        amount_requested: 3000000,
        mandatory_amount: 5000000,
        details: [
          {
            id: 1,
            vendor: 'Fournisseur Alpha',
            invoice_date: '2025-01-10',
            entry_code: 'INV001',
            reference: 'FA-001-2025',
            description: 'Fournitures de bureau',
            credit: 750000,
            outstanding: 750000,
            type_entry: 'Purchase',
            age: 15,
            invoice_status: 'CE',
            cm_recommendation: 'TBP'
          },
          {
            id: 2,
            vendor: 'Fournisseur Beta',
            invoice_date: '2025-01-08',
            entry_code: 'INV002',
            reference: 'FB-002-2025',
            description: 'Services de maintenance',
            credit: 1200000,
            outstanding: 1200000,
            type_entry: 'Service',
            age: 18,
            invoice_status: 'PA',
            cm_recommendation: 'CFB'
          }
        ]
      };

      handleChangeFundCall(mockFundCall);
      setSelectedInvoices(mockFundCall.details);
      setIsLoadingCancelable(false);
    } catch (error) {
      sweetAlertRef.current?.afficherAlerte('error', DICTIONNARY.AnErrorOccurredDuringRegistration[language]);
      console.error("Error fetching data:", (error as AxiosError).message);
    }
  };

  useEffect(() => {
    const userId = loggedUser?.id ?? null;
    if (userId) {
      setCanEdit(enabledId.includes(userId) || fundCallG.approval_status === 0);
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

  const toggleContent1 = (propertyCode: string): void => {
    setShowContent1((prevShowContent) => ({
      ...prevShowContent,
      [propertyCode]: !prevShowContent[propertyCode],
    }));
  };

  const handleCheckboxChange = (invoice: Invoice): void => {
    const updatedInvoice: Invoice = {
      ...invoice,
      invoice_status: 'PA'
    };

    const isSelected = selectedInvoices.some(inv => inv.id === updatedInvoice.id);
    let updatedSelectedInvoices: Invoice[];

    if (isSelected) {
      updatedSelectedInvoices = selectedInvoices.filter(inv => inv.id !== updatedInvoice.id);
    } else {
      updatedSelectedInvoices = [...selectedInvoices, updatedInvoice];
    }

    setSelectedInvoices(updatedSelectedInvoices);
  };

  const handleSecondCheckboxChange = (invoice: Invoice): void => {
    const updatedSelectedInvoices = selectedInvoices.filter(inv => inv.id !== invoice.id);
    setSelectedInvoices(updatedSelectedInvoices);
  };

  useEffect(() => {
    const amount = selectedInvoices.reduce((total, item) => total + item.outstanding, 0);
    setAmountRequired(amount);

    const amount1 = optionsInitiales.reduce((total, item) => {
      const itemTotal = item.entries.reduce((subTotal, entry) => subTotal + entry.outstanding, 0);
      return total + itemTotal;
    }, 0);
    setOutstandingAmount(amount1 - amount);
  }, [selectedInvoices, optionsInitiales]);

  const getEntries = async (): Promise<void> => {
    try {
      setIsLoadingCancelable(true);
      // Mock entries data
      const mockEntries: VendorGroup[] = [
        {
          vendor: 'Fournisseur Alpha',
          entries: [
            {
              id: 1,
              vendor: 'Fournisseur Alpha',
              invoice_date: '2025-01-10',
              entry_code: 'INV001',
              reference: 'FA-001-2025',
              description: 'Fournitures de bureau',
              credit: 750000,
              outstanding: 750000,
              type_entry: 'Purchase',
              age: 15,
              invoice_status: 'CE',
              cm_recommendation: 'TBP'
            }
          ]
        },
        {
          vendor: 'Fournisseur Beta',
          entries: [
            {
              id: 2,
              vendor: 'Fournisseur Beta',
              invoice_date: '2025-01-08',
              entry_code: 'INV002',
              reference: 'FB-002-2025',
              description: 'Services de maintenance',
              credit: 1200000,
              outstanding: 1200000,
              type_entry: 'Service',
              age: 18,
              invoice_status: 'PA',
              cm_recommendation: 'CFB'
            }
          ]
        }
      ];

      setOptionsInitiales(mockEntries);
      setOptions(mockEntries);
      setIsLoadingCancelable(false);
    } catch (error) {
      console.error("Error fetching data:", (error as AxiosError).message);
    }
  };

  useEffect(() => {
    getEntries();
    if (id_fund_call) {
      getFundCall();
    }
  }, [id_fund_call]);

  const handleInvoiceStatusChange = (invoiceId: number, newStatus: string): void => {
    setSelectedInvoices(prevSelected =>
      prevSelected.map(inv =>
        inv.id === invoiceId ? { ...inv, invoice_status: newStatus } : inv
      )
    );
  };

  const handleCmRecommendationChange = (invoiceId: number, newRecommendation: string): void => {
    setSelectedInvoices(prevSelected =>
      prevSelected.map(inv =>
        inv.id === invoiceId ? { ...inv, cm_recommendation: newRecommendation } : inv
      )
    );
  };

  const handleSubmit = async (): Promise<void> => {
    if (amountRequired === 0) {
      sweetAlertRef.current?.afficherAlerte('error', 'Aucune facture sélectionnée');
      return;
    }

    const answer = await sweetAlertRef.current?.afficherConfirmation(
      DICTIONNARY.VoulezVousVraimentEnregistré[language],
      DICTIONNARY.Yes[language],
      DICTIONNARY.Cancel[language]
    );

    const formData = selectedInvoices.map(inv => ({
      id: inv.id,
      invoice_status: inv.invoice_status,
      cm_recommendation: inv.cm_recommendation,
      outstanding: inv.outstanding,
    }));

    if (answer) {
      try {
        // Mock save operation
        console.log('Saving fund call plan:', formData);
        await getFundCall();
        sweetAlertRef.current?.afficherAlerte('success', DICTIONNARY.EnregistrementEffectueAvecSucces[language]);
      } catch (error) {
        sweetAlertRef.current?.afficherAlerte('error', DICTIONNARY.AnErrorOccurredDuringRegistration[language]);
        console.error("Error saving fund call:", error);
      }
    }
  };

  const formattedDate = (date: string): string => {
    const newDate = new Date(date);
    const day = String(newDate.getDate()).padStart(2, "0");
    const month = String(newDate.getMonth() + 1).padStart(2, "0");
    const year = newDate.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const groupInvoicesByVendor = (invoices: Invoice[]): Record<string, Invoice[]> => {
    return invoices.reduce((acc, invoice) => {
      if (!acc[invoice.vendor]) {
        acc[invoice.vendor] = [];
      }
      acc[invoice.vendor].push(invoice);
      return acc;
    }, {} as Record<string, Invoice[]>);
  };

  const groupedSelectedInvoices = groupInvoicesByVendor(selectedInvoices);

  const invoiceStatus = (value: string): string => {
    const statusMap: Record<string, string> = {
      'PA': 'Arriérés Précédents',
      'CE': 'Dépenses Critiques',
      'CA': 'Arriérés Actuels',
      'OE': 'Dépenses en Cours'
    };
    return statusMap[value] || '-';
  };

  const recommandation = (value: string): string => {
    const recommendationMap: Record<string, string> = {
      'TBP': 'À Payer',
      'CFB': 'Critique pour l\'Entreprise',
      'CW': 'Peut Attendre',
      'P': 'Payé'
    };
    return recommendationMap[value] || '-';
  };

  return (
    <div className="fund-call-plan">
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">
            <i className="fas fa-clipboard-list me-2"></i>
            Planification de l'Appel de Fonds - {fundCallG.reference}
          </h5>
        </div>
        <div className="card-body">
          {/* Summary Statistics */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card bg-light">
                <div className="card-body text-center">
                  <h6>Montant Requis</h6>
                  <h4 className="text-primary">{new Intl.NumberFormat('fr-FR').format(amountRequired)} FCFA</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-light">
                <div className="card-body text-center">
                  <h6>Montant Restant</h6>
                  <h4 className="text-warning">{new Intl.NumberFormat('fr-FR').format(outstandingAmount)} FCFA</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-light">
                <div className="card-body text-center">
                  <h6>Factures Sélectionnées</h6>
                  <h4 className="text-success">{selectedInvoices.length}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-light">
                <div className="card-body text-center">
                  <h6>Fournisseurs</h6>
                  <h4 className="text-info">{Object.keys(groupedSelectedInvoices).length}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Available Invoices */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header bg-secondary text-white">
                  <h6 className="mb-0">Factures Disponibles</h6>
                </div>
                <div className="card-body">
                  {options.map((vendorGroup) => (
                    <div key={vendorGroup.vendor} className="mb-3">
                      <div
                        className="d-flex justify-content-between align-items-center p-2 bg-light rounded cursor-pointer"
                        onClick={() => toggleContent(vendorGroup.vendor)}
                      >
                        <strong>{vendorGroup.vendor}</strong>
                        <div className="d-flex align-items-center">
                          <span className="badge bg-primary me-2">
                            {vendorGroup.entries.length} factures
                          </span>
                          {showContent[vendorGroup.vendor] ? <TbSquareMinusFilled /> : <BsPlusSquareFill />}
                        </div>
                      </div>

                      {showContent[vendorGroup.vendor] && (
                        <div className="mt-2">
                          {vendorGroup.entries.map((invoice) => (
                            <div key={invoice.id} className="card mb-2">
                              <div className="card-body py-2">
                                <div className="row align-items-center">
                                  <div className="col-1">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={selectedInvoices.some(inv => inv.id === invoice.id)}
                                      onChange={() => handleCheckboxChange(invoice)}
                                    />
                                  </div>
                                  <div className="col-3">
                                    <strong>{invoice.reference}</strong>
                                    <br />
                                    <small className="text-muted">{formattedDate(invoice.invoice_date)}</small>
                                  </div>
                                  <div className="col-4">
                                    <span>{invoice.description}</span>
                                  </div>
                                  <div className="col-2">
                                    <span className="badge bg-danger">
                                      {new Intl.NumberFormat('fr-FR').format(invoice.outstanding)} FCFA
                                    </span>
                                  </div>
                                  <div className="col-2">
                                    <span className="badge bg-info">{invoice.age} jours</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Invoices */}
            <div className="col-md-6">
              <div className="card">
                <div className="card-header bg-success text-white">
                  <h6 className="mb-0">Factures Sélectionnées</h6>
                </div>
                <div className="card-body">
                  {Object.entries(groupedSelectedInvoices).map(([vendor, invoices]) => (
                    <div key={vendor} className="mb-3">
                      <div
                        className="d-flex justify-content-between align-items-center p-2 bg-light rounded cursor-pointer"
                        onClick={() => toggleContent1(vendor)}
                      >
                        <strong>{vendor}</strong>
                        <div className="d-flex align-items-center">
                          <span className="badge bg-success me-2">
                            {new Intl.NumberFormat('fr-FR').format(
                              invoices.reduce((sum, inv) => sum + inv.outstanding, 0)
                            )} FCFA
                          </span>
                          {showContent1[vendor] ? <TbSquareMinusFilled /> : <BsPlusSquareFill />}
                        </div>
                      </div>

                      {showContent1[vendor] && (
                        <div className="mt-2">
                          {invoices.map((invoice) => (
                            <div key={invoice.id} className="card mb-2 border-success">
                              <div className="card-body py-2">
                                <div className="row align-items-center">
                                  <div className="col-1">
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => handleSecondCheckboxChange(invoice)}
                                      title="Retirer de la sélection"
                                    >
                                      ×
                                    </button>
                                  </div>
                                  <div className="col-3">
                                    <strong>{invoice.reference}</strong>
                                    <br />
                                    <small className="text-muted">{formattedDate(invoice.invoice_date)}</small>
                                  </div>
                                  <div className="col-4">
                                    <span>{invoice.description}</span>
                                  </div>
                                  <div className="col-2">
                                    <span className="badge bg-success">
                                      {new Intl.NumberFormat('fr-FR').format(invoice.outstanding)} FCFA
                                    </span>
                                  </div>
                                  <div className="col-2">
                                    <select
                                      className="form-select form-select-sm"
                                      value={invoice.invoice_status}
                                      onChange={(e) => handleInvoiceStatusChange(invoice.id, e.target.value)}
                                    >
                                      <option value="PA">Arriérés Précédents</option>
                                      <option value="CE">Dépenses Critiques</option>
                                      <option value="CA">Arriérés Actuels</option>
                                      <option value="OE">Dépenses en Cours</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {selectedInvoices.length === 0 && (
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle me-2"></i>
                      Aucune facture sélectionnée. Choisissez des factures dans la liste de gauche.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="row">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5>Total Sélectionné: <span className="text-success">{new Intl.NumberFormat('fr-FR').format(amountRequired)} FCFA</span></h5>
                </div>
                <div>
                  <button
                    className="btn btn-primary me-2"
                    onClick={handleSubmit}
                    disabled={selectedInvoices.length === 0}
                  >
                    <i className="fas fa-save me-2"></i>
                    Sauvegarder le Plan
                  </button>
                  <button className="btn btn-outline-secondary">
                    <i className="fas fa-times me-2"></i>
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SweetAlertComponent ref={sweetAlertRef} />
    </div>
  );
};

export default FundCallPlan;