import { useState, useEffect } from 'react';
import style from './AllAppliances.module.css';
import ApplianceDetails from '../ApplianceDetails/ApplianceDetails';
import * as applianceService from '../../../services/applianceService';

export default function AllAppliances() {
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
        applianceService.getAll()
            .then(result => setAppliances(result));
    }, []);

    return (
        <>
            <h1 className={style.sectionTitle}>Our Products</h1>
            <div className={style.container}>
                {appliances.map(appliance => (
                    <div key={appliance._id} className={style.card}>
                        <img src={appliance.image} alt={appliance.title} />
                        <h1>{appliance.title}</h1>
                        <p className={style.price}>{appliance.price}</p>
                        <button onClick={() => createModal(appliance)}>Details</button>
                    </div>
                ))}
            </div>

            {isModalOpen && <ApplianceDetails appliance={currentAppliance} onClose={closeModal} />}
        </>
    );
}