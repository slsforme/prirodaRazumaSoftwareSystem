import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Document from "../../../assets/photos/document.png";
import Logout from "../../../assets/photos/logout.png";
import Logo from "../../../assets/photos/main.png";
import Patient from "../../../assets/photos/patient.png";
import Setting from "../../../assets/photos/setting.png";
import User from "../../../assets/photos/user.png";
import Users from "../../../assets/photos/users.png";
import { authUtils } from "../../auth/services/utils";
import "../styles/index.css";

interface SidebarProps {
  show: boolean;
  onToggle: () => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ show, onToggle, collapsed, setCollapsed }) => {
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const roleId = parseInt(localStorage.getItem("role_id") || "0", 0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleToggle = () => {
    if (show) {
      setCollapsed(!collapsed);
    } else {
      onToggle();
      setCollapsed(false);
    }
  };

  const handleLogout = () => {
    authUtils.logout();
    navigate("login");
  };

  return (
    <div
      className={`sidebar border-end ${show ? "open" : ""} ${collapsed ? "collapsed" : ""}`}
      style={{
        width: collapsed ? "80px" : "300px",
        boxShadow: "2px 0 8px rgba(0, 0, 0, 0.1)",
        position: "fixed",
        height: "100vh",
        transition: isMobile
          ? "transform 0.3s ease-in-out"
          : "transform 0.3s ease-in-out, width 0.3s ease-in-out",
        zIndex: 1040,
        transform: show ? "translateX(0)" : "translateX(-100%)",
        backgroundColor: "#d3e29f",
        overflow: "hidden",
      }}
    >
      <div className="d-flex justify-content-center align-items-center mt-5">
        <img
          src={Logo}
          style={{
            height: collapsed ? "50px" : "100px",
            width: collapsed ? "50px" : "100px",
            transition: "all 0.3s ease-in-out",
          }}
          alt="Logo"
        />
      </div>
      <div className="sidebar-header border-bottom p-3 d-flex justify-content-center align-items-center">
        {!collapsed && (
          <h4 className="m-0 text-dark fw-bold text-center" style={{ flex: 1 }}>
            «Природа Разума»
          </h4>
        )}
        <button
          className="btn border-0 p-1"
          onClick={handleToggle}
          style={{ backgroundColor: "transparent" }}
        >
          {show && (
            isMobile ? 
            <div></div> :
            (collapsed ? 
              <div style={{ fontSize: "24px", lineHeight: "1" }}>☰</div> : 
              <div style={{ fontSize: "24px", lineHeight: "1" }}>☰</div>
            )
          )}
        </button>
      </div>
      <hr style={{ height: "3px", backgroundColor: "black" }} />

      <div className="sidebar-body pt-3">
        <div className="nav flex-column">
          {roleId === 1 && (
            <Link
              to="/users"
              className="nav-link d-flex align-items-center gap-3 px-4 py-3 text-dark"
            >
              <div
                className="text-primary"
                style={{
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img src={Users} width="30px" height="30px" alt="Педагоги" />
              </div>
              {!collapsed && <span className="fs-5">Специалисты</span>}
            </Link>
          )}

          <Link
            to="/patients"
            className="nav-link d-flex align-items-center gap-3 px-4 py-3 text-dark"
          >
            <div
              className="text-primary"
              style={{
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img src={Patient} width="40px" height="40px" alt="Дети" />
            </div>
            {!collapsed && <span className="fs-5">Дети</span>}
          </Link>

          <Link
            to="/documents"
            className="nav-link d-flex align-items-center gap-3 px-4 py-3 text-dark"
          >
            <div
              className="text-primary"
              style={{
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img src={Document} width="30px" height="30px" alt="Документы" />
            </div>
            {!collapsed && <span className="fs-5">Документы</span>}
          </Link>

          {roleId === 1 && (
            <Link
              to="/roles"
              className="nav-link d-flex align-items-center gap-3 px-4 py-3 text-dark"
            >
              <div
                className="text-primary"
                style={{
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img src={Setting} width="30px" height="30px" alt="Роли" />
              </div>
              {!collapsed && <span className="fs-5">Роли</span>}
            </Link>
          )}

          <Link
            to="/cabinet"
            className="nav-link d-flex align-items-center gap-3 px-4 py-3 text-dark"
          >
            <div
              className="text-primary"
              style={{
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img src={User} width="30px" height="30px" alt="Кабинет" />
            </div>
            {!collapsed && <span className="fs-5">Личный кабинет</span>}
          </Link>

          <a
            href="#"
            className="nav-link d-flex align-items-center gap-3 px-4 py-3 text-dark mt-5"
            onClick={handleLogout}
          >
            <div
              className="text-danger"
              style={{
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img src={Logout} width="30px" height="30px" alt="Выход" />
            </div>
            {!collapsed && <span className="fs-5">Выйти</span>}
          </a>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;