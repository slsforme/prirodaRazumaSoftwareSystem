import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import React, { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Form, InputGroup, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import MainLogo from "../../../assets/svg/main.svg";
import { getRoleById, getUserById } from "../../services/api";
import { authService } from "../services/api";
import "../styles/index.css";
import { LoginFormData } from "../types/auth.types";

const LoginForm: React.FC = () => {
  const [loginData, setLoginData] = useState<LoginFormData>({
    login: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    login: "",
    password: "",
  });
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const validateField = (name: string, value: string) => {
    const loginRegex = /^[a-zA-Z0-9]+$/;
    const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/;
    let error = "";

    switch (name) {
      case "login":
        if (!value) error = "Обязательное поле";
        else if (value.length < 5 || value.length > 50)
          error = "Длина должна быть от 5 до 50 символов";
        else if (!loginRegex.test(value))
          error = "Допустимы только латинские буквы и цифры";
        break;

      case "password":
        if (!value) error = "Обязательное поле";
        else if (value.length < 5 || value.length > 50)
          error = "Длина должна быть от 5 до 50 символов";
        else if (!passwordRegex.test(value)) error = "Недопустимые символы";
        break;
    }

    return error;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === "login") {
      processedValue = value.replace(/[^a-zA-Z0-9]/g, "");
    }

    const error = validateField(name, processedValue);

    setLoginData((prevData) => ({
      ...prevData,
      [name]: processedValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const validateForm = () => {
    const newErrors = {
      login: validateField("login", loginData.login),
      password: validateField("password", loginData.password),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const { data } = await authService.login({
        username: loginData.login,
        password: loginData.password,
      });

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("login", loginData.login);

      try {
        const userResponse = await getUserById(parseInt(data.user_id));
        const roleResponse = await getRoleById(userResponse.data.role_id);

        localStorage.setItem("fio", userResponse.data.fio);
        localStorage.setItem("role", roleResponse.data.name);
        localStorage.setItem("role_id", roleResponse.data.id);
        localStorage.setItem("email", roleResponse.data.email);
      } catch (error) {
        console.error("Ошибка при получении пользователя:", error);
      }

      navigate("/cabinet");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError("Вы неправильно ввели данные");
        } else {
          setError(
            err.response?.data?.message || "Произошла ошибка при авторизации"
          );
        }
      } else {
        setError("Неизвестная ошибка. Свяжитесь с Администратором");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isMobile = windowWidth < 768;

  return (
    <div className="container-fluid vh-100">
      <div className="row h-100">
        <div className={`${isMobile ? 'col-12' : 'col-md-6'} p-3 p-sm-4 p-md-5 d-flex flex-column ${isMobile ? 'justify-content-center' : 'justify-content-start'}`}>
          <div className={`${isMobile ? 'mb-4' : 'mb-3 mb-md-4 mt-3 mt-md-5'}`}>
            <div className="d-flex align-items-center mb-3 mb-md-5">
              <div
                className="rounded-circle border p-2 d-flex align-items-center justify-content-center"
                style={{ width: "40px", height: "40px" }}
              >
                <img
                  src={MainLogo}
                  alt="Brain icon"
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
              <h1 className="ms-2 ms-md-3 fs-4 fs-md-3 fw-bold mb-0">«Природа Разума»</h1>
            </div>
          </div>

          <div
            className={`${isMobile ? 'w-100' : 'w-50'} mx-auto ${isMobile ? '' : 'mt-4 mt-md-5'}`}
            style={{ transform: isMobile ? "none" : "translateY(-10%)" }}
          >
            <h2 className="fs-3 fs-md-2 fw-bold mb-2">Авторизация</h2>
            <h3 className="fs-5 fs-md-4 fw-medium mb-3 mb-md-5">Войдите в личный кабинет</h3>

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3 mb-md-4" controlId="login">
                <Form.Label className="fs-6 fs-md-5 mb-2 mb-md-3">Введите логин</Form.Label>
                <Form.Control
                  type="text"
                  name="login"
                  placeholder="Логин"
                  size={isMobile ? "sm" : "lg"}
                  style={{ fontSize: isMobile ? "1rem" : "1.1rem", padding: isMobile ? "0.75rem" : "1rem" }}
                  value={loginData.login}
                  onChange={handleChange}
                  disabled={isLoading}
                  isInvalid={!!errors.login}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.login}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-4 mb-md-5" controlId="password">
                <Form.Label className="fs-6 fs-md-5 mb-2 mb-md-3">Введите пароль</Form.Label>
                <InputGroup hasValidation>
                  <Form.Control
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Пароль"
                    size={isMobile ? "sm" : "lg"}
                    style={{ fontSize: isMobile ? "1rem" : "1.1rem", padding: isMobile ? "0.75rem" : "1rem" }}
                    value={loginData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    isInvalid={!!errors.password}
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    style={{
                      borderLeft: "none",
                      display: "flex",
                      alignItems: "center",
                      padding: isMobile ? "0 0.75rem" : "0 1rem",
                    }}
                  >
                    {showPassword ? (
                      <i className="bi bi-eye-slash"></i>
                    ) : (
                      <i className="bi bi-eye"></i>
                    )}
                  </Button>
                  <Form.Control.Feedback type="invalid">
                    {errors.password}
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>

              {error && (
                <Alert variant="danger" className="mt-3">
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                className="w-100 py-2 py-md-3 mt-3 mt-md-4 fw-bold"
                style={{
                  backgroundColor: "#d9e7a8",
                  color: "white",
                  fontSize: isMobile ? "1rem" : "1.2rem",
                  border: "none",
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      variant="light"
                      className="me-2"
                    />
                    Вход...
                  </>
                ) : (
                  "Войти"
                )}
              </Button>
            </Form>
          </div>
        </div>

        {!isMobile && (
          <div
            className="col-md-6 d-none d-md-block"
            style={{
              background: "linear-gradient(135deg, #d3e29f 0%, #a3f49a 100%)",
              minHeight: "100vh",
            }}
          ></div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;