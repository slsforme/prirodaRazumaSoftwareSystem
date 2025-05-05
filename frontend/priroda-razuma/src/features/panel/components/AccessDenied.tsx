import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../../../assets/svg/main.svg";

function AccessDenied() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const roleName = localStorage.getItem("role");
  const fio = localStorage.getItem("fio");

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
    return "пользователь";
  };

  return (
    <div
      className="access-denied-container d-flex w-100 p-2 p-md-4 min-vh-100"
      style={{ 
        background: "linear-gradient(45deg, #A3F49F, #D3E29F)",
        overflow: "auto" 
      }}>
      <div
        className="access-denied-content shadow-sm flex-grow-1 p-2 p-md-4 d-flex flex-column fade-in"
        style={{ 
          backgroundColor: "#F3F6F3", 
          borderRadius: "20px",
        }}
      >
        {/* Хедер */}
        <div className="header-section d-flex flex-column flex-md-row align-items-center mb-4">
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
                Доступ ограничен
              </h1>
              <p className="small text-muted mb-0">
                Требуются права администратора
              </p>
            </div>
          </div>
        </div>

        <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center py-5">
          <div className="access-icon-container mb-4 scale-hover">
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{ 
                backgroundColor: "rgba(125, 196, 89, 0.15)", 
                width: windowWidth < 576 ? "120px" : "160px", 
                height: windowWidth < 576 ? "120px" : "160px" 
              }}
            >
              <ShieldAlert 
                size={windowWidth < 576 ? 60 : 80} 
                color="#7DC459" 
                strokeWidth={1.5} 
              />
            </div>
          </div>
          
          <h2 className="mb-3 fw-bold fs-2 fs-md-1" style={{ color: "#4F9A3E" }}>
            Страница недоступна
          </h2>
          
          <div className="card border-light mb-4 mx-auto" style={{ maxWidth: "600px" }}>
            <div className="card-body p-3 p-md-4">
              <p className="fs-5 mb-3">
                {getName()}, у Вас нет доступа к этой странице.
              </p>
              <p className="mb-3">
                Ваша текущая роль <span className="fw-bold">{roleName || "пользователь"}</span> не имеет 
                прав для просмотра данного раздела. Этот раздел доступен только пользователям 
                с ролью <span className="fw-bold">Администратор</span>.
              </p>
              <p className="text-muted small mb-0">
                Если Вам требуется доступ к этому разделу, пожалуйста, обратитесь к администратору системы.
              </p>
            </div>
          </div>
          
          <Link 
            to="/cabinet" 
            className="btn py-2 px-4 d-flex align-items-center mx-auto scale-hover shadow-sm"
            style={{ 
              backgroundColor: "#7DC459", 
              border: "none", 
              color: "white",
              borderRadius: "10px",
              maxWidth: "280px"
            }}
          >
            <ArrowLeft size={windowWidth < 576 ? 16 : 20} className="me-2" />
            <span>Вернуться в личный кабинет</span>
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        
        .access-denied-container {
          padding: 12px;
        }
        
        @media (min-width: 768px) {
          .access-denied-container {
            padding: 24px;
          }
        }
        
        .access-denied-content {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }
        
        .card {
          border-radius: 12px;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .scale-hover {
          transition: all 0.3s ease;
        }
        
        .scale-hover:hover {
          transform: scale(1.05);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .access-icon-container {
          transition: transform 0.3s ease;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(125, 196, 89, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(125, 196, 89, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(125, 196, 89, 0);
          }
        }
        
        .access-icon-container {
          animation: pulse 3s infinite;
        }
        
        @media (max-width: 576px) {
          .card-body {
            padding: 16px;
          }
          
          .btn {
            padding: 8px 16px;
            font-size: 14px;
          }
          
          .header-section {
            margin-bottom: 16px;
          }
        }
      `}</style>
    </div>
  );
}

export default AccessDenied;