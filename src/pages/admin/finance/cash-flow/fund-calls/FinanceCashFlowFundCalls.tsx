import React, { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import Modal from '../../../../../components/common/BootstrapModal';
import { ModalGlobalTemplateBtn } from '../../../../../components/common/ModalGlobalTemplate';
import { Link } from 'react-router-dom';
import Spinner from '../../../../../components/common/Spinner';

import SweetAlertComponent from '../../../../../components/common/SweetAlert';
import { useCenter } from '../../../../../components/common/Footer';
import { CustomCardDrawer, CustomSideBarDrawer } from '../../../../../components/ui/CustomDrawer';
import { CashFlowCashAccountManagement_content_funCalls, cashFlowCashAccountManagement_items_funCalls } from '../../../../../components/ui/FinanceDrawer';
import { DICTIONNARY, useLanguage } from '../../../../../globals/dictionnary';
import { CustomSelector } from '../../../../../components/ui/CustomSelector';
import {
  IoCloseCircleSharp,
  BsThreeDotsVertical,
  RiRefund2Line,
  FaLock,
  FaLockOpen,
  IoIosAddCircleOutline,
  RiCloseCircleLine
} from '../../../../../components/ui/Icons';

// Interfaces et Types
interface User {
  id: number;
  fullname: string;
}

interface LevelingAccountInfo {
  id: number;
  french_description: string;
  account_number?: string;
}

interface FundCall {
  id: number;
  request_date: string;
  reference: string;
  is_mark_as_pre_approved: boolean;
  leveling_account_from_info: LevelingAccountInfo | null;
  leveling_account_to_info: LevelingAccountInfo | null;
  amount_requested: number;
  create_by_user: User | null;
  comment: string;
}

interface Account {
  id: number;
  account_number: string;
  french_description: string;
}

interface FundCallFormData {
  request_date: string;
  amount: number;
  status: string;
  comment: string;
  leveling_account_from: string | number;
  leveling_account_to: string | number;
  created_by: string;
  center: number | null;
}

interface FundCallFormProps {
  show: boolean;
  hide: () => void;
  updateDisplay: () => void;
}

interface SweetAlertRef {
  afficherConfirmation: (message: string, confirmText: string, cancelText: string) => Promise<boolean>;
  afficherAlerte: (type: 'success' | 'error', message: string) => void;
}

interface CenterData {
  id: number;
}

interface UseCenterReturn {
  center: CenterData | null;
  financialYear: number;
}

interface UseLanguageReturn {
  language: string;
}

interface Header {
  name: string;
}

interface CustomSelectorOption {
  id: number;
  value: number;
  label: string;
}

const TOTAL_ROWS = 21;

export const FinanceCashFlowFundCalls: React.FC = () => {
  const { t } = useLanguage();
    const [afficherDeuxiemeTableau, setAfficherDeuxiemeTableau] = useState<boolean>(false);
    const sweetAlertRef = useRef<SweetAlertRef>(null);
    const { language } = useLanguage() as UseLanguageReturn;

    const handleClick = (): void => {
        setAfficherDeuxiemeTableau(!afficherDeuxiemeTableau);
    };
    const { center, financialYear } = useCenter() as UseCenterReturn;

    const [modalShowModelWritting, setModalShowModelWritting] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    // Init dates
    const firstDay = new Date(financialYear, 0, 1);
    const lastDay = new Date(financialYear, 11, 31);
    const currentYear = firstDay.getFullYear();
    const currentMonth = (firstDay.getMonth() + 1).toString().padStart(2, '0');

    const [year, setYear] = useState<number>(financialYear);
    const [startDate, setStartDate] = useState<string>(firstDay.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(lastDay.toISOString().split('T')[0]);
    const [month, setMonth] = useState<string>(`${currentYear}-${currentMonth}`);

    const handleMonthChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const selectedMonth = new Date(e.target.value);
        const firstDayOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        const lastDayOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

        setYear(selectedMonth.getFullYear());
        setMonth(e.target.value);
        setStartDate(firstDayOfMonth.toISOString().slice(0, 10));
        setEndDate(lastDayOfMonth.toISOString().slice(0, 10));
    };

    // get data
    const [fundsCall, setFundsCall] = useState<FundCall[]>([]);
    const getFundCall = async (): Promise<void> => {
        setLoading(true);
        try {
            // API backend supprimée — données locales vides
            setFundsCall([]);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data:", (error as Error).message);
        }
    };

    useEffect(() => {
        getFundCall();
    }, []);

    const handleDelete = async (idItem: number): Promise<void> => {
        if (!sweetAlertRef.current) return;

        const answer = await sweetAlertRef.current.afficherConfirmation(
            DICTIONNARY.VoulezVousVraimentSupprimé[language],
            DICTIONNARY.Yes[language],
            DICTIONNARY.Cancel[language]
        );

        if (answer) {
            try {
                // API backend supprimée
                setFundsCall(prev => prev.filter(f => f.id !== idItem));
                sweetAlertRef.current.afficherAlerte('success', DICTIONNARY.SuppressionEffectueAvecSucces[language]);
            } catch (error) {
                sweetAlertRef.current.afficherAlerte('error', DICTIONNARY.AnErrorOccurredDuringRegistration[language]);
                console.error("Error:", (error as Error).message);
            }
        }
    };

    // function to format date
    function formattedDate(date: string): string {
        const newDate = new Date(date);
        const day = String(newDate.getDate()).padStart(2, "0");
        const month = String(newDate.getMonth() + 1).padStart(2, "0");
        const year = newDate.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;
        return formattedDate;
    }

    const emptyRows = TOTAL_ROWS - fundsCall.length;

    // Créer un tableau avec les données existantes et les lignes vides nécessaires
    const rows: (FundCall | {})[] = [
        ...fundsCall,
        ...Array(Math.max(0, emptyRows)).fill({})
    ];

    // Entete de chaque th tableau
    const headers: Header[] = [
        { name: "Date" },
        { name: "Référence" },
        { name: "Initié par" },
        { name: "Statut" },
    ];

    const [contentDrawerActive, setContentDrawerActive] = useState<Record<string, unknown>>();
    const [drawer, setDrawer] = useState<boolean>(false);
    const serviceCodeList: Array<{ id: string; name: string }> = [''].map(item => ({ id: (item as unknown as Record<string, string>).id, name: (item as unknown as Record<string, string>).service_code }));

    return (
        <>
            <section id='finance-cash-flow-fund-call'>
                <>
                    <FundCallForm
                        show={modalShowModelWritting}
                        hide={() => setModalShowModelWritting(false)}
                        updateDisplay={() => getFundCall()}
                    />
                </>
                <div className="custom-drawer-content">
                    <div className='card-global-green col card card-custom-rewise-drawer'>
                        <div className={`card-header change-background-color-header-gray`}>
                            <h4 className='title general-title mb-0'><RiRefund2Line className='icon-title' />Appels de Fonds</h4>
                        </div>
                        <div className={`card-body card-body-drawer`}>
                            <div className={`w-100 card-body-main my-1`}>
                                <div className='row parent mt-1'>
                                    <div className='col-12'>
                                        <div className='mx-1'>
                                            <div className='table-custom custom-list-journal-body-table mt-0'>
                                                <div className="table-responsive">
                                                    <table className="table">
                                                        <thead className="table-dark thead_">
                                                            <tr>
                                                                <th className='text-center' scope="col">{t('common.date')}</th>
                                                                <th className='text-center' scope="col">Référence</th>
                                                                <th className='text-center' scope="col">Statut</th>
                                                                <th className='text-center' scope="col">Banque départ</th>
                                                                <th className='text-center' scope="col">Banque arrivée</th>
                                                                <th className='text-center' scope="col">Montant</th>
                                                                <th className='text-center' scope="col">Initié par</th>
                                                                <th className='text-center' scope="col">Commentaires</th>
                                                                <th className='text-center' scope="col"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className='tbody_'>
                                                            {loading ? (
                                                                <tr>
                                                                    <td className='text-center bg-white' colSpan={9}><Spinner /></td>
                                                                </tr>
                                                            ) : (
                                                                rows.length > 0 ? (
                                                                    rows.map((item, index) => {
                                                                        const fundCall = item as FundCall;
                                                                        return (
                                                                            <tr key={index}>
                                                                                <td className='text-center'>{fundCall.id && formattedDate(fundCall.request_date)}</td>
                                                                                <td className='text-center'>{fundCall.id && fundCall.reference}</td>
                                                                                <td className='text-center'>
                                                                                    {fundCall.id && (
                                                                                        fundCall.is_mark_as_pre_approved ?
                                                                                        <FaLock color='green' title="Approuvé" /> :
                                                                                        <FaLockOpen color='purple' title={t('status.pending')} />
                                                                                    )}
                                                                                </td>
                                                                                <td className='text-center'>
                                                                                    {fundCall.id && fundCall.leveling_account_from_info?.french_description}
                                                                                </td>
                                                                                <td className='text-center'>
                                                                                    {fundCall.id && fundCall.leveling_account_to_info?.french_description}
                                                                                </td>
                                                                                <td className='text-center'>
                                                                                    {fundCall.id && new Intl.NumberFormat('fr-FR').format(fundCall.amount_requested)}
                                                                                </td>
                                                                                <td className='text-center'>
                                                                                    {fundCall.id && fundCall.create_by_user?.fullname}
                                                                                </td>
                                                                                <td className='text-center'>{fundCall.id && fundCall.comment}</td>
                                                                                <td className='text-center'>
                                                                                    {fundCall.id && (
                                                                                        <>
                                                                                            <div className="dropdown">
                                                                                                <span
                                                                                                    style={{ cursor: "pointer" }}
                                                                                                    data-bs-toggle="dropdown"
                                                                                                    aria-expanded="false">
                                                                                                    <BsThreeDotsVertical />
                                                                                                </span>
                                                                                                <ul className="dropdown-menu">
                                                                                                    <li>
                                                                                                        <Link
                                                                                                            className="dropdown-item"
                                                                                                            to={`/admin/finance/cash-flow/payment-management/fund-calls/details/${fundCall.id}/summary`}>
                                                                                                            Détails
                                                                                                        </Link>
                                                                                                    </li>
                                                                                                    <li>
                                                                                                        <Link
                                                                                                            className="dropdown-item"
                                                                                                            to={`#`}
                                                                                                            onClick={() => handleDelete(fundCall.id)}
                                                                                                        >
                                                                                                            Supprimer
                                                                                                        </Link>
                                                                                                    </li>
                                                                                                </ul>
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <tr>
                                                                        <td className='text-center' colSpan={9}>Aucune donnée trouvée</td>
                                                                    </tr>
                                                                )
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <CustomCardDrawer
                                title={`Menu`}
                                className={``}
                                active={true}
                                drawer={drawer}
                                children={
                                    <>
                                        <CashFlowCashAccountManagement_content_funCalls
                                            contentDrawerActive={contentDrawerActive}
                                            listFilter={[]}
                                            headerList={headers}
                                        />
                                    </>
                                }
                            />
                        </div>
                    </div>

                    <CustomSideBarDrawer
                        items={cashFlowCashAccountManagement_items_funCalls}
                        setOpenModalAdd={() => setModalShowModelWritting(true)}
                        setContentDrawerActive={setContentDrawerActive}
                        drawer={drawer}
                        setDrawer={setDrawer}
                    />
                </div>
                <SweetAlertComponent ref={sweetAlertRef}></SweetAlertComponent>
            </section>
        </>
    );
};

const FundCallForm: React.FC<FundCallFormProps> = (props) => {
    const { center, financialYear } = useCenter() as UseCenterReturn;
    const { language } = useLanguage() as UseLanguageReturn;
    const sweetAlertRef = useRef<SweetAlertRef>(null);

    // get accounts
    const [loading, setLoading] = useState<boolean>(true);
    const [accounts, setAccounts] = useState<Account[]>([]);

    const getAccounts = async (): Promise<void> => {
        try {
            setLoading(true);
            // API backend supprimée — données locales vides
            setAccounts([]);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data:", (error as Error).message);
        }
    };

    useEffect(() => {
        getAccounts();
    }, []);

    const currentDate = new Date();
    const currentDay = currentDate.toISOString().slice(0, 10);

    const [formData, setFormData] = useState<FundCallFormData>({
        request_date: currentDay,
        amount: 0,
        status: '',
        comment: '',
        leveling_account_from: '',
        leveling_account_to: '',
        created_by: '',
        center: center?.id ?? null
    });

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // submit data
    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        if (!sweetAlertRef.current) return;

        const answer = await sweetAlertRef.current.afficherConfirmation(
            DICTIONNARY.VoulezVousVraimentEnregistré[language],
            DICTIONNARY.Yes[language],
            DICTIONNARY.Cancel[language]
        );

        if (answer) {
            try {
                // API backend supprimée
                sweetAlertRef.current.afficherAlerte('success', DICTIONNARY.EnregistrementEffectueAvecSucces[language]);
                resetFormData();
            } catch (error) {
                sweetAlertRef.current.afficherAlerte('error', DICTIONNARY.AnErrorOccurredDuringRegistration[language]);
                console.error("Error saving fund call:", error);
            }
        }
    };

    const resetFormData = (): void => {
        setFormData({
            request_date: currentDay,
            amount: 0,
            status: '',
            comment: '',
            leveling_account_from: '',
            leveling_account_to: '',
            created_by: '',
            center: center?.id ?? null
        });
        props.hide();
        props.updateDisplay();
    };

    const CloseModal = (): void => {
        setFormData({
            request_date: currentDay,
            amount: 0,
            status: '',
            comment: '',
            leveling_account_from: '',
            leveling_account_to: '',
            created_by: '',
            center: center?.id ?? null
        });
        props.hide();
    };

    return (
        <>
            <Modal
                show={props.show}
                onHide={props.hide}
                size="lg"
                aria-labelledby="contained-modal-title-vcenter"
                centered
                className='modallFormsTemplateAddVersionOne fund-call-form'
                backdrop="static"
            >
                <div className='card-global-green card'>
                    <div className={`card-header change-background-color-header-red`}>
                        <h4 className='title general-title mb-0 mx-auto'>Demande d'Appel de Fonds</h4>
                        <IoCloseCircleSharp className='close-icon' onClick={CloseModal} />
                    </div>
                    <div className='card-body d-flex justify-content-center align-items-center'>
                        <div className={`w-100 h-100`}>
                            <div className="card-body-main">
                                <form onSubmit={handleSubmit}>
                                    <div className="d-flex flex-column">
                                        <fieldset className='mb-3'>
                                            <legend>Informations de l'Appel de Fonds</legend>
                                            <div className="form-section info-demandeur col">
                                                <div className="row">
                                                    <div className="col d-flex flex-row border-b mb-2">
                                                        <div className="col d-flex flex-row mb-2 me-3 align-items-center">
                                                            <label className='col-4' htmlFor="request_date">Date de demande</label>
                                                            <input
                                                                value={formData.request_date}
                                                                name='request_date'
                                                                className='col form-control form-control-sm'
                                                                type="date"
                                                                onChange={handleChange}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="col d-flex flex-row mb-2 align-items-center">
                                                            <label className='col-4' htmlFor="amount">Montant</label>
                                                            <input
                                                                value={formData.amount}
                                                                name='amount'
                                                                className='col form-control form-control-sm'
                                                                type="number"
                                                                onChange={handleChange}
                                                                step="0.01"
                                                                min="0"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="w-100 d-flex flex-column justify-content-start custom-select-search-select px-0 mb-2">
                                                        <label htmlFor="leveling_account_from" className="form-label ps-1 w-100">
                                                            Compte de départ
                                                        </label>
                                                        <CustomSelector
                                                            optionsInitial={accounts.map(item => ({
                                                                id: item.id,
                                                                value: item.id,
                                                                label: `${item.account_number} - ${item.french_description}`
                                                            }))}
                                                            className={'w-100'}
                                                            onSelect={(selectedValue: number) =>
                                                                setFormData({ ...formData, leveling_account_from: selectedValue })
                                                            }
                                                            loading={loading}
                                                            defaultSelectedValue={formData.leveling_account_from}
                                                        />
                                                    </div>
                                                    <div className="w-100 d-flex flex-column justify-content-start px-0 mb-2">
                                                        <label htmlFor="leveling_account_to" className="form-label ps-1 w-100">
                                                            Compte d'arrivée
                                                        </label>
                                                        <CustomSelector
                                                            optionsInitial={accounts.map(item => ({
                                                                id: item.id,
                                                                value: item.id,
                                                                label: `${item.account_number} - ${item.french_description}`
                                                            }))}
                                                            className={'w-100'}
                                                            onSelect={(selectedValue: number) =>
                                                                setFormData({ ...formData, leveling_account_to: selectedValue })
                                                            }
                                                            loading={loading}
                                                            defaultSelectedValue={formData.leveling_account_to}
                                                        />
                                                    </div>
                                                    <div className="w-100 d-flex flex-row">
                                                        <div className="col d-flex flex-row mb-2 align-items-start">
                                                            <label className='col-2' htmlFor="comment">Commentaire</label>
                                                            <textarea
                                                                className='form-control form-control-sm'
                                                                name='comment'
                                                                value={formData.comment}
                                                                onChange={handleChange}
                                                                rows={3}
                                                                placeholder="Raison de l'appel de fonds..."
                                                            ></textarea>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </fieldset>
                                    </div>
                                    <ModalGlobalTemplateBtn
                                        hide={props.hide}
                                        typeBtn={`bouton`}
                                        textCancel={`Annuler`}
                                        textSave={`Enregistrer`}
                                    />
                                </form>
                            </div>
                            <SweetAlertComponent ref={sweetAlertRef}></SweetAlertComponent>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default FinanceCashFlowFundCalls;