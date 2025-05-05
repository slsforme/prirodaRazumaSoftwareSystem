import { AxiosError } from "axios";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Dropdown, Form, InputGroup } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import { Role } from "./types/users.types";

const UserForm = ({ isEdit = false }: { isEdit?: boolean }) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    patronymic: "",
    login: "",
    password: "",
    userEmail: "",
    active: true,
    role_id: 0,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isPhotoDeleted, setIsPhotoDeleted] = useState(false); 
  const [errors, setErrors] = useState({
    lastName: "",
    firstName: "",
    patronymic: "",
    login: "",
    password: "",
    userEmail: "",
    photo: "",
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [globalDragActive, setGlobalDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dragLeaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const rolesRes = await api.get("/roles");
        setRoles(rolesRes.data);
        
        if (isEdit && id) {
          try {
            const userRes = await api.get(`/users/${id}`);
            if (userRes && userRes.data) {
              const parts = userRes.data.fio.split(" ");
              setFormData({
                lastName: parts[0] || "",
                firstName: parts[1] || "",
                patronymic: parts[2] || "",
                login: userRes.data.login || "",
                userEmail: userRes.data.email || "",
                password: "",
                active: userRes.data.active !== undefined ? userRes.data.active : true,
                role_id: userRes.data.role_id || 0,
              });
            }
          } catch (userError) {
            console.error("Error fetching user data:", userError);
            setError("Ошибка загрузки данных пользователя");
          }
          
          try {
            const photoRes = await api.get(`/users/${id}/photo`, { responseType: "blob" });
            if (photoRes && photoRes.data) {
              const url = URL.createObjectURL(photoRes.data);
              setPhotoUrl(url);
            }
          } catch (photoError) {
            const axiosError = photoError as AxiosError; 
            if (axiosError.response?.status === 404) {
              setPhotoUrl(null);
            } else {
              console.error("Error fetching photo:", axiosError);
            }
          }
        }
      } catch (error) {
        console.error("Error in fetchData:", error);
        setError("Ошибка загрузки данных");
      }
    };
    
    fetchData();
    
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [id, isEdit]);

  const validateField = (name: string, value: string | File) => {
    const cyrillicRegex = /^[а-яА-ЯёЁ\- ]+$/;
    const loginRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9]+$/;
    const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/;

    let error = "";

    switch (name) {
      case "lastName":
      case "firstName":
        if (typeof value === "string") { 
          if (value.length < 2) error = "Минимальная длина - 2 символа";
          else if (value.length > 100)
            error = "Максимальная длина - 100 символов";
          else if (!cyrillicRegex.test(value))
            error = "Допустимы только кириллические символы";
        } else {
          error = "Поле должно быть строкой";
        }
        break;

      case "login":
          if (typeof value === "string") {
            if (!value) {
              error = "Обязательное поле";
            } else if (value.length < 5 || value.length > 50) {
              error = "Длина должна быть от 5 до 50 символов";
            } else if (!loginRegex.test(value)) {
              error = "Допустимы только латинские буквы и цифры, минимум одна буква";
            }
          } else {
            error = "Поле должно быть строкой";
          }
          break;

      case "password":
        if (typeof value === "string") { 
          if (!isEdit && !value) error = "Обязательное поле";
          else if (value && (value.length < 5 || value.length > 50))
            error = "Длина должна быть от 5 до 50 символов";
          else if (value && !passwordRegex.test(value))
            error = "Недопустимые символы";
        } else {
          error = "Поле должно быть строкой";
        }
        break;

      case "userEmail":
          if (typeof value === "string") { 
            if (value) {
              if (!emailRegex.test(value)) {
                error = "Некорректный формат электронной почты";
              } else if (value.length > 255) {
                error = "Максимальная длина email - 255 символов";
              }
            }
          } else {
            error = "Поле должно быть строкой";
          }
          break;

      case "photo":
        if (value instanceof File) {
          const validTypes = ["image/jpeg", "image/png"];
          if (!validTypes.includes(value.type)) {
            error = "Поддерживаются только JPG/PNG файлы";
          } else if (value.size > 5 * 1024 * 1024) {
            error = "Файл слишком большой (макс. 5MB)";
          }
        }
        break;
    }

    return error;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue = value;
  
    if (name === "login") {
      processedValue = value.replace(/[^a-zA-Z0-9]/g, "");
    } else if (["lastName", "firstName", "patronymic"].includes(name) && value.length > 0) {
      processedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
  
    const error = validateField(name, processedValue);
  
    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const processFile = (file: File | null) => {
    if (!file) return;

    const error = validateField("photo", file);
    setPhoto(file);
    setErrors((prev) => ({ ...prev, photo: error }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    processFile(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement | HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setGlobalDragActive(false);

    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current);
      dragLeaveTimeoutRef.current = null;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
      e.dataTransfer.clearData();
    }
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeletePhoto = () => {
    setIsPhotoDeleted(true); 
    setPhotoUrl(null); 
    setPhoto(null); 
    setErrors((prev) => ({ ...prev, photo: "" })); 
  };

  const validateForm = () => {
    const newErrors = {
      lastName: validateField("lastName", formData.lastName),
      firstName: validateField("firstName", formData.firstName),
      patronymic: validateField("patronymic", formData.patronymic),
      login: validateField("login", formData.login),
      password: validateField("password", formData.password),
      userEmail: validateField("userEmail", formData.userEmail),
      photo: photo ? validateField("photo", photo) : "",
    };

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((error) => error !== "");
    const roleValid = formData.role_id > 0;

    if (!roleValid) {
      setError("Выберите роль пользователя");
      return false;
    }

    return !hasErrors && roleValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const fio = [formData.lastName, formData.firstName, formData.patronymic]
        .filter(Boolean)
        .join(" ");

      const payload: any = {
        fio,
        login: formData.login,
        active: formData.active,
        role_id: formData.role_id,
        email: formData.userEmail || null,
        photo_url: null,
      };

      if (!isEdit || (isEdit && formData.password)) {
        payload.password = formData.password;
      }

      if (isEdit && id) {
        await api.put(`/users/${id}`, payload);
        
        if (isPhotoDeleted && photoUrl) {
          await api.delete(`/users/${id}/photo`);
        }
        if (photo) {
          const formDataPhoto = new FormData();
          formDataPhoto.append("photo", photo);
          await api.post(`/users/${id}/photo`, formDataPhoto, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
        }
      } else {
        const response = await api.post("/users", payload);
        
        if (photo && response.data && response.data.id) {
          const userId = response.data.id;
          const formDataPhoto = new FormData();
          formDataPhoto.append("photo", photo);
          await api.post(`/users/${userId}/photo`, formDataPhoto, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
        }
      }

      navigate("/users");
    } catch (error: any) {
      if (error.response && error.response.status === 409) {
        setError("Пользователь с такими данными уже существует");
      } else {
        setError("Ошибка сохранения данных");
        console.error("Error saving data:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleName = (roleId: number) =>
    roles.find((role) => role.id === roleId)?.name || "Выберите роль";

  useEffect(() => {
    const handleGlobalDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (dragLeaveTimeoutRef.current) {
        clearTimeout(dragLeaveTimeoutRef.current);
        dragLeaveTimeoutRef.current = null;
      }
      setGlobalDragActive(true);
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if ((e as any).fromElement === null || !document.contains(e.relatedTarget as Node)) {
        dragLeaveTimeoutRef.current = setTimeout(() => {
          setGlobalDragActive(false);
        }, 100);
      }
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      setGlobalDragActive(false);

      if (dragLeaveTimeoutRef.current) {
        clearTimeout(dragLeaveTimeoutRef.current);
        dragLeaveTimeoutRef.current = null;
      }

      setTimeout(() => {
        if (dropZoneRef.current && e.dataTransfer?.files.length) {
          const file = e.dataTransfer.files[0];
          processFile(file);
        }
      }, 100);
    };

    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener("dragenter", handleGlobalDragEnter);
    document.addEventListener("dragleave", handleGlobalDragLeave);
    document.addEventListener("drop", handleGlobalDrop);
    document.addEventListener("dragover", handleGlobalDragOver);

    return () => {
      document.removeEventListener("dragenter", handleGlobalDragEnter);
      document.removeEventListener("dragleave", handleGlobalDragLeave);
      document.removeEventListener("drop", handleGlobalDrop);
      document.removeEventListener("dragover", handleGlobalDragOver);

      if (dragLeaveTimeoutRef.current) {
        clearTimeout(dragLeaveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="container mt-4"
      style={{
        maxWidth: "800px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      {globalDragActive && isEdit && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(22, 28, 36, 0.7)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            color: "white",
            backdropFilter: "blur(4px)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(211, 226, 159, 0.9)",
              borderRadius: "50%",
              width: "90px",
              height: "90px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem",
              boxShadow: "0 0 20px rgba(211, 226, 159, 0.7)",
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 15V3M12 3L7 8M12 3L17 8M20 17V19C20 19.5304 19.7893 20.0391 19.4142 20.4142C19.0391 20.7893 18.5304 21 18 21H6C5.46957 21 4.96086 20.7893 4.58579 20.4142C4.21071 20.0391 4 19.5304 4 19V17"
                stroke="#2c3e50"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "0.5rem",
              color: "white",
            }}
          >
            Перетащите фото сюда
          </h3>
          <p style={{ fontSize: "1rem", opacity: 0.8 }}>
            Загрузите фото в формате JPG или PNG
          </p>
        </div>
      )}

      <div
        style={{
          backgroundColor: "white",
          borderRadius: "15px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          padding: "2rem",
          width: "100%",
          margin: "20px",
        }}
      >
        <h2
          style={{
            color: "#2c3e50",
            marginBottom: "2rem",
            fontWeight: "600",
            borderBottom: "3px solid #D3E29F",
            paddingBottom: "0.5rem",
          }}
        >
          {isEdit
            ? "Редактирование пользователя"
            : "Создание нового пользователя"}
        </h2>

        {error && <Alert variant="danger">{error}</Alert>}

        <Form
          ref={formRef}
          onSubmit={handleSubmit}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          autoComplete="off"
        >
          <Form.Group className="mb-4">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              name="userEmail"
              value={formData.userEmail}
              onChange={handleInputChange}
              isInvalid={!!errors.userEmail}
              style={{ borderRadius: "10px", padding: "12px" }}
              autoComplete="off"
            />
            <Form.Control.Feedback type="invalid">
              {errors.userEmail}
            </Form.Control.Feedback>
          </Form.Group>

          {isEdit && (
            <Form.Group className="mb-4">
              <Form.Label>Фото (оставьте пустым, чтобы сохранить текущее)</Form.Label>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png"
                />

              <div
                ref={dropZoneRef}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleDropZoneClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{
                  border: isDragging
                    ? "2px dashed #D3E29F"
                    : errors.photo
                      ? "2px dashed #dc3545"
                      : "2px dashed #ced4da",
                  borderRadius: "10px",
                  padding: "2rem",
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: isHovering
                    ? "rgba(211, 226, 159, 0.05)"
                    : isDragging
                      ? "rgba(211, 226, 159, 0.1)"
                      : "transparent",
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {isHovering && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(211, 226, 159, 0.07)",
                      borderRadius: "8px",
                    }}
                  />
                )}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {photoUrl && !photo ? (
                    <>
                      <div style={{ position: "relative", width: "100px", height: "100px" }}>
                        <img
                          src={photoUrl}
                          alt="User"
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "10px",
                            objectFit: "cover",
                          }}
                        />
                        <Button
                          variant="danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto();
                          }}
                          style={{
                            position: "absolute",
                            top: "-12px",
                            right: "-12px",
                            borderRadius: "50%",
                            width: "30px",
                            height: "30px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#ff4d4f",
                            border: "none",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                            transition: "all 0.2s ease",
                            fontSize: "14px",
                            fontWeight: "bold",
                            color: "white",
                            padding: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)";
                          }}
                          onMouseDown={(e) => {
                            e.currentTarget.style.transform = "scale(0.95)";
                          }}
                          onMouseUp={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto();
                        }}
                        style={{
                          backgroundColor: "#ff4d4f",
                          border: "none",
                          borderRadius: "8px",
                          padding: "8px 20px",
                          color: "white",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                          marginTop: "1rem",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#e04343";
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#ff4d4f";
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
                        }}
                      >
                        Удалить
                      </Button>
                    </>
                  ) : photo ? (
                    <div style={{ fontWeight: "500", color: "#2c3e50" }}>
                      Выбрано фото: {photo.name}
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          borderRadius: "50%",
                          backgroundColor: isHovering ? "#e8f0c8" : "#F5F9E7",
                          width: "60px",
                          height: "60px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "0.5rem",
                          transition: "all 0.3s ease",
                          transform: isHovering ? "scale(1.05)" : "scale(1)",
                        }}
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 15V3M12 3L7 8M12 3L17 8M20 17V19C20 19.5304 19.7893 20.0391 19.4142 20.4142C19.0391 20.7893 18.5304 21 18 21H6C5.46957 21 4.96086 20.7893 4.58579 20.4142C4.21071 20.0391 4 19.5304 4 19V17"
                            stroke="#6B8E23"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div
                        style={{
                          fontWeight: "500",
                          color: "#2c3e50",
                          transform: isHovering
                            ? "translateY(-2px)"
                            : "translateY(0px)",
                          transition: "all 0.3s ease",
                        }}
                      >
                        Перетащите фото сюда или нажмите для выбора
                      </div>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "#6c757d",
                          opacity: isHovering ? "0.9" : "0.7",
                          transition: "all 0.3s ease",
                        }}
                      >
                        Поддерживаются файлы JPG, JPEG и PNG
                      </div>
                    </>
                  )}
                </div>
              </div>

              {errors.photo && (
                <div
                  className="text-danger mt-2"
                  style={{ fontSize: "0.875rem" }}
                >
                  {errors.photo}
                </div>
              )}
            </Form.Group>
          )}

          <Form.Group className="mb-4">
            <Form.Label>Фамилия*</Form.Label>
            <Form.Control
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              isInvalid={!!errors.lastName}
              style={{ borderRadius: "10px", padding: "12px" }}
            />
            <Form.Control.Feedback type="invalid">
              {errors.lastName}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Имя*</Form.Label>
            <Form.Control
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              isInvalid={!!errors.firstName}
              style={{ borderRadius: "10px", padding: "12px" }}
            />
            <Form.Control.Feedback type="invalid">
              {errors.firstName}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Отчество</Form.Label>
            <Form.Control
              name="patronymic"
              value={formData.patronymic}
              onChange={handleInputChange}
              isInvalid={!!errors.patronymic}
              style={{ borderRadius: "10px", padding: "12px" }}
            />
            <Form.Control.Feedback type="invalid">
              {errors.patronymic}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Логин*</Form.Label>
            <Form.Control
              name="login"
              value={formData.login}
              onChange={handleInputChange}
              isInvalid={!!errors.login}
              style={{ borderRadius: "10px", padding: "12px" }}
            />
            <Form.Control.Feedback type="invalid">
              {errors.login}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>
              Пароль{isEdit && " (оставьте пустым, чтобы не менять)"}
            </Form.Label>
            <InputGroup hasValidation>
              <Form.Control
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                isInvalid={!!errors.password}
                style={{ borderLeft: "10px", padding: "12px" }}
                autoComplete="new-password"
              />
              <Button
                variant="outline-secondary"
                className="custom-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  borderLeft: "none",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 1rem",
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

          <Form.Group className="mb-4">
            <Form.Label>Роль*</Form.Label>
            <Dropdown>
              <Dropdown.Toggle
                variant="light"
                id="dropdown-role"
                className="custom-dropdown w-100 d-flex justify-content-between align-items-center shadow-sm"
                style={{ border: !!error && formData.role_id === 0 ? "1px solid #dc3545" : "none" }}
              >
                {formData.role_id === 0 ? "Выберите роль" : getRoleName(formData.role_id)}
              </Dropdown.Toggle>
              <Dropdown.Menu className="custom-dropdown-menu w-100">
                <Dropdown.Item
                  active={formData.role_id === 0}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, role_id: 0 }));
                    setError("Выберите роль пользователя");
                  }}
                >
                  Выберите роль
                </Dropdown.Item>
                {roles.map((role) => (
                  <Dropdown.Item
                    key={role.id}
                    active={formData.role_id === role.id}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, role_id: role.id }));
                      setError("");
                    }}
                  >
                    {role.name}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
            {error && formData.role_id === 0 && (
              <div className="text-danger mt-2" style={{ fontSize: "0.875rem" }}>
                {error}
              </div>
            )}
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Статус активности</Form.Label>
            <Dropdown>
              <Dropdown.Toggle
                variant="light"
                id="dropdown-status"
                className="custom-dropdown w-100 d-flex justify-content-between align-items-center shadow-sm"
              >
                {formData.active ? "Активный" : "Неактивный"}
              </Dropdown.Toggle>
              <Dropdown.Menu className="custom-dropdown-menu w-100">
                <Dropdown.Item
                  active={formData.active}
                  onClick={() => setFormData((prev) => ({ ...prev, active: true }))}
                >
                  Активный
                </Dropdown.Item>
                <Dropdown.Item
                  active={!formData.active}
                  onClick={() => setFormData((prev) => ({ ...prev, active: false }))}
                >
                  Неактивный
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Form.Group>

          <div className="d-flex justify-content-end gap-3">
            <Button
              variant="outline-secondary"
              onClick={() => navigate("/users")}
              style={{ borderRadius: "8px", padding: "10px 25px" }}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              style={{
                backgroundColor: "#D3E29F",
                border: "none",
                borderRadius: "8px",
                padding: "10px 30px",
              }}
              disabled={isLoading}
            >
              {isLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </Form>
      </div>

      <style>{`
        .custom-dropdown {
          border-radius: 10px;
          font-weight: 500;
          padding: 8px 12px;
          border: none;
          background-color: #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .custom-dropdown-menu {
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: none;
          padding: 8px;
        }
        .custom-dropdown-menu .dropdown-item {
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 2px;
        }
        .custom-dropdown-menu .dropdown-item.active {
          background-color: #7DC459;
          color: white;
        }
        .custom-dropdown-menu .dropdown-item:hover {
          background-color: #5FB347 !important;
          color: white !important;
        }
          
        .custom-password-toggle {
          border: 1px solid #ced4da;
          border-left: none;
          border-radius: 0 10px 10px 0;
          transition: all 0.2s ease;
        }

        .custom-password-toggle:hover {
          background-color: #6c757d;
          border-color: #6c757d;
        }
          
        .custom-password-toggle:focus {
          box-shadow: none;
        }
      `}</style>
    </div>
  );
};

export default UserForm;