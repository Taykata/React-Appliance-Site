import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import * as applianceService from '../../../services/applianceService';
import AuthContext from '../../../contexts/authContext';
import style from './ApplianceDetails.module.css';

import ApplianceComments from '../ApplianceComments/ApplianceComments';

export default function ApplianceDetails({ appliance, onClose }) {
    const navigate = useNavigate();
    const { userId } = useContext(AuthContext);
    const isOwner = userId === appliance._ownerId;

    const onDelete = async () => {
        const isConfirmed = confirm(`Are you sure you want to delete ${appliance.title}?`);

        if (isConfirmed) {

            await applianceService.deleteAppliance(appliance._id);

            onClose();
            navigate('/all-appliances');
        }
    }

    return (
        <div className={style.backdrop} onClick={onClose}>
            <div className={style.modal} onClick={e => e.stopPropagation()}>
                <article className={style.modalContainer}>
                    <header className={style.modalContainerHeader}>
                        <h1 className={style.modalContainerTitle}>
                            Details
                        </h1>
                        <button className={style.iconButton} onClick={onClose}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width={24}
                                height={24}
                            >
                                <path fill="none" d="M0 0h24v24H0z" />
                                <path
                                    fill="currentColor"
                                    d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z"
                                />
                            </svg>
                        </button>
                    </header>
                    <section className={`${style.modalContainerBody} ${style.rtf}`}>
                        <div className={style.imageAndDetails}>
                            <img className={style.img} src={appliance.image} alt="Product's image" />
                            <div className={style.rightContainer}>
                                <p className={style.right}>Title: {appliance.title}</p>
                                <p className={style.right}>Brand: {appliance.brand}</p>
                                <p className={style.right}>Price: ${appliance.price}</p>
                            </div>
                        </div>
                        <p className={style.description}>{appliance.description}</p>

                        <h1 className={style.reviewsTitle}>Reviews:</h1>
                        <ApplianceComments />
                    </section>

                    {isOwner && (
                        <footer className={style.modalContainerFooter}>
                            <Link to={`/edit/${appliance._id}`}><button className={`${style.button} ${style.isGhost}`}>Edit</button></Link>
                            <button className={`${style.button} ${style.isPrimary}`} onClick={onDelete}>Delete</button>
                        </footer>
                    )}
                </article>
            </div>
        </div>
    );
}