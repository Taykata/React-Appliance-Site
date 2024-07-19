import { Link } from 'react-router-dom';

import style from './Home.module.css';

export default function Home() {
    return (
        <div className={style.home}>
            <h1>Welcome!</h1>
            <h2>Discover our exclusive products and special offers.</h2>
            <Link to='/all-appliances'>
                <button className={style.btn}>Start exploring now!</button>
            </Link>
        </div>
    );
}