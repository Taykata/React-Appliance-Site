import React from 'react';
import { Link } from 'react-router-dom';

import style from './NotFound.module.css';

export default function NotFound() {
    return (
        <div className={style.notFoundContainer}>
            <div className={style.notFoundContent}>
                <h1 className={style.errorCode}>404</h1>
                <h2 className={style.errorMessage}>Oops! Page not found.</h2>
                <p className={style.description}>
                    It looks like the page you are looking for doesn't exist or has been moved.
                </p>
                <Link to='/'>
                    <button className={style.homeButton}>Go to Homepage</button>
                </Link>
            </div>
        </div>
    );
}