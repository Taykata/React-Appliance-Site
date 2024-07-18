import { useContext } from 'react';
import { NavLink } from 'react-router-dom';

import AuthContext from '../../contexts/authContext';
import style from './Navigation.module.css';
import homeImg from '../../assets/homeImg.png';

export default function Navigation() {
    const { isAuthenticated } = useContext(AuthContext);

    return (
        <div className={style.topnav}>
            <div className={style.left}>
                <NavLink to="/">
                    <img src={homeImg} alt="Go Home" className={style.image} />
                </NavLink>
            </div>
            <div className={style.right}>
                <NavLink to="/" className={({ isActive }) => isActive ? style.active : ''}>Home</NavLink>
                <NavLink to="/all-appliances" className={({ isActive }) => isActive ? style.active : ''}>All Appliances</NavLink>

                {isAuthenticated ? (
                    <div id='user'>
                        <NavLink to="/add-appliance" className={({ isActive }) => isActive ? style.active : ''}>Add Appliance</NavLink>
                        <NavLink to="/my-profile" className={({ isActive }) => isActive ? style.active : ''}>My Profile</NavLink>
                        <NavLink to="/logout" className={({ isActive }) => isActive ? style.active : ''}>Logout</NavLink>
                    </div>
                ) : (
                    <div id='guest'>
                        <NavLink to="/login" className={({ isActive }) => isActive ? style.active : ''}>Login</NavLink>
                        <NavLink to="/register" className={({ isActive }) => isActive ? style.active : ''}>Register</NavLink>
                    </div>
                )}
            </div>
        </div>
    );
}