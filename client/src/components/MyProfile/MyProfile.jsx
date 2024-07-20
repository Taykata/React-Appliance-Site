import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import * as applianceService from '../../services/applianceService';
import ApplianceDetails from '../MainAppliances/ApplianceDetails/ApplianceDetails';
import AuthContext from '../../contexts/authContext';
import style from './MyProfile.module.css';

export default function MyProfile() {
    const { userId } = useContext(AuthContext);
    const [appliances, setAppliances] = useState([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [currentAppliance, setCurrentAppliance] = useState(null);

    const createModal = (appliance) => {
        setCurrentAppliance(appliance);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setCurrentAppliance(null);
    };

    useEffect(() => {
        applianceService.getAppliancesForUser(userId)
            .then(res => setAppliances(res));
    }, []);

    return (
        <>
            {appliances.length ? (
                <>
                    <h1 className={style.sectionTitle}>Your Products</h1>
                    <div className={style.container}>
                        {appliances.map(appliance => (
                            <div key={appliance._id} className={style.card}>
                                <img src={appliance.image} alt={appliance.title} />
                                <h1>{appliance.title}</h1>
                                <p className={style.price}>${appliance.price}</p>
                                <button onClick={() => createModal(appliance)}>Details</button>
                            </div>
                        ))}
                    </div>

                    {isModalOpen && <ApplianceDetails appliance={currentAppliance} onClose={closeModal} />}
                </>
            ) : (
                <div className={style.emptyStateContainer}>
                    <div className={style.emptyState}>
                        <h1>This is your profile!</h1>
                        <p>You haven't listed any appliances for sale yet.</p>
                        <Link to='/add-appliance'>
                            <button className={style.createButton} >Create Appliance</button>
                        </Link>
                    </div>
                </div>
            )}
        </>
    );
}