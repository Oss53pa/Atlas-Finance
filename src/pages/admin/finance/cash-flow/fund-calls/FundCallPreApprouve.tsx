import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../../lib/db';
import { useLanguage } from '../../../../../contexts/LanguageContext';
import { useFinanceContext } from '../../../../../contexts/FinanceContext';
import { TbSquareMinusFilled, BsPlusSquareFill } from '../../../../../components/ui/Icons';

interface ShowContentState {
  [key: string]: boolean;
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
  invoice_status: string;
  age: number;
  cm_recommendation: string;
  is_pre_approved?: boolean;
}

export const FundCallPreApprouve: React.FC = () => {
  const { t } = useLanguage();
  const { fundCallG } = useFinanceContext();

  const preApprovedFromDb = useLiveQuery(async () => {
    if (!fundCallG.id) return [];
    const setting = await db.settings.get('fund_calls');
    if (!setting) return [];
    try {
      const parsed = JSON.parse(setting.value);
      const allCalls = Array.isArray(parsed) ? parsed : [];
      const found = allCalls.find(
        (fc: Record<string, unknown>) => String(fc.id) === String(fundCallG.id)
      );
      if (found && Array.isArray(found.details)) {
        return (found.details as Invoice[]).filter(
          (inv: Invoice) => inv.is_pre_approved === true
        );
      }
      return [];
    } catch {
      return [];
    }
  }, [fundCallG.id]);

  const detailsFundCall: Invoice[] = preApprovedFromDb ?? [];
  const [showContent, setShowContent] = useState<ShowContentState>({});

  const formattedDate = (date: string): string => {
    const newDate = new Date(date);
    const day = String(newDate.getDate()).padStart(2, "0");
    const month = String(newDate.getMonth() + 1).padStart(2, "0");
    const year = newDate.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const toggleContent = (propertyCode: string): void => {
    setShowContent((prevShowContent) => ({
      ...prevShowContent,
      [propertyCode]: !prevShowContent[propertyCode],
    }));
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

  const groupedSelectedInvoices = groupInvoicesByVendor(detailsFundCall);

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

  const totalPreApproved = detailsFundCall.reduce((sum, invoice) => sum + invoice.outstanding, 0);

  return (
    <div className="fund-call-pre-approve">
      <div className="card">
        <div className="card-header bg-success text-white">
          <h5 className="mb-0">
            <i className="fas fa-check-circle me-2"></i>
            Factures Pré-approuvées - {fundCallG.reference || 'AF-2025-0001'}
          </h5>
        </div>
        <div className="card-body">
          {/* Summary Card */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="alert alert-success">
                <div className="row text-center">
                  <div className="col-md-3">
                    <h6>Factures Pré-approuvées</h6>
                    <h4>{detailsFundCall.length}</h4>
                  </div>
                  <div className="col-md-3">
                    <h6>Montant Total</h6>
                    <h4>{new Intl.NumberFormat('fr-FR').format(totalPreApproved)} FCFA</h4>
                  </div>
                  <div className="col-md-3">
                    <h6>{t('navigation.suppliers')}</h6>
                    <h4>{Object.keys(groupedSelectedInvoices).length}</h4>
                  </div>
                  <div className="col-md-3">
                    <h6>Statut</h6>
                    <span className="badge bg-success fs-6">
                      <i className="fas fa-check me-1"></i>
                      Approuvé
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Factures pré-approuvées par fournisseur */}
          {Object.entries(groupedSelectedInvoices).map(([vendor, invoices]) => (
            <div key={vendor} className="card mb-3 border-success">
              <div
                className="card-header bg-light cursor-pointer d-flex justify-content-between align-items-center"
                onClick={() => toggleContent(vendor)}
              >
                <h6 className="mb-0">
                  <i className="fas fa-building me-2 text-success"></i>
                  {vendor}
                  <span className="badge bg-success ms-2">{invoices.length} factures</span>
                </h6>
                <div className="d-flex align-items-center">
                  <span className="badge bg-success me-2">
                    <i className="fas fa-coins me-1"></i>
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
                      <thead className="table-success">
                        <tr>
                          <th>
                            <i className="fas fa-check-circle me-1"></i>
                            Statut
                          </th>
                          <th>Référence</th>
                          <th>Date Facture</th>
                          <th>Description</th>
                          <th>Montant Crédit</th>
                          <th>Impayé</th>
                          <th>Âge (jours)</th>
                          <th>Type</th>
                          <th>Recommandation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} className="table-light">
                            <td>
                              <span className="badge bg-success">
                                <i className="fas fa-check me-1"></i>
                                Approuvé
                              </span>
                            </td>
                            <td>
                              <strong className="text-success">{invoice.reference}</strong>
                              <br />
                              <small className="text-muted">{invoice.entry_code}</small>
                            </td>
                            <td>{formattedDate(invoice.invoice_date)}</td>
                            <td>
                              <span title={invoice.description}>
                                {invoice.description}
                              </span>
                            </td>
                            <td>
                              <span className="fw-bold">
                                {new Intl.NumberFormat('fr-FR').format(invoice.credit)} FCFA
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-success">
                                {new Intl.NumberFormat('fr-FR').format(invoice.outstanding)} FCFA
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${invoice.age > 30 ? 'bg-warning' : 'bg-info'}`}>
                                {invoice.age} jours
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
                                {recommandation(invoice.cm_recommendation)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totaux par fournisseur */}
                  <div className="row mt-3">
                    <div className="col-12">
                      <div className="bg-success text-white p-3 rounded">
                        <div className="row text-center">
                          <div className="col-md-4">
                            <h6>Total Fournisseur</h6>
                            <h5>{new Intl.NumberFormat('fr-FR').format(
                              invoices.reduce((sum, inv) => sum + inv.outstanding, 0)
                            )} FCFA</h5>
                          </div>
                          <div className="col-md-4">
                            <h6>Âge Moyen</h6>
                            <h5>{Math.round(
                              invoices.reduce((sum, inv) => sum + inv.age, 0) / invoices.length
                            )} jours</h5>
                          </div>
                          <div className="col-md-4">
                            <h6>Facteurs Critiques</h6>
                            <h5>{invoices.filter(inv => inv.cm_recommendation === 'CFB').length}</h5>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {detailsFundCall.length === 0 && (
            <div className="alert alert-info">
              <i className="fas fa-info-circle me-2"></i>
              <strong>Information :</strong> Aucune facture n'a encore été pré-approuvée pour cet appel de fonds.
            </div>
          )}

          {/* Actions */}
          {detailsFundCall.length > 0 && (
            <div className="row mt-4">
              <div className="col-12">
                <div className="card bg-light">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 className="mb-1">
                          <i className="fas fa-check-circle text-success me-2"></i>
                          Montant Total Pré-approuvé
                        </h5>
                        <h3 className="text-success mb-0">
                          {new Intl.NumberFormat('fr-FR').format(totalPreApproved)} FCFA
                        </h3>
                      </div>
                      <div>
                        <button className="btn btn-success me-2">
                          <i className="fas fa-download me-2"></i>
                          Exporter PDF
                        </button>
                        <button className="btn btn-outline-primary">
                          <i className="fas fa-print me-2"></i>
                          Imprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .cursor-pointer {
          cursor: pointer;
        }

        .cursor-pointer:hover {
          background-color: #f8f9fa !important;
        }
      `}</style>
    </div>
  );
};

export default FundCallPreApprouve;