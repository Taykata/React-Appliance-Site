import useForm from '../../../hooks/useForm';
import style from './Login.module.css';

export default function Login() {
    const { values, onChange, onSubmit } = useForm({
        email: '',
        password: ''
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
                        id="email"
                        className={style.input}
                        type="email"
                        placeholder=" "
                        value={values.email}
                        onChange={onChange}
                    />
                    <div className={style.cut} />
                </div>
                <div className={`${style.inputContainer} ${style.ic2}`}>
                    <label htmlFor="password" className={style.placeholder}>
                        Password
                    </label>
                    <input
                        id="password"
                        className={style.input}
                        type="password"
                        placeholder=" "
                        value={values.password}
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