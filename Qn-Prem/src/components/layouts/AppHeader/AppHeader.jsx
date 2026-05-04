import { LogoutOutlined } from "@ant-design/icons";
import { Avatar, Segmented, Typography } from "antd";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { assets } from "../../../assets";
import styles from "./AppHeader.module.css";
import { logout } from "@/state/authSlice";

const { Text, Paragraph } = Typography;

const LogOut = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {username} = useSelector((state) => state.auth.data);

  const [open, setOpen] = useState(false);

  const onLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className={`${styles.logout} ${open && styles.active}`}>
      <div className={styles.text}>
        <Text className={styles.userTitle}>
           {username}
          <Paragraph className={styles.userSubTitle}>
            Member of the portal
          </Paragraph>
        </Text>
      </div>
      <LogoutOutlined
        onClick={onLogout}
        className={styles.first}
        size={20}
        style={{ color: "red" }}
      />
      <span onClick={onLogout} className={styles.second}>
        Logout
      </span>
      <Avatar
        onClick={() => setOpen((pre) => !pre)}
        className={styles.last}
        size={50}
        src={<img src={assets.user_lg_icon} alt="user avatar" />}
      />
    </div>
  );
};

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const onSegmentChange = (val) => {
    navigate(val);
  };

  const getOptionLabel = (route, iconActive, iconInactive, label) => (
    <div className={styles.segmentOption}>
      <img
        src={currentPath === route ? iconActive : iconInactive}
        alt={`${label} icon`}
        className={styles.iconImg}
      />
      <span
        className={
          currentPath === route ? "blue-text font-semibold" : "font-semibold"
        }
      >
        {label}
      </span>
    </div>
  );

  const segmentOptions = [
    {
      label: getOptionLabel(
        "/dashboard",
        assets.bar_icon,
        assets.barBlack,
        "Dashboard"
      ),
      value: "/dashboard",
    },
    {
      label: getOptionLabel(
        "/decisionSupport",
        assets.decisionBlue,
        assets.decision_icon,
        "Decision Support"
      ),
      value: "/decisionSupport",
    },
    {
      label: getOptionLabel(
        "/insights",
        assets.business,
        assets.business,
        "Insights"
      ),
      value: "/insights",
    },
  ];

  return (
    <header className={styles.header}>
      <img
        onClick={() => navigate("/dashboard")}
        className={styles.logo}
        src={assets.logo_icon}
        alt="Logo"
      />

      <Segmented
        options={segmentOptions}
        value={currentPath}
        onChange={onSegmentChange}
        className={styles.customSegment}
      />

      <div className={styles.user}>
        {/* <BellOutlined className="primary-text verticalLine" /> */}
        <img src={assets.bell} className="verticalLine" alt="bell icon" />
        <LogOut />
      </div>
    </header>
  );
};

export default AppHeader;
