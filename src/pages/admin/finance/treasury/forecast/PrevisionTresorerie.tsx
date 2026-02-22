import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../../lib/db';
import { formatDate } from '../../../../../utils/formatters';
import { Link } from 'react-router-dom';
import Modal from '../../../../../components/common/BootstrapModal';
import { ModalGlobalTemplateBtn } from '../../../../../components/common/ModalGlobalTemplate';
import { CustomSideBarDrawer, CustomCardDrawer } from '../../../../../components/ui/CustomDrawer';
import { Finance_Content_Prevision_Tresorerie, Finance_items_Prevision_Tresorerie } from '../../../../../components/ui/FinanceDrawer';
import { BsThreeDotsVertical, IoCloseCircleSharp } from '../../../../../components/ui/Icons';

interface CreatePlanTresorerieForms {
    show: boolean;
    hide: () => void;
}

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

export const PrevisionTresorerie: React.FC = () => {

    const headers = [
        { name: "Janv/2025" },
        { name: "Fév/2025" },
        { name: "Mars/2025" },
        { name: "Avr/2025" },
        { name: "Mai/2025" },
        { name: "Juin/2025" },
        { name: "Juil/2025" },
        { name: "Août/2025" },
        { name: "Sept/2025" },
        { name: "Oct/2025" },
        { name: "Nov/2025" },
        { name: "Déc/2025" },
    ];

    const [contentDrawerActive, setContentDrawerActive] = useState<any>();
    const [drawer, setDrawer] = useState<boolean>(false);
    const [showModal, setShowModal] = useState<boolean>(false);

    const plansFromDb = useLiveQuery(async () => {
        const setting = await db.settings.get('treasury_plans');
        if (!setting) return [];
        try {
            const parsed: TreasuryPlan[] = JSON.parse(setting.value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }, []);

    const mockPlans: TreasuryPlan[] = plansFromDb ?? [];

    const formatAmount = (amount: number): string => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0
        }).format(amount);
    };


    return (
        <>
            <section id='finance-gestion-prevision-tresorerie'>
                <div className="custom-drawer-content">
                    <div className='card-global-green card card-custom-rewise-drawer'>
                        <div className={`card-header change-background-color-header-gray`}>
                            <h4 className='title general-title mb-0'>
                                <i className="fas fa-chart-line icon-title me-2"></i>
                                Prévision Trésorerie
                            </h4>
                        </div>
                        <div className='card-body card-body-drawer'>
                            <div className={`w-100`}>
                                <div className='table-custom custom-list-journal-body-table'>
                                    <div className="table-responsive">
                                        <table className="table">
                                            <thead className="table-dark thead_">
                                                <tr>
                                                    <th className='text-center' scope="col">N° De Plan</th>
                                                    <th className='text-center' scope="col">Date de Création</th>
                                                    <th className='text-center' scope="col">Périodes Couvertes</th>
                                                    <th className='text-center' scope="col">Encaissements Totaux</th>
                                                    <th className='text-center' scope="col">Décaissements Totaux</th>
                                                    <th className='text-center' scope="col">Solde Initial</th>
                                                    <th className='text-center' scope="col">Solde Final</th>
                                                    <th className='text-center' scope="col">Auteur</th>
                                                    <th className='text-center' scope="col">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className='tbody_'>
                                                {mockPlans.map(plan => (
                                                    <tr key={plan.id}>
                                                        <td className='text-center font-weight-bold text-primary'>
                                                            {plan.planNumber}
                                                        </td>
                                                        <td className='text-center'>
                                                            {formatDate(plan.creationDate)}
                                                        </td>
                                                        <td className='text-center'>
                                                            {plan.period}
                                                        </td>
                                                        <td className='text-center text-success font-weight-bold'>
                                                            {formatAmount(plan.totalInflows)}
                                                        </td>
                                                        <td className='text-center text-danger font-weight-bold'>
                                                            {formatAmount(plan.totalOutflows)}
                                                        </td>
                                                        <td className='text-center'>
                                                            {formatAmount(plan.initialBalance)}
                                                        </td>
                                                        <td className={`text-center font-weight-bold ${plan.finalBalance > 0 ? 'text-success' : 'text-danger'}`}>
                                                            {formatAmount(plan.finalBalance)}
                                                        </td>
                                                        <td className='text-center'>
                                                            <span className="badge bg-info">{plan.author}</span>
                                                        </td>
                                                        <td className='text-center'>
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
                                                                            to={`/admin/finance/treasury/forecast/details/${plan.id}/planification`}>
                                                                            <i className="fas fa-eye me-2"></i>Détails
                                                                        </Link>
                                                                    </li>
                                                                    <li>
                                                                        <Link
                                                                            className="dropdown-item"
                                                                            to={`/admin/finance/treasury/forecast/edit/${plan.id}`}>
                                                                            <i className="fas fa-edit me-2"></i>Modifier
                                                                        </Link>
                                                                    </li>
                                                                    <li>
                                                                        <hr className="dropdown-divider" />
                                                                    </li>
                                                                    <li>
                                                                        <Link
                                                                            className="dropdown-item text-danger"
                                                                            to={`#`}>
                                                                            <i className="fas fa-trash me-2"></i>Supprimer
                                                                        </Link>
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Lignes vides pour maintenir la structure */}
                                                {Array.from({ length: Math.max(0, 10 - mockPlans.length) }).map((_, index) => (
                                                    <tr key={`empty-${index}`}>
                                                        <td className='text-center'>&nbsp;</td>
                                                        <td className='text-center'>&nbsp;</td>
                                                        <td className='text-center'>&nbsp;</td>
                                                        <td className='text-center'>&nbsp;</td>
                                                        <td className='text-center'>&nbsp;</td>
                                                        <td className='text-center'>&nbsp;</td>
                                                        <td className='text-center'>&nbsp;</td>
                                                        <td className='text-center'>&nbsp;</td>
                                                        <td className='text-center'>&nbsp;</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <CustomCardDrawer
                                title={`Outils de Prévision`}
                                className={``}
                                active={true}
                                drawer={drawer}
                                children={
                                    <>
                                        <Finance_Content_Prevision_Tresorerie
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
                        items={Finance_items_Prevision_Tresorerie}
                        setOpenModalAdd={() => { setShowModal(true) }}
                        setContentDrawerActive={setContentDrawerActive}
                        drawer={drawer}
                        setDrawer={setDrawer}
                    />
                </div>
            </section>

            <CreatePlanTresorerieForms
                show={showModal}
                hide={() => setShowModal(false)}
            />
        </>
    )
}

const CreatePlanTresorerieForms: React.FC<CreatePlanTresorerieForms> = (props) => {
    const [formData, setFormData] = useState({
        planName: '',
        startDate: '',
        endDate: '',
        author: '',
        initialBalance: 0
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Ici, vous ajouteriez l'appel API pour sauvegarder
        props.hide();
    };

    return (
        <Modal
            show={props.show}
            onHide={props.hide}
            size="lg"
            aria-labelledby="contained-modal-title-vcenter"
            centered
            className='modallFormsTemplateAddVersionOne modal-prevision'
            backdrop="static"
        >
            <div className='card-global-green card'>
                <div className={`card-header change-background-color-header-gray`}>
                    <h4 className='title general-title mb-0 mx-auto'>
                        <i className="fas fa-plus-circle me-2"></i>
                        Création de Plan de Trésorerie
                    </h4>
                    <IoCloseCircleSharp className='close-icon' onClick={props.hide} />
                </div>
                <div className='card-body'>
                    <form onSubmit={handleSubmit}>
                        <div className="form-section col">
                            <div className="col d-flex flex-row gap-2">
                                <div className="col d-flex flex-column mb-4">
                                    <label className='col fw-bold' htmlFor="planName">
                                        Nom du plan <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        className='col form-control'
                                        type="text"
                                        name="planName"
                                        id="planName"
                                        value={formData.planName}
                                        onChange={handleInputChange}
                                        placeholder="Ex: Plan Trésorerie 2025"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="col d-flex flex-row gap-2">
                                <div className="col d-flex flex-column mb-4">
                                    <label className='col fw-bold' htmlFor="startDate">
                                        Date de Début <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        className='col form-control'
                                        type="date"
                                        name="startDate"
                                        id="startDate"
                                        value={formData.startDate}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="col d-flex flex-column mb-4">
                                    <label className='col fw-bold' htmlFor="endDate">
                                        Date de Fin <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        className='col form-control'
                                        type="date"
                                        name="endDate"
                                        id="endDate"
                                        value={formData.endDate}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="col d-flex flex-row gap-2">
                                <div className="col d-flex flex-column mb-4">
                                    <label className='col fw-bold' htmlFor="author">
                                        Auteur <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        className='col form-control'
                                        type="text"
                                        name="author"
                                        id="author"
                                        value={formData.author}
                                        onChange={handleInputChange}
                                        placeholder="Nom de l'auteur"
                                        required
                                    />
                                </div>
                                <div className="col d-flex flex-column mb-4">
                                    <label className='col fw-bold' htmlFor="initialBalance">
                                        Solde Initial (FCFA) <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        className='col form-control'
                                        type="number"
                                        name="initialBalance"
                                        id="initialBalance"
                                        value={formData.initialBalance}
                                        onChange={handleInputChange}
                                        placeholder="0"
                                        min="0"
                                        step="1000"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="alert alert-info">
                                <i className="fas fa-info-circle me-2"></i>
                                <strong>Information :</strong> Après la création, vous pourrez définir les flux mensuels d'encaissements et de décaissements.
                            </div>
                        </div>

                        <ModalGlobalTemplateBtn
                            hide={props.hide}
                            typeBtn="submit"
                            textCancel="Annuler"
                            textSave="Créer le Plan"
                        />
                    </form>
                </div>
            </div>
        </Modal>
    );
};

export default PrevisionTresorerie;