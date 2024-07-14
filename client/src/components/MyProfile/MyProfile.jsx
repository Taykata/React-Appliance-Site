import { Link } from 'react-router-dom';
import style from './MyProfile.module.css';

export default function MyProfile() {
    return (
        <div className={style.emptyStateContainer}>
            <div className={style.emptyState}>
                <h1>This is your profile!</h1>
                <p>You haven't listed any appliances for sale yet.</p>
                <Link to='/add-appliance'>
                    <button className={style.createButton} >Create Appliance</button>
                </Link>
            </div>
        </div>
    );
}