import { ArrowLeft, Download, Filter } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Dropdown, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import Logo from "../../assets/svg/main.svg";
import api from "../services/api";
import { DocumentBySubdirectoryBarChart } from "./components/charts/DocumentBySubdirectoryBarChart";
import { DocumentsLineChart } from "./components/charts/DocumentsLineChart";
import { PatientsLineChart } from "./components/charts/PatientsLineChart";
import { UsersByRolesPieChart } from "./components/charts/UsersByRolesPieChart";
import { UsersLineChart } from "./components/charts/UsersLineChart";
import { DateRangeType } from "./types/panel.types";

function Analytics() {
  const [activeChart, setActiveChart] = useState('patients-line');
  const [dateRange, setDateRange] = useState<DateRangeType>('month');
  const [loading, setLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [exportLoading, setExportLoading] = useState(false);
  const chartWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setLoading(true);
    setShowChart(false);
    
    const loadingTimer = setTimeout(() => {
      setLoading(false);
      
      setTimeout(() => {
        setShowChart(true);
      }, 100);
    }, 800);
    
    return () => clearTimeout(loadingTimer);
  }, [activeChart, dateRange]);

  const getReportType = () => {
    switch(activeChart) {
      case 'users-by-roles-pie': return 'roles';
      case 'documents-by-subdir-bar': return 'documents';
      case 'patients-line': return 'patients';
      case 'users-line': return 'users';
      case 'documents-line': return 'user-documents';
      default: return '';
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      setExportLoading(true);
      const reportType = getReportType();
      const daysMap: { [key: string]: number } = {
        'week': 7,
        'month': 30,
        'quarter': 90,
        'year': 365
      };
      const days = daysMap[dateRange] || 30;

      const params: any = {
        days,
        report_type: reportType
      };

      if (reportType === 'user-documents') {
        const userId = localStorage.getItem('user_id');
        if (!userId) throw new Error('User ID not found');
        params.user_id = parseInt(userId, 10);
      }

      const response = await api.get(`statistics/export/${format}`, {
        params,
        responseType: 'blob'
      });

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${reportType}_report_${timestamp}.${format}`;
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Ошибка экспорта! Проверьте консоль для деталей.');
    } finally {
      setExportLoading(false);
    }
  };

  const renderChart = () => {
    if (loading) return null;
    
    const containerProps = {
      containerWidth: chartWrapperRef.current ? chartWrapperRef.current.offsetWidth : 0,
      isMobile: windowWidth < 768
    };
    
    switch(activeChart) {
      case 'users-by-roles-pie':
        return <UsersByRolesPieChart dateRange={dateRange} {...containerProps} />;
      case 'documents-by-subdir-bar':
        return <DocumentBySubdirectoryBarChart dateRange={dateRange} {...containerProps} />;
      case 'documents-line':
        return <DocumentsLineChart dateRange={dateRange} {...containerProps} />;
      case 'users-line':
        return <UsersLineChart dateRange={dateRange} {...containerProps} />;
      case 'patients-line':
      default:
        return <PatientsLineChart dateRange={dateRange} {...containerProps} />;
    }
  };

  const renderChartButtons = () => {
    if (windowWidth <= 576) {
      return (
        <Dropdown className="w-100 mb-3">
          <Dropdown.Toggle
            variant="light"
            id="dropdown-chart-type"
            className="w-100 d-flex justify-content-between align-items-center"
          >
            <span>
              {activeChart === 'patients-line' && 'Динамика Пациентов'}
              {activeChart === 'documents-line' && 'Динамика Документов'}
              {activeChart === 'users-line' && 'Динамика Пользователей'}
              {activeChart === 'documents-by-subdir-bar' && 'Документы по Директориям'}
              {activeChart === 'users-by-roles-pie' && 'Пользователи по Ролям'}
            </span>
          </Dropdown.Toggle>

          <Dropdown.Menu className="w-100">
            <Dropdown.Item 
              active={activeChart === 'patients-line'}
              onClick={() => setActiveChart('patients-line')}
            >
              Динамика Пациентов
            </Dropdown.Item>
            <Dropdown.Item 
              active={activeChart === 'documents-line'}
              onClick={() => setActiveChart('documents-line')}
            >
              Динамика Документов
            </Dropdown.Item>
            <Dropdown.Item 
              active={activeChart === 'users-line'}
              onClick={() => setActiveChart('users-line')}
            >
              Динамика Пользователей
            </Dropdown.Item>
            <Dropdown.Item 
              active={activeChart === 'documents-by-subdir-bar'}
              onClick={() => setActiveChart('documents-by-subdir-bar')}
            >
              Документы по Директориям
            </Dropdown.Item>
            <Dropdown.Item 
              active={activeChart === 'users-by-roles-pie'}
              onClick={() => setActiveChart('users-by-roles-pie')}
            >
              Пользователи по Ролям
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      );
    }
    
    return (
      <div className="chart-buttons-container d-flex flex-wrap mb-3 mb-lg-0">
        <Button 
          className={`me-1 me-sm-2 mb-2 py-2 px-3 ${activeChart === 'patients-line' ? 'btn-success' : 'btn-light'}`}
          style={activeChart === 'patients-line' ? {backgroundColor: "#7DC459", border: "none"} : {}}
          onClick={() => setActiveChart('patients-line')}
        >
          <span className={windowWidth < 768 ? "fs-7" : ""}>Динамика Пациентов</span>
        </Button>

        <Button 
          className={`me-1 me-sm-2 mb-2 py-2 px-3 ${activeChart === 'documents-line' ? 'btn-success' : 'btn-light'}`}
          style={activeChart === 'documents-line' ? {backgroundColor: "#7DC459", border: "none"} : {}}
          onClick={() => setActiveChart('documents-line')}
        >
          <span className={windowWidth < 768 ? "fs-7" : ""}>Динамика Документов</span>
        </Button>

        <Button 
          className={`me-1 me-sm-2 mb-2 py-2 px-3 ${activeChart === 'users-line' ? 'btn-success' : 'btn-light'}`}
          style={activeChart === 'users-line' ? {backgroundColor: "#7DC459", border: "none"} : {}}
          onClick={() => setActiveChart('users-line')}
        >
          <span className={windowWidth < 768 ? "fs-7" : ""}>Динамика Пользователей</span>
        </Button>

        <Button 
          className={`me-1 me-sm-2 mb-2 py-2 px-3 ${activeChart === 'documents-by-subdir-bar' ? 'btn-success' : 'btn-light'}`}
          style={activeChart === 'documents-by-subdir-bar' ? {backgroundColor: "#7DC459", border: "none"} : {}}
          onClick={() => setActiveChart('documents-by-subdir-bar')}
        >
          <span className={windowWidth < 768 ? "fs-7" : ""}>Документы по Директориям</span>
        </Button>

        <Button 
          className={`me-1 me-sm-2 mb-2 py-2 px-3 ${activeChart === 'users-by-roles-pie' ? 'btn-success' : 'btn-light'}`}
          style={activeChart === 'users-by-roles-pie' ? {backgroundColor: "#7DC459", border: "none"} : {}}
          onClick={() => setActiveChart('users-by-roles-pie')}
        >
          <span className={windowWidth < 768 ? "fs-7" : ""}>Пользователи по Ролям</span>
        </Button>
      </div>
    );
  };

  return (
    <div
      className="analytics-container d-flex w-100 bg-light p-2 p-md-3"
      style={{ 
        background: "linear-gradient(45deg, #A3F49F, #D3E29F)",
        minHeight: "100vh", 
        overflow: "auto" 
      }}
    >
      <div
        className="shadow-sm flex-grow-1 p-2 p-sm-3 p-md-4 d-flex flex-column"
        style={{ backgroundColor: "#F3F6F3", borderRadius: "20px" }}
      >
        <div className="d-flex flex-column flex-md-row align-items-center mb-3">
          <div className="d-flex align-items-center mb-3 mb-md-0">
            <div className="bg-light p-2 rounded-circle shadow-sm">
              <img
                src={Logo}
                className="img-fluid"
                style={{ width: windowWidth < 576 ? "2rem" : "2.5rem", height: windowWidth < 576 ? "2rem" : "2.5rem" }}
                alt="Логотип"
              />
            </div>
            <div className="ms-2 ms-md-3 text-center text-md-start">
              <h1 className="fs-6 fs-md-5 fw-bold mb-0 text-success">
                Аналитика и статистика
              </h1>
              <p className="small text-muted mb-0 d-none d-sm-block">
                Визуализация данных по документам, детям и пользователям
              </p>
            </div>
          </div>
          
          <div className="ms-md-auto mt-2 mt-md-0 d-flex">
            <Link to="/cabinet" className="btn btn-light shadow-sm me-2 d-flex align-items-center">
              <ArrowLeft size={18} />
              <span className="ms-1 d-none d-md-inline">Назад</span>
            </Link>
            
            <Dropdown>
              <Dropdown.Toggle 
                variant="success" 
                id="dropdown-export"
                style={{ backgroundColor: "#7DC459", border: "none" }}
                className="d-flex align-items-center shadow-sm"
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-1"
                    />
                    <span className="ms-1 d-none d-md-inline">Экспорт...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span className="ms-1 d-none d-md-inline">Экспорт</span>
                  </>
                )}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => handleExport('csv')} disabled={exportLoading}>CSV</Dropdown.Item>
                <Dropdown.Item onClick={() => handleExport('xlsx')} disabled={exportLoading}>Excel</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>

        <div className="d-flex flex-column flex-lg-row justify-content-between gap-2 mb-3">
          {renderChartButtons()}
          
          <div className="d-flex align-self-start align-self-lg-center">
            <Dropdown>
              <Dropdown.Toggle 
                variant="light" 
                id="dropdown-date-range"
                className="d-flex align-items-center shadow-sm"
              >
                <Filter size={16} className="me-1" />
                {dateRange === 'week' && 'Неделя'}
                {dateRange === 'month' && 'Месяц'}
                {dateRange === 'quarter' && 'Квартал'}
                {dateRange === 'year' && 'Год'}
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setDateRange('week')}>Неделя</Dropdown.Item>
                <Dropdown.Item onClick={() => setDateRange('month')}>Месяц</Dropdown.Item>
                <Dropdown.Item onClick={() => setDateRange('quarter')}>Квартал</Dropdown.Item>
                <Dropdown.Item onClick={() => setDateRange('year')}>Год</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>

        <div className="card border-0 shadow-sm flex-grow-1">
          <div className="card-body d-flex flex-column">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3">
              <h5 className="card-title fw-bold text-success mb-2 mb-sm-0">
                {activeChart === 'patients-line' && 'Динамика пациентов по времени'}
                {activeChart === 'users-line' && 'Динамика пользователей по времени'}
                {activeChart === 'documents-line' && 'Динамика документов по времени'}
                {activeChart === 'documents-by-subdir-bar' && 'Распределение документов по категориям'}
                {activeChart === 'users-by-roles-pie' && 'Соотношение ролей пользователей'}
              </h5>
              <div className="badge bg-light text-secondary">
                {dateRange === 'week' && 'Последняя неделя'}
                {dateRange === 'month' && 'Последний месяц'}
                {dateRange === 'quarter' && 'Последний квартал'}
                {dateRange === 'year' && 'Последний год'}
              </div>
            </div>
            
            <div 
              ref={chartWrapperRef} 
              className="chart-wrapper flex-grow-1 position-relative overflow-hidden"
            >
              <div className={`chart-container ${showChart ? 'show' : ''}`}>
                {loading ? (
                  <div className="spinner-container">
                    <Spinner 
                      animation="border" 
                      variant="success" 
                      className="custom-spinner"
                    />
                    <p className="text-muted mt-3">Загрузка данных...</p>
                  </div>
                ) : (
                  renderChart()
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
        /* Mobile first approach */
        .analytics-container {
          padding: 12px;
        }
        
        /* Fixed chart container height and aspect ratio */
        .chart-wrapper {
          height: 300px;
          width: 100%;
          border-radius: 8px;
          margin-top: 8px;
        }
        
        .chart-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .chart-container.show {
          opacity: 1;
          transform: translateY(0);
        }
        
        /* Добавляем тень и закругления для более современного мобильного UI */
        .btn {
          border-radius: 8px;
          font-weight: 500;
        }
        
        .dropdown-menu {
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: none;
          padding: 8px;
        }
        
        .dropdown-item {
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 2px;
        }
        
        .dropdown-item.active {
          background-color: #7DC459;
        }
        
        .dropdown-item:hover {
          background-color: #5FB347 !important;
          color: white !important;
        }
        
        .dropdown-item:disabled {
          color: #adb5bd;
          pointer-events: none;
          background-color: transparent;
        }
        
        .card {
          border-radius: 16px;
          overflow: hidden;
        }
        
        .card-body {
          padding: 16px;
        }
        
        .fs-7 {
          font-size: 0.85rem;
        }
        
        .badge {
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 8px;
        }
        
        /* Animation styles */
        .spinner-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          animation: fadeIn 0.3s ease-in forwards;
        }
        
        .custom-spinner {
          width: 3rem;
          height: 3rem;
          border-width: 0.4em;
          color: #7DC459 !important;
          animation: spin 1s linear infinite;
        }
        
        /* Media queries for responsive design */
        @media (min-width: 576px) {
          .chart-wrapper {
            height: 350px;
          }
          
          .card-body {
            padding: 20px;
          }
        }
        
        @media (min-width: 768px) {
          .chart-wrapper {
            height: 400px;
          }
        }
        
        @media (min-width: 992px) {
          .chart-wrapper {
            height: 450px;
          }
        }
        
        @media (min-width: 1200px) {
          .chart-wrapper {
            height: 500px;
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        `}
      </style>
    </div>
  );
}

export default Analytics;