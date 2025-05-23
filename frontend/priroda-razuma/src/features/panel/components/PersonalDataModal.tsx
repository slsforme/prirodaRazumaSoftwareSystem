import { AxiosError } from "axios";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Modal, Spinner, Toast, ToastContainer } from "react-bootstrap";
import { Info, Mail, Plus, Shield, User } from "react-feather";
import api from "../../services/api";
import { ApiErrorResponse, PersonalDataModalProps } from "./interfaces/charts.types";

const PersonalDataModal: React.FC<PersonalDataModalProps> = ({
  show,
  onHide,
  onPhotoUpdate,
}) => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = localStorage.getItem("user_id");

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState<"success" | "danger">("success");

  const fio = localStorage.getItem("fio") || "Не указано";
  const role = localStorage.getItem("role") || "Не указана";
  const login = localStorage.getItem("login") || "Не указан";
  let email: string | null = "Не указана";
  
  if (localStorage.getItem("email") !== "undefined") {
    email = localStorage.getItem("email");
  }

  const fetchAvatar = useCallback(async () => {
    if (!userId) return;

    try {
      const timestamp = new Date().getTime();
      const response = await api.get(`/users/${userId}/photo?t=${timestamp}`, {
        responseType: "blob",
      });
      
      if (avatar) URL.revokeObjectURL(avatar);
      
      const url = URL.createObjectURL(response.data);
      setAvatar(url);
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      axiosError.response?.status === 404 ? setAvatar(null) : console.error("Ошибка загрузки аватара:", axiosError);
    }
  }, [userId]); 

  useEffect(() => {
    show && fetchAvatar();
  }, [show, fetchAvatar]);

  useEffect(() => () => { avatar && URL.revokeObjectURL(avatar) }, [avatar]);

  const handleFileUpload = async (file: File) => {
    if (!file || !userId) {
      setToastMessage("Пользователь не найден");
      setToastVariant("danger");
      setShowToast(true);
      return;
    }

    const validTypes = ["image/jpeg", "image/png"];
    if (!validTypes.includes(file.type)) {
      setToastMessage("Поддерживаются только JPG/PNG файлы");
      setToastVariant("danger");
      setShowToast(true);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToastMessage("Файл слишком большой (макс. 5MB)");
      setToastVariant("danger");
      setShowToast(true);
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      await api.post(`/users/${userId}/photo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const tempUrl = URL.createObjectURL(file);
      avatar && URL.revokeObjectURL(avatar);
      setAvatar(tempUrl);
      onPhotoUpdate();
      
      setToastMessage("Фото успешно обновлено");
      setToastVariant("success");
      setShowToast(true);
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      setToastMessage("Ошибка при загрузке фото");
      setToastVariant("danger");
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.files?.[0] && handleFileUpload(e.target.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    e.dataTransfer.files?.[0] && handleFileUpload(e.dataTransfer.files[0]);
  };

  return (
    <>
      <ToastContainer position="top-center" className="p-3" style={{ zIndex: 1070 }}>
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
          bg={toastVariant}
        >
          <Toast.Header closeButton>
            <strong className="me-auto">
              {toastVariant === "success" ? "Успех" : "Ошибка"}
            </strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>

      <Modal
        show={show}
        onHide={onHide}
        centered
        size="lg"
        backdrop="static"
        contentClassName="border-0 shadow-lg"
        style={{ borderRadius: "15px" }}
      >
        <Modal.Header
          closeButton
          className="border-0"
          style={{
            backgroundColor: "#F3F6F3",
            borderTopLeftRadius: "15px",
            borderTopRightRadius: "15px",
            padding: "1.5rem",
          }}
        >
          <Modal.Title className="m-0">
            <span style={{ color: "#2c3e50", fontWeight: 600, fontSize: "1.5rem" }}>
              Персональные данные
            </span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body
          style={{
            backgroundColor: "#F3F6F3",
            borderBottomLeftRadius: "15px",
            borderBottomRightRadius: "15px",
            padding: "2rem",
          }}
        >
          <div className="d-flex justify-content-center mb-4">
            <div
              className="position-relative avatar-hover"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                cursor: "pointer",
                transition: "transform 0.3s ease",
                transform: isDragging ? "scale(1.1)" : "scale(1)",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                overflow: "hidden",
              }}
            >
              <div
                className="bg-white rounded-circle shadow-sm d-flex align-items-center justify-content-center"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "3px solid #D3E29F",
                  backgroundImage: avatar ? `url(${avatar})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundColor: "#e0e0e0"
                }}
              >
                {!avatar && <User size={48} color="#666" />}
              </div>
              
              <div
                className="add-photo-hint w-100 position-absolute bottom-0 d-flex align-items-center justify-content-center"
                style={{
                  backgroundColor: "rgba(0,0,0,0.5)",
                  height: "40px",
                }}
              >
                <Plus size={24} color="#fff" />
              </div>
              
              {isLoading && (
                <div
                  className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.7)",
                    borderRadius: "50%",
                  }}
                >
                  <Spinner animation="border" variant="success" size="sm" />
                </div>
              )}
            </div>
          </div>

          <div className="row g-4">
            <div className="col-md-6">
              <div className="d-flex align-items-center mb-4">
                <div className="bg-white p-3 rounded-circle shadow-sm">
                  <User size={24} style={{ color: "#D3E29F" }} />
                </div>
                <div className="ms-3">
                  <h6 className="text-muted mb-1">Полное имя</h6>
                  <p className="mb-0 fw-bold text-dark">{fio}</p>
                </div>
              </div>

              <div className="d-flex align-items-center mb-4">
                <div className="bg-white p-3 rounded-circle shadow-sm">
                  <Shield size={24} style={{ color: "#D3E29F" }} />
                </div>
                <div className="ms-3">
                  <h6 className="text-muted mb-1">Роль</h6>
                  <p className="mb-0 fw-bold text-dark">{role}</p>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="d-flex align-items-center mb-4">
                <div className="bg-white p-3 rounded-circle shadow-sm">
                  <Mail size={24} style={{ color: "#D3E29F" }} />
                </div>
                <div className="ms-3">
                  <h6 className="text-muted mb-1">Электронная почта</h6>
                  <p className="mb-0 fw-bold text-dark">{email}</p>
                </div>
              </div>

              <div className="d-flex align-items-center mb-4">
                <div className="bg-white p-3 rounded-circle shadow-sm">
                  <Info size={24} style={{ color: "#D3E29F" }} />
                </div>
                <div className="ms-3">
                  <h6 className="text-muted mb-1">Логин</h6>
                  <p className="mb-0 fw-bold text-dark">{login}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="d-grid mt-4">
            <Button
              onClick={onHide}
              style={{
                backgroundColor: "#D3E29F",
                border: "none",
                borderRadius: "10px",
                padding: "12px",
                fontWeight: 500,
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                color: "white"
              }}
            >
              Закрыть
            </Button>
          </div>
        </Modal.Body>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".jpg,.jpeg,.png"
          style={{ display: "none" }}
        />
      </Modal>

      <style>
        {`
          .hover-effect:hover {
            background-color: #bdd694 !important;
            transform: translateY(-1px);
          }
          .avatar-hover {
            transition: all 0.3s ease;
          }
          .avatar-hover:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          }
          .add-photo-hint {
            opacity: 0.9;
            transition: opacity 0.3s ease;
          }
          .avatar-hover:hover .add-photo-hint {
            opacity: 1;
          }
        `}
      </style>
    </>
  );
};

export default PersonalDataModal;