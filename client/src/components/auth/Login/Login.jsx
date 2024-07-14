import style from './Login.module.css';

export default function Login() {
    return (
        <div className={style.container}>
            <div className={style.form}>
                <div className={style.title}>Login</div>
                <div className={`${style.inputContainer} ${style.ic1}`}>
                    <label htmlFor="email" className={style.placeholder}>
                        Email
                    </label>
                    <input id="email" className={style.input} type="email" placeholder=" " />
                    <div className={style.cut} />
                </div>
                <div className={`${style.inputContainer} ${style.ic2}`}>
                    <label htmlFor="password" className={style.placeholder}>
                        Password
                    </label>
                    <input id="password" className={style.input} type="password" placeholder=" " />
                    <div className={style.cut} />
                </div>
                <button type="text" className={style.submit}>
                    Login
                </button>
            </div>
        </div>
    );
}