import { isAxiosError } from "axios";
import { ArrowUpRight, Database as DatabaseIcon, Download, Plus, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import Database from "../../assets/photos/database.png";
import Patient from "../../assets/photos/patient.png";
import Logo from "../../assets/svg/main.svg";
import { authUtils } from "../auth/services/utils";
import cachedApi from "../services/api";
import DocumentsChart from "./components/DocumentChart";
import PasswordChangeModal from "./components/PasswordChangeModal";
import PersonalDataModal from "./components/PersonalDataModal";
import "./styles/cabinet.css";

function PersonalCabinet() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isBackupLoading, setIsBackupLoading] = useState(false);

  const handleOpenModal = () => setShowPasswordModal(true);
  const handleCloseModal = () => setShowPasswordModal(false);

  const navigate = useNavigate();

  const handleLogout = () => {
    authUtils.logout();
    navigate("login");
  };

  const fio = localStorage.getItem("fio");
  const roleName = localStorage.getItem("role");
  const userId = localStorage.getItem("user_id");
  const roleId = localStorage.getItem("role_id");

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const fetchProfilePhoto = async () => {
    if (!userId) {
      console.error("User ID not found in localStorage");
      return;
    }

    try {
      const timestamp = new Date().getTime();
      const response = await cachedApi.get(`/users/${userId}/photo?t=${timestamp}`, {
        responseType: "blob",
      });
      const blob = response.data;
      
      if (profilePhoto) {
        URL.revokeObjectURL(profilePhoto);
      }
      
      const photoUrl = URL.createObjectURL(blob);
      setProfilePhoto(photoUrl);
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        if (error.response?.status === 404) {
          setProfilePhoto(null);
        } else {
          console.error("Error fetching profile photo:", error);
          setProfilePhoto(null);
        }
      } else {
        console.error("Unexpected error:", error);
        setProfilePhoto(null);
      }
    }
  };

  const handleDownloadBackup = async () => {
    setIsBackupLoading(true);
    try {
      const response = await cachedApi.get(`/utils/database/backup`, {
        responseType: "blob",
      });

      const contentDisposition = response.headers["content-disposition"];
      let filename = "database_backup.sql";

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.*)/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
          if (filename.startsWith('"') && filename.endsWith('"')) {
            filename = filename.slice(1, -1);
          }
          filename = decodeURIComponent(filename);
        }
      }

      const blob = new Blob([response.data]);
      const fileUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = filename;
      link.click();

      window.URL.revokeObjectURL(fileUrl);
    } catch (error) {
      console.error("Backup download failed:", error);
    } finally {
      setIsBackupLoading(false);
    }
  };

  useEffect(() => {
    fetchProfilePhoto();

    return () => {
      if (profilePhoto) {
        URL.revokeObjectURL(profilePhoto);
      }
    };
  }, [userId]);

  const getName = () => {
    if (fio) {
      const firstSpaceIndex = fio.indexOf(" ");
      const secondSpaceIndex = fio.indexOf(" ", firstSpaceIndex + 1);
      const trimmedFio =
        secondSpaceIndex !== -1
          ? fio.substring(firstSpaceIndex + 1, secondSpaceIndex)
          : fio.substring(firstSpaceIndex + 1);
      return trimmedFio;
    }
    return "null";
  };

  const getNameAndSurname = () => {
    if (fio) {
      const firstSpaceIndex = fio.indexOf(" ");
      const secondSpaceIndex = fio.indexOf(" ", firstSpaceIndex + 1);
      return secondSpaceIndex !== -1 ? fio.substring(0, secondSpaceIndex) : fio;
    }
    return "null";
  };

  const getRoleName = () => roleName || "null";
  const getUserId = () => (userId ? parseInt(userId) : 0);

  return (
    <div
      className="cabinet-container d-flex w-100 p-2 p-md-4 min-vh-100"
      style={{ 
        background: "linear-gradient(45deg, #A3F49F, #D3E29F)",
        overflow: "auto" 
      }}>
      <div
        className="cabinet-main-content shadow-sm flex-grow-1 p-2 p-md-4 d-flex flex-column flex-lg-row fade-in"
        style={{ 
          backgroundColor: "#F3F6F3", 
          borderRadius: "20px",
        }}
      >
        <div className="content-area flex-grow-1 d-flex flex-column me-0 me-lg-4 mb-1 mb-lg-0">
          <div className="header-section d-flex flex-column flex-md-row align-items-center mb-3 mb-md-4">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <div className="bg-light p-2 rounded-circle d-flex align-items-center justify-content-center">
                <img
                  src={Logo}
                  className="img-fluid"
                  style={{ 
                    width: windowWidth < 576 ? "2.5rem" : "3.5rem", 
                    height: windowWidth < 576 ? "2.5rem" : "3.5rem" 
                  }}
                  alt="Логотип"
                />
              </div>
              <div className="ms-2 ms-md-3 text-center text-md-start">
                <h1 className="fs-5 fs-md-4 fw-bold mb-0">
                  Добро пожаловать, {getName()}
                </h1>
                <p className="small text-muted mb-0">
                  Обзор вашего личного кабинета
                </p>
              </div>
            </div>
            <div className="ms-md-auto mt-3 mt-md-0">
              <Button
                onClick={() => setShowPersonalModal(true)}
                className="btn btn-light rounded-circle p-2 shadow-sm pulse-effect"
              >
                <User size={windowWidth < 576 ? 16 : 20} />
              </Button>
            </div>
          </div>

          <div className="cards-section row g-2 g-md-3 mb-3">
            <div className="col-12 col-md-6 col-lg-4">
              <div
                className="card h-100 border-light card-scale"
                onClick={() => setShowPersonalModal(true)}
                style={{ cursor: "pointer" }}
              >
                <div className="card-body text-center p-2 p-md-3">
                  <h5 className="card-title mb-2 mb-md-3">Профиль</h5>
                  <div
                    className="profile-image mx-auto mb-2 mb-md-3 overflow-hidden rounded-circle d-flex align-items-center justify-content-center"
                    style={{ 
                      width: windowWidth < 576 ? "6rem" : "8rem", 
                      height: windowWidth < 576 ? "6rem" : "8rem", 
                      backgroundColor: "#e0e0e0" 
                    }}
                  >
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="Profile"
                        className="w-100 h-100 object-fit-cover"
                      />
                    ) : (
                      <User size={windowWidth < 576 ? 32 : 48} color="#666" />
                    )}
                  </div>
                  <h5 className="fw-bold mb-1 fs-6 fs-md-5">
                    {getNameAndSurname()}
                  </h5>
                  <p className="small text-muted mb-0">{getRoleName()}</p>
                </div>
              </div>
            </div>

            <Link
              to="/documents"
              className="col-12 col-md-6 col-lg-4"
              style={{ textDecoration: "none" }}
            >
              <div className="card h-100 border-light card-scale">
                <div className="card-body d-flex flex-column justify-content-center p-2 p-md-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <img
                        src={Database}
                        alt="Иконка"
                        className="img-fluid"
                        style={{
                          width: windowWidth < 576 ? "30px" : "40px",
                          height: windowWidth < 576 ? "30px" : "40px",
                          marginRight: "12px",
                        }}
                      />
                      <h5 className="card-title mb-0 fs-6 fs-md-5">
                        Панель управления
                      </h5>
                    </div>
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              </div>
            </Link>

            <Link
              to="/patients"
              className="col-12 col-md-12 col-lg-4"
              style={{ textDecoration: "none" }}
            >
              <div className="card h-100 border-light card-scale">
                <div className="card-body d-flex flex-column justify-content-center p-2 p-md-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <img
                        src={Patient}
                        alt="Иконка"
                        className="img-fluid"
                        style={{
                          width: windowWidth < 576 ? "40px" : "50px",
                          height: windowWidth < 576 ? "40px" : "50px",
                          marginRight: "12px",
                        }}
                      />
                      <h5 className="card-title mb-0 fs-6 fs-md-5">
                        Просмотреть всех Детей
                      </h5>
                    </div>
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="row g-2 g-md-3 mb-3">
            {/* Модифицированный блок для кнопки добавления документа */}
            <div className={roleId === "1" ? "col-12 col-md-7" : "col-12"}>
              <Link
                to="/documents/create"
                className="card border-light card-scale h-100"
                style={{ textDecoration: "none" }}
              >
                <div className="card-body d-flex align-items-center p-2 p-md-3">
                  <span className="fw-medium fs-6 fs-md-5">
                    Добавить новый Документ
                  </span>
                  <button className="btn btn-light ms-auto p-1 p-md-2 shadow-sm">
                    <Plus size={windowWidth < 576 ? 16 : 18} />
                  </button>
                </div>
              </Link>
            </div>

            {roleId === "1" && (
              <div className="col-12 col-md-5">
                <div
                  className="card border-light card-scale h-100"
                  style={{ cursor: "pointer" }}
                  onClick={handleDownloadBackup}
                >
                  <div className="card-body d-flex align-items-center p-2 p-md-3">
                    <div className="d-flex align-items-center">
                      <div className="me-2 p-1 rounded-circle d-flex align-items-center justify-content-center" style={{ backgroundColor: "#e8f5e9" }}>
                        <DatabaseIcon size={windowWidth < 576 ? 16 : 20} color="#7DC459" />
                      </div>
                      <span className="fw-medium fs-6 fs-md-5">
                        Бэкап Базы Данных
                      </span>
                    </div>
                    <button 
                      className="btn btn-success ms-auto p-1 p-md-2 shadow-sm" 
                      disabled={isBackupLoading}
                      style={{ backgroundColor: "#7DC459", border: "none" }}
                    >
                      {isBackupLoading ? (
                        <Spinner 
                          as="span" 
                          animation="border" 
                          size="sm" 
                          role="status" 
                          aria-hidden="true" 
                        />
                      ) : (
                        <Download size={windowWidth < 576 ? 16 : 18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="chart-container flex-grow-1 position-relative">
            <div className="chart-wrapper">
              <DocumentsChart />
            </div>
          </div>
        </div>

        <div
          className="sidebar d-flex flex-column mt-lg-0"
          style={{ 
            width: "100%", 
            maxWidth: windowWidth < 992 ? "100%" : "16rem" 
          }}
        >
          <div className="flex-grow-1 mb-4"></div>

          <div className="d-grid gap-2">
            <button
              className="btn py-2 scale-hover shadow-sm"
              style={{ backgroundColor: "#D3E29F", border: "none", color: "white" }}
              onClick={handleOpenModal}
            >
              Изменить пароль
            </button>

            <PasswordChangeModal
              show={showPasswordModal}
              onHide={handleCloseModal}
              userId={getUserId()}
            />

            {roleId === "1" && (
              <button 
                className="btn py-2 position-relative scale-hover shadow-sm"
                style={{ 
                  backgroundColor: "#C8E68B", 
                  border: "none",
                  overflow: "hidden",
                  color: "white"
                }}
                onClick={() => navigate("/analytics")}
              >
                <span 
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1
                  }}
                ></span>
                <span 
                  style={{
                    position: "relative",
                    zIndex: 2,
                    textDecoration: "none",
                  }}
                >
                  Просмотреть статистику
                </span>
              </button>
            )}
          
            <button
              className="btn py-2 scale-hover shadow-sm"
              style={{ backgroundColor: "#7DC459", border: "none", color: "white" }}
              onClick={handleLogout}
            >
              Выйти
            </button>
          </div>
        </div>

        <PersonalDataModal
          show={showPersonalModal}
          onHide={() => setShowPersonalModal(false)}
          onPhotoUpdate={fetchProfilePhoto}
        />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        
        .cabinet-container {
          padding: 12px;
        }
        
        @media (min-width: 768px) {
          .cabinet-container {
            padding: 24px;
          }
        }
        
        .cabinet-main-content {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }
        
        .card {
          border-radius: 12px;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .card-scale {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .card-scale:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }
        
        .scale-hover {
          transition: all 0.3s ease;
        }
        
        .scale-hover:hover {
          transform: scale(1.02);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .scale-hover:active {
          transform: scale(0.98);
        }

        .chart-container {
          width: 100%;
          min-height: 200px;
          max-height: 500px;
          overflow: hidden;
          border-radius: 12px;
          background-color: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .chart-wrapper {
          width: 100%;
          height: 100%;
          padding: 10px;
        }

        .chart-wrapper canvas {
          max-width: 100% !important;
          height: auto !important;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(125, 196, 89, 0.4);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(125, 196, 89, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(125, 196, 89, 0);
          }
        }
        
        .pulse-effect {
          animation: pulse 2s infinite;
        }
        
        .profile-image {
          transition: transform 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .profile-image:hover {
          transform: scale(1.05);
        }
        
        @media (max-width: 576px) {
          .card-body {
            padding: 12px;
          }
          
          .chart-container {
              min-height: 250px;  
              max-height: none;         
          }
          
          .btn {
            padding: 8px 12px;
            font-size: 14px;
          }
          
          .header-section {
            margin-bottom: 16px;
          }
        }
        
        @media (max-width: 360px) {
          .cabinet-container {
            padding: 8px;
          }
          
          .cabinet-main-content {
            padding: 12px;
          }
          
          .profile-image {
            width: 5rem !important;
            height: 5rem !important;
          }
          
          .card-title {
            font-size: 16px;
          }
        }
        
        @media (min-width: 768px) and (max-width: 991px) {
          .cards-section .col-md-6 {
            flex: 0 0 50%;
            max-width: 50%;
          }
        }
      `}</style>
    </div>
  );
}

export default PersonalCabinet;