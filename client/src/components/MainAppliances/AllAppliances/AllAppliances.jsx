import { useState, useEffect } from 'react';
import style from './AllAppliances.module.css';
import washingMachine from '/images/washing-machine.jpg';
import oven from '/images/oven.jpg';
import dishwasher from '/images/dishwasher.jpg';
import ApplianceDetails from '../ApplianceDetails/ApplianceDetails';
import * as applianceService from '../../../services/applianceService';

export default function AllAppliances() {
    const [appliances, setAppliances] = useState([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);

    const createModal = (product) => {
        setCurrentProduct(product);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setCurrentProduct(null);
    };

    const products = [
        { title: 'Washing Machine', price: '$549.99', image: washingMachine, brand: 'Bosch', description: 'Introducing the Bosch Washing Machine, designed to effortlessly handle your laundry needs with precision and ease. Built for efficiency and reliability, this washing machine is the perfect blend of advanced technology and user-friendly features.' },
        { title: 'Oven', price: '$244.99', image: oven, brand: 'Beko', description: 'Transform your kitchen into a culinary haven with the MasterChef 5000 Electric Convection Oven. Perfect for aspiring chefs and seasoned cooks alike, this oven combines cutting-edge technology with intuitive design to elevate your cooking experience.' },
        { title: 'Dishwasher', price: '$269.99', image: dishwasher, brand: 'Miele', description: 'Simplify your kitchen cleanup with the SparkleClean 3000 Series Dishwasher, a powerhouse appliance designed to handle your dishes with efficiency and style. Engineered with advanced technology and user-friendly features, this dishwasher promises to revolutionize the way you clean.' }
    ];

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

            {isModalOpen && <ApplianceDetails appliance={currentProduct} onClose={closeModal} />}
        </>
    );
}

