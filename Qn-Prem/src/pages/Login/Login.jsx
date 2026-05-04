import { Button, Checkbox, Input } from "antd";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { qnAPI } from "@/api";
import { assets } from "../../assets";
import styles from "./Login.module.css";
import useMessageApi from "@/hooks/useMessageApi";
import { useDispatch, useSelector } from "react-redux";
import { login } from "@/state/authSlice";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {isAuthenticated} = useSelector((state) => state.auth);

  const { contextHolder, success, error } = useMessageApi();

  const userRef = useRef(null);
  const passRef = useRef(null);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard'); 
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const username = userRef.current?.input?.value;
    const password = passRef.current?.input?.value;

    if (!username || !password) {
      error("Please enter both username and password.");
      return;
    }
    try {
      const response = await qnAPI.login({ username, password });
      if (response.data === "success") {
        dispatch(login({token: response.data, data: {username} }));
        success("Login successful!");
        navigate("/dashboard");
      } else {
        error("Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      error("An error occurred during login. Please try again.");
    }
  };

  const handleCheckboxChange = (e) => {
    setRememberMe(e.target.checked);
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      {contextHolder}
      <div className={styles.loginWrapper}>
        <div>
          <header className={styles.header}>
            <img src={assets.logo_icon} alt="Logo Image"></img>
          </header>
          <div className="flex justify-center items-center">
            <img
              src={assets.loginBg}
              alt="Logo Image"
              className={styles.loginImg}
            ></img>
          </div>
        </div>
        <main className={styles.content}>
          <div>
            <p className="text-md">Improve your work with the power Of</p>
            <p className={styles.loginTitle}>QN AUTOMATION</p>
            <div className="flex items-center mt-1">
              <div className={styles.loginLine1}></div>
              <div className={styles.loginLine2}></div>
            </div>
          </div>
          <form className={styles.loginCard} onSubmit={onSubmit}>
            <div>
              <p className={styles.title}>Log in</p>
              <p className="text-sm">
                Log in to get in the application for more updates on the QN
                Automation reports
              </p>
            </div>
            <Input
              size="large"
              type="text"
              placeholder="Username"
              ref={userRef}
            />
            <Input
              size="large"
              type="password"
              placeholder="Password"
              ref={passRef}
            />
            <div className="flex justify-between items-center">
              <Checkbox checked={rememberMe} onChange={handleCheckboxChange}>
                Remember me
              </Checkbox>
              <p className="text-sm">Forgot Password?</p>
            </div>
            <Button
              style={{ padding: "1rem 1.5rem" }}
              className="width-fit"
              type="primary"
              size="medium"
              htmlType="submit"
            >
              LOGIN
            </Button>
          </form>
        </main>
      </div>
    </>
  );
};

export default Login;
