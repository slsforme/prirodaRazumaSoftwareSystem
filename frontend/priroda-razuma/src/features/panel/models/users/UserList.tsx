import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Dropdown, Form, Modal, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import Null from "../../../../assets/photos/null.png";
import api from "../../../services/api";
import Sidebar from "../../components/SideBar";
import { Role } from "../roles/types/roles.types";
import { User } from "./types/users.types";

const ITEMS_PER_PAGE = 10;

const UserList = () => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pageInput, setPageInput] = useState("");
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const navigate = useNavigate();
  const location = useLocation();
  const isInitialMount = useRef(true);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      if (width >= 768 && showSidebar) {
        setShowSidebar(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [showSidebar]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get("/users"),
        api.get("/roles"),
      ]);
      setAllUsers(usersRes.data);
      setAllRoles(rolesRes.data);
    } catch (error) {
      setError("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      fetchData();
      isInitialMount.current = false;
    } else if (location.state?.shouldRefresh) {
      fetchData();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [fetchData, location.state, navigate]);

  const { paginatedUsers, totalPages, filteredUsersLength } = useMemo(() => {
    const filteredUsers = allUsers.filter((user) => {
      const matchesSearch = user.fio
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus =
        selectedStatus === "all"
          ? true
          : selectedStatus === "active"
          ? user.active
          : !user.active;
      const matchesRole =
        selectedRole === "all" ? true : user.role_id === parseInt(selectedRole);

      return matchesSearch && matchesStatus && matchesRole;
    });

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return {
      paginatedUsers: filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE),
      totalPages: Math.ceil(filteredUsers.length / ITEMS_PER_PAGE),
      filteredUsersLength: filteredUsers.length
    };
  }, [allUsers, currentPage, searchTerm, selectedStatus, selectedRole]);

  const handleDelete = async (userId: number) => {
    try {
      await api.delete(`/users/${userId}`);
      await fetchData();
      setShowDeleteModal(false);
    } catch (error) {
      setError("Ошибка удаления пользователя");
    }
  };

  const getRoleName = (roleId: number) =>
    allRoles.find((role) => role.id === roleId)?.name || "Неизвестно";

  const handlePageInput = () => {
    const page = parseInt(pageInput);
    if (!isNaN(page)) {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        setPageError("");
      } else {
        setPageError("Несуществующая страница");
      }
    } else {
      setPageError("Введите корректный номер страницы");
    }
    setPageInput("");
  };

  const toggleSidebar = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowSidebar(prev => !prev);
    setSidebarCollapsed(false);
  };

  const isMobile = windowWidth < 768;
  const showEmptyState = !loading && allUsers.length === 0;
  const showNoResults = !loading && filteredUsersLength === 0 && allUsers.length > 0;

  return (
    <div className="d-flex position-relative" style={{ minHeight: "100vh", maxWidth: "100vw", overflowX: "hidden" }}>
      {isMobile && (
        <button 
          className="toggle-sidebar-btn d-block"
          onClick={toggleSidebar}
          style={{
            position: "fixed",
            top: "15px",
            left: "15px",
            zIndex: 1030,
            background: "#D3E29F",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            cursor: "pointer"
          }}
        >
          <div className="hamburger-icon" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "20px", height: "2px", background: "#333", margin: "2px 0" }}></div>
            <div style={{ width: "20px", height: "2px", background: "#333", margin: "2px 0" }}></div>
            <div style={{ width: "20px", height: "2px", background: "#333", margin: "2px 0" }}></div>
          </div>
        </button>
      )}

      {(showSidebar || !isMobile) && (
        <div 
          className="sidebar-container"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            height: "100%",
            zIndex: 1040,
            transition: "transform 0.3s ease-in-out, width 0.3s ease-in-out",
            boxShadow: "5px 0 25px rgba(0,0,0,0.15)",
            backgroundColor: "white",
            transform: showSidebar ? "translateX(0)" : "translateX(-100%)"
          }}
        >
          <Sidebar 
            show={showSidebar || !isMobile} 
            onToggle={toggleSidebar} 
            collapsed={sidebarCollapsed} 
            setCollapsed={setSidebarCollapsed} 
          />
        </div>
      )}

      <div
        className="flex-grow-1 p-3 p-md-4"
        style={{
          width: "100%",
          maxWidth: "100%",
          marginTop: "5rem",
          marginRight: isMobile ? "0%" : "10%",
          marginLeft: isMobile ? "0%" : "10%",
          padding: isMobile ? "0 5%" : "0",
          transition: "margin-left 0.3s ease-in-out",
          position: "relative",
          zIndex: 1
        }}
      >
        <div className="container-fluid px-0">
          {error && (
            <Alert variant="danger" onClose={() => setError("")} dismissible>
              {error}
            </Alert>
          )}

          <div className="d-flex flex-column mb-4">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h2>Управление пользователями</h2>
                <div
                  className="header-line"
                  style={{
                    height: "3px",
                    backgroundColor: "#D3E29F",
                    width: "100px",
                    marginTop: "8px",
                    borderRadius: "2px",
                  }}
                ></div>
              </div>
              <Button
                variant="success"
                onClick={() => navigate("/users/create")}
                style={{ backgroundColor: "#D3E29F", border: "none" }}
              >
                {windowWidth >= 576 ? "Создать пользователя" : "+"}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center my-5 py-5">
              <Spinner
                animation="border"
                role="status"
                style={{ color: "#D3E29F", width: "4rem", height: "4rem" }}
              >
                <span className="visually-hidden">Загрузка...</span>
              </Spinner>
              <h4 className="mt-3">Загрузка данных...</h4>
            </div>
          ) : showEmptyState ? (
            <div className="text-center mt-5 pt-5">
              <img src={Null} width="300px" alt="Нет данных" />
              <h1 className="mb-4" style={{ fontSize: "xxx-large" }}>
                Пока что данные отсутствуют
              </h1>
            </div>
          ) : (
            <>
              <div className="row g-3 mb-4">
                <div className={`${isMobile ? "col-12" : "col-md-4 col-lg-3"}`}>
                  <Form.Control
                    type="text"
                    placeholder="Поиск по ФИО..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ borderRadius: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                  />
                </div>

                <div className={`${isMobile ? "col-12" : "col-md-4 col-lg-3"}`}>
                  <Dropdown>
                    <Dropdown.Toggle
                      variant="light"
                      id="dropdown-status"
                      className="custom-dropdown w-100 d-flex justify-content-between align-items-center shadow-sm"
                    >
                      {selectedStatus === "all" && "Все статусы"}
                      {selectedStatus === "active" && "Активные"}
                      {selectedStatus === "inactive" && "Неактивные"}
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="custom-dropdown-menu w-100">
                      <Dropdown.Item
                        active={selectedStatus === "all"}
                        onClick={() => {
                          setSelectedStatus("all");
                          setCurrentPage(1);
                        }}
                      >
                        Все статусы
                      </Dropdown.Item>
                      <Dropdown.Item
                        active={selectedStatus === "active"}
                        onClick={() => {
                          setSelectedStatus("active");
                          setCurrentPage(1);
                        }}
                      >
                        Активные
                      </Dropdown.Item>
                      <Dropdown.Item
                        active={selectedStatus === "inactive"}
                        onClick={() => {
                          setSelectedStatus("inactive");
                          setCurrentPage(1);
                        }}
                      >
                        Неактивные
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>

                {isMobile && (
                  <div className="col-12">
                    <Dropdown>
                      <Dropdown.Toggle
                        variant="light"
                        id="dropdown-role-mobile"
                        className="custom-dropdown w-100 d-flex justify-content-between align-items-center shadow-sm"
                      >
                        {selectedRole === "all" 
                          ? "Все роли" 
                          : getRoleName(parseInt(selectedRole))}
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="custom-dropdown-menu w-100">
                        <Dropdown.Item
                          active={selectedRole === "all"}
                          onClick={() => {
                            setSelectedRole("all");
                            setCurrentPage(1);
                          }}
                        >
                          Все роли
                        </Dropdown.Item>
                        {allRoles.map((role) => (
                          <Dropdown.Item
                            key={role.id}
                            active={selectedRole === role.id.toString()}
                            onClick={() => {
                              setSelectedRole(role.id.toString());
                              setCurrentPage(1);
                            }}
                          >
                            {role.name}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                )}

                {!isMobile && (
                  <div className="col-md-4 col-lg-3">
                    <Dropdown>
                      <Dropdown.Toggle
                        variant="light"
                        id="dropdown-role"
                        className="custom-dropdown w-100 d-flex justify-content-between align-items-center shadow-sm"
                      >
                        {selectedRole === "all"
                          ? "Все роли"
                          : getRoleName(parseInt(selectedRole))}
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="custom-dropdown-menu w-100">
                        <Dropdown.Item
                          active={selectedRole === "all"}
                          onClick={() => {
                            setSelectedRole("all");
                            setCurrentPage(1);
                          }}
                        >
                          Все роли
                        </Dropdown.Item>
                        {allRoles.map((role) => (
                          <Dropdown.Item
                            key={role.id}
                            active={selectedRole === role.id.toString()}
                            onClick={() => {
                              setSelectedRole(role.id.toString());
                              setCurrentPage(1);
                            }}
                          >
                            {role.name}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                )}
              </div>

              <div className="table-responsive">
                <Table
                  bordered
                  hover
                  style={{
                    backgroundColor: "white",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    minWidth: "100%",
                    maxWidth: "100%"
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f8f9fa" }}>
                      <th style={{ borderTopLeftRadius: "10px", padding: "16px" }}>
                        ФИО
                      </th>
                      {!isMobile && (
                        <>
                          <th style={{ padding: "16px" }}>Логин</th>
                          <th style={{ padding: "16px" }}>Активность</th>
                          <th style={{ padding: "16px" }}>Роль</th>
                        </>
                      )}
                      <th style={{ borderTopRightRadius: "10px", padding: "16px" }}>
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {showNoResults ? (
                      <tr>
                        <td
                          colSpan={isMobile ? 2 : 5}
                          className="text-center py-4 no-results-message"
                          style={{
                            backgroundColor: "#f8f9fa",
                            borderBottom: "1px solid #dee2e6",
                          }}
                        >
                          <div style={{ padding: "40px 0" }}>
                            <h4 className="text-muted mb-3">Ничего не найдено</h4>
                            <div className="d-flex justify-content-center">
                              <div
                                style={{
                                  maxWidth: "300px",
                                  textAlign: "center",
                                  lineHeight: "1.6",
                                  color: "#6c757d",
                                }}
                              >
                                Попробуйте изменить параметры поиска, сортировки или фильтрации
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user, index) => (
                        <tr
                          key={user.id}
                          style={{
                            transition: "background 0.3s ease",
                            animation: `rowAppear 0.5s ease ${index * 0.05}s`,
                            backgroundColor:
                              index % 2 === 0 ? "#f8f9fa" : "white",
                          }}
                        >
                          <td
                            style={{
                              padding: "16px",
                              borderBottom: "1px solid #dee2e6",
                            }}
                          >
                            <div className="d-flex flex-column">
                              {user.fio}
                            </div>
                          </td>
                          {!isMobile && (
                            <>
                              <td
                                style={{
                                  padding: "16px",
                                  borderBottom: "1px solid #dee2e6",
                                }}
                              >
                                {user.login}
                              </td>
                              <td
                                style={{
                                  padding: "16px",
                                  borderBottom: "1px solid #dee2e6",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div 
                                    style={{ 
                                      width: "12px", 
                                      height: "12px", 
                                      borderRadius: "50%", 
                                      backgroundColor: user.active ? "#64b664" : "#6c757d" 
                                    }}
                                  ></div>
                                  <span style={{ color: user.active ? "#64b664" : "#6c757d" }}>
                                    {user.active ? "Активен" : "Неактивен"}
                                  </span>
                                </div>
                              </td>
                              <td
                                style={{
                                  padding: "16px",
                                  borderBottom: "1px solid #dee2e6",
                                }}
                              >
                                {getRoleName(user.role_id)}
                              </td>
                            </>
                          )}
                          <td
                            style={{
                              padding: isMobile ? "8px" : "16px",
                              borderBottom: "1px solid #dee2e6",
                              whiteSpace: "nowrap"
                            }}
                          >
                            <div className={`d-flex ${isMobile ? 'flex-column' : ''} gap-2`}>
                              <Button
                                size="sm"
                                onClick={() => navigate(`/users/edit/${user.id}`)}
                                style={{
                                  backgroundColor: "#A3F49F",
                                  border: "none",
                                  borderRadius: "8px",
                                  padding: isMobile ? "4px 8px" : "6px 12px",
                                  fontSize: isMobile ? "0.7rem" : "0.875rem",
                                  marginBottom: isMobile ? "4px" : "0",
                                }}
                              >
                                {isMobile ? "Ред." : "Редактировать"}
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user.id);
                                  setShowDeleteModal(true);
                                }}
                                style={{
                                  backgroundColor: "#D3E29F",
                                  border: "none",
                                  borderRadius: "8px",
                                  padding: isMobile ? "4px 8px" : "6px 12px",
                                  fontSize: isMobile ? "0.7rem" : "0.875rem",
                                }}
                              >
                                {isMobile ? "Удал." : "Удалить"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              {!showNoResults && totalPages > 1 && (
                <div className={`d-flex ${isMobile ? 'flex-column' : 'align-items-center justify-content-between'} mt-4 gap-3`}>
                  <div className="d-flex align-items-center gap-3">
                    <Button
                      variant="outline-secondary"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      style={{ padding: "6px 12px" }}
                    >
                      ←
                    </Button>
                    <div className="mx-2" style={{ minWidth: "100px", textAlign: "center" }}>
                      {currentPage} из {totalPages}
                    </div>
                    <Button
                      variant="outline-secondary"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      style={{ padding: "6px 12px" }}
                    >
                      →
                    </Button>
                  </div>

                  {!isMobile && (
                    <div className="d-flex align-items-center gap-2">
                      <Form.Control
                        type="number"
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handlePageInput()}
                        style={{ width: "120px" }}
                        min={1}
                        max={totalPages}
                        placeholder="Номер страницы"
                        className="hide-arrows"
                      />
                      <Button
                        variant="outline-primary"
                        onClick={handlePageInput}
                        className="change-page-button"
                        style={{
                          padding: "6px 12px",
                          border: "1px solid black",
                          color: "black",
                        }}
                      >
                        Перейти
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {pageError && <div className="text-danger text-center mt-2">{pageError}</div>}
            </>
          )}

          <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Подтверждение удаления</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              Вы уверены, что хотите удалить пользователя "
              {allUsers.find((u) => u.id === selectedUser)?.fio}"?
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Отмена
              </Button>
              <Button
                variant="danger"
                onClick={() => selectedUser && handleDelete(selectedUser)}
                style={{ backgroundColor: "#D3E29F", border: "none" }}
              >
                Удалить
              </Button>
            </Modal.Footer>
          </Modal>
        </div>
      </div>

      {showSidebar && isMobile && (
        <div 
          className="sidebar-overlay" 
          onClick={toggleSidebar}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1035,
            backgroundColor: "rgba(0,0,0,0.3)",
            transition: "opacity 0.3s ease-in-out",
          }}
        />
      )}

      <style>{`
        .hide-arrows::-webkit-outer-spin-button,
        .hide-arrows::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .hide-arrows {
          -moz-appearance: textfield;
        }
        tr:hover {
          background-color: #f1f3f5 !important;
          transition: background 0.2s ease;
        }
        @keyframes rowAppear {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .no-results-message {
          animation: fadeInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
        .custom-dropdown {
          border-radius: 10px;
          padding: 8px 12px;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .custom-dropdown-menu .dropdown-item.active {
          background-color: #7DC459;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default UserList;