import style from './Register.module.css';

export default function Register() {
    return (
        <div className={style.container}>
            <form className={style.form}>
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