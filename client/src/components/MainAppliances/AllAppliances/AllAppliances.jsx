import { useState, useEffect } from 'react';

import * as applianceService from '../../../services/applianceService';
import ApplianceDetails from '../ApplianceDetails/ApplianceDetails';
import style from './AllAppliances.module.css';

export default function AllAppliances() {
    const [appliances, setAppliances] = useState([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [currentAppliance, setCurrentAppliance] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const createModal = (appliance) => {
        setCurrentAppliance(appliance);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setCurrentAppliance(null);
        setRefreshKey(prevKey => prevKey + 1);
    };

    useEffect(() => {
        applianceService.getAllAppliances()
            .then(result => setAppliances(result));
    }, [refreshKey]);

    return (
        <>
            <h1 className={style.sectionTitle}>Our Products</h1>
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

            {isModalOpen && <ApplianceDetails appliance={currentAppliance} onClose={closeModal}/>}
        </>
    );
}