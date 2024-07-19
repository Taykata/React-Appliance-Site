import { useContext } from 'react';

import AuthContext from '../../../contexts/authContext';
import useForm from '../../../hooks/useForm';
import style from './Register.module.css';

const RegisterFormKeys = {
    email: 'email',
    password: 'password',
    rePass: 'rePass'
};

export default function Register() {
    const {registerSubmitHandler} = useContext(AuthContext);
    const {values, onChange, onSubmit} = useForm(registerSubmitHandler, {
        [RegisterFormKeys.email]: '',
        [RegisterFormKeys.password]: '',
        [RegisterFormKeys.rePass]: ''
    });

    return (
        <div className={style.container}>
            <form className={style.form} onSubmit={onSubmit}>
                <div className={style.title}>Register</div>
                <div className={`${style.inputContainer} ${style.ic1}`}>
                    <label htmlFor="email" className={style.placeholder}>
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        className={style.input}
                        placeholder=" "
                        values={values[RegisterFormKeys.email]}
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
                        name="password"
                        className={style.input}
                        placeholder=" "
                        values={values[RegisterFormKeys.password]}
                        onChange={onChange}
                    />
                    <div className={style.cut} />
                </div>
                <div className={`${style.inputContainer} ${style.ic2}`}>
                    <label htmlFor="rePass" className={style.placeholder}>
                        Repeat Password
                    </label>
                    <input
                        type="password"
                        id="rePass"
                        name="rePass"
                        className={style.input}
                        placeholder=" "
                        values={values[RegisterFormKeys.rePass]}
                        onChange={onChange}
                    />
                    <div className={`${style.cut} ${style.cutShort}`} />
                </div>
                <button type="text" className={style.submit}>
                    Register
                </button>
            </form>
        </div>
    );
}