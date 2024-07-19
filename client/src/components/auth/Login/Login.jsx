import { useContext } from 'react';

import AuthContext from '../../../contexts/authContext';
import useForm from '../../../hooks/useForm';
import style from './Login.module.css';

const LoginFormKeys = {
    email: 'email',
    password: 'password'
}

export default function Login() {
    const { loginSubmitHandler } = useContext(AuthContext);
    const { values, onChange, onSubmit } = useForm(loginSubmitHandler, {
        [LoginFormKeys.email]: '',
        [LoginFormKeys.password]: ''
    });

    return (
        <div className={style.container}>
            <form className={style.form} onSubmit={onSubmit}>
                <div className={style.title}>Login</div>
                <div className={`${style.inputContainer} ${style.ic1}`}>
                    <label htmlFor="email" className={style.placeholder}>
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        name={LoginFormKeys.email}
                        className={style.input}
                        placeholder=" "
                        value={values[LoginFormKeys.email]}
                        onChange={onChange}
                    />
                    <div className={style.cut} />
                </div>
                <div className={`${style.inputContainer} ${style.ic2}`}>
                    <label htmlFor="password" className={style.placeholder}>
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        name={LoginFormKeys.password}
                        className={style.input}
                        placeholder=" "
                        value={values[LoginFormKeys.password]}
                        onChange={onChange}
                    />
                    <div className={style.cut} />
                </div>
                <button type="text" className={style.submit}>
                    Login
                </button>
            </form>
        </div>
    );
}