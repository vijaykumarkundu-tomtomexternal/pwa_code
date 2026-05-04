import { useNavigate } from 'react-router-dom';
import { assets } from '../../assets';
import styles from "./Login.module.css";

const Login = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.loginWrapper}>
      <header className={styles.header}>
        <img src={assets.logo_icon} alt="Logo Image"></img>
      </header>
      <main className={styles.content}>
        <div className={styles.loginCard}>
            <h1 className={styles.title}>Login</h1>
            <input type='text' className={styles.input} placeholder='Username'/>
            <input type='password' className={styles.input} placeholder='Password'/>
            <button className={styles.loginBtn} onClick={() => navigate('/dashboard')}>Login</button>
        </div>
      </main>
      {/* <footer className={styles.footer}>Footer</footer> */}
    </div>
  );
}

export default Login;
