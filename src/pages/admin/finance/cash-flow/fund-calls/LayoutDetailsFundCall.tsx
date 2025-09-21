import React, { useEffect, useState } from 'react';
import { useLocation, Link, Outlet, useParams } from 'react-router-dom';
import { addressIpApi, authenticated_header } from '../../../../../globals/api';
import axios, { AxiosError } from 'axios';
import { useCenter } from '../../../../../components/common/Footer';
import { IoCloseCircleSharp } from '../../../../../components/ui/Icons';
import { useFinanceContext } from '../../../../../contexts/FinanceContext';

interface RouteParams {
  id_fund_call: string;
}

interface MenuItem {
  name: string;
  path: string;
  sub_navbar: string | null;
  location_path: string;
}

// Mock loading hook
const useLoading = () => ({
  setIsLoadingCancelable: (loading: boolean) => console.log('Loading:', loading)
});

export const LayoutDetailsFundCall: React.FC = () => {
  const { id_fund_call } = useParams<RouteParams>();
  const url = `/admin/finance/cash-flow/payment-management/fund-calls/details/${id_fund_call}/`;
  const location = useLocation().pathname;
  const { center, financialYear } = useCenter();
  const { setIsLoadingCancelable } = useLoading();
  const { fundCallG, handleChangeFundCall, handleChangeFundCallEnabledUser } = useFinanceContext();
  const [year, setYear] = useState<number>(financialYear);

  const getFundCall = async (): Promise<void> => {
    try {
      setIsLoadingCancelable(true);
      // Mock API call avec données réalistes
      const mockFundCall = {
        id: parseInt(id_fund_call || '1'),
        reference: `AF-2025-${id_fund_call?.padStart(4, '0')}`,
        request_date: '2025-01-15',
        amount_requested: 2500000,
        approval_status: 1,
        is_mark_as_pre_approved: parseInt(id_fund_call || '1') % 2 === 1,
        comment: `Appel de fonds pour projet ${id_fund_call}`,
        date_completion: '', // Vide signifie en cours
        details: [
          {
            id: 1,
            vendor: 'Fournisseur Alpha',
            invoice_date: '2025-01-10',
            entry_code: 'INV001',
            reference: 'FA-001-2025',
            description: 'Équipements bureautiques',
            credit: 1500000,
            outstanding: 1500000,
            invoice_status: 'CE',
            age: 15,
            cm_recommendation: 'TBP',
            is_pre_approved: false,
            type_entry: 'Purchase'
          }
        ]
      };

      handleChangeFundCall(mockFundCall);
      setIsLoadingCancelable(false);
    } catch (error) {
      console.error("Error fetching data:", (error as AxiosError).message);
    }
  };

  const getFundCallApprovalInfo = async (): Promise<void> => {
    try {
      // Mock enabled users - simuler les utilisateurs autorisés
      const mockEnabledUsers = [1, 2, 3]; // IDs des utilisateurs autorisés
      handleChangeFundCallEnabledUser(mockEnabledUsers);
    } catch (error) {
      console.error("Error fetching data:", (error as AxiosError).message);
    }
  };

  useEffect(() => {
    if (id_fund_call) {
      getFundCall();
      getFundCallApprovalInfo();
    }
  }, [id_fund_call]);

  const menu: MenuItem[] = [
    {
      name: "Plan",
      path: "plan",
      sub_navbar: null,
      location_path: url,
    },
    {
      name: "Résumé",
      path: "summary",
      sub_navbar: null,
      location_path: url,
    },
    {
      name: "Dépenses",
      path: "expense",
      sub_navbar: null,
      location_path: url,
    },
    ...(fundCallG.is_mark_as_pre_approved ? [{
      name: "Pré-approuvé",
      path: "pre-approuve",
      sub_navbar: null,
      location_path: url,
    }] : []),
  ];

  return (
    <section id='finance-cash-flow-fund-call-details' className="container-fluid">
      <div className='card border-0 shadow'>
        <div className={`card-header bg-primary text-white d-flex justify-content-between align-items-center`}>
          <div>
            <h4 className='mb-0'>
              <i className="fas fa-file-invoice-dollar me-2"></i>
              Détails Appel de Fonds
            </h4>
          </div>
          <div className="d-flex align-items-center">
            <span className="badge bg-light text-dark fs-6 me-3">
              {fundCallG?.reference || `AF-2025-${id_fund_call?.padStart(4, '0')}`}
            </span>
            <Link to='/admin/finance/cash-flow/fund-calls' className="text-white">
              <IoCloseCircleSharp size={24} className='cursor-pointer' />
            </Link>
          </div>
        </div>

        <div className='card-body p-0'>
          <div className={`w-100 h-100 d-flex flex-column`}>
            {/* Navigation Tabs */}
            <nav className='bg-light border-bottom'>
              <div className="container-fluid">
                <ul className='nav nav-tabs border-0'>
                  {menu.map(item => (
                    <li className="nav-item" key={item.path}>
                      <Link
                        className={`nav-link ${
                          (location.startsWith(item.location_path + item.path) ||
                           location.startsWith(item.sub_navbar || ''))
                            ? 'active'
                            : ''
                        }`}
                        to={item.path}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            {/* Content Area */}
            <div className="flex-grow-1 p-4">
              <Outlet />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .nav-tabs .nav-link.active {
          background-color: white;
          border-color: #dee2e6 #dee2e6 white;
          color: #0d6efd;
          font-weight: 600;
        }

        .nav-tabs .nav-link {
          border: none;
          border-bottom: 3px solid transparent;
          color: #6c757d;
          transition: all 0.3s;
        }

        .nav-tabs .nav-link:hover {
          border-bottom-color: #0d6efd;
          color: #0d6efd;
        }

        .cursor-pointer {
          cursor: pointer;
        }

        .cursor-pointer:hover {
          opacity: 0.8;
        }
      `}</style>
    </section>
  );
};

export default LayoutDetailsFundCall;