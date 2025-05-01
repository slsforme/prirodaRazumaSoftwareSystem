import React, { useEffect, useState } from "react";
import { Button, Form, InputGroup, Modal, Toast, ToastContainer } from "react-bootstrap";
import api from "../../services/api";

interface PasswordChangeModalProps {
  show: boolean;
  onHide: () => void;
  userId: number;
}

export const updateUserPassword = (
  userId: number,
  passwordData: {
    password: string;
  },
) => {
  return api.put(`users/${userId}`, passwordData);
};

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  show,
  onHide,
  userId,
}) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState<"success" | "danger">(
    "success",
  );

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/;
  const minLength = 5;
  const maxLength = 50;

  useEffect(() => {
    if (!show) {
      setErrors({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [show]);

  const validateField = (name: string, value: string) => {
    let error = "";

    switch (name) {
      case "oldPassword":
        if (!value) error = "Обязательное поле";
        break;

      case "newPassword":
        if (!value) {
          error = "Обязательное поле";
        } else if (value.length < minLength || value.length > maxLength) {
          error = `Длина пароля должна быть от ${minLength} до ${maxLength} символов`;
        } else if (!passwordRegex.test(value)) {
          error = "Недопустимые символы в пароле";
        }
        break;

      case "confirmPassword":
        if (value !== newPassword) {
          error = "Пароли не совпадают";
        }
        break;
    }

    return error;
  };

  const handleInputChange = (field: string, value: string) => {
    const error = validateField(field, value);

    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = {
      oldPassword: validateField("oldPassword", oldPassword),
      newPassword: validateField("newPassword", newPassword),
      confirmPassword: validateField("confirmPassword", confirmPassword),
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some((error) => error)) return;

    try {
      setLoading(true);
      setShowToast(false);

      await updateUserPassword(userId, {
        password: newPassword,
      });

      setToastMessage("Пароль успешно изменен");
      setToastVariant("success");

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(onHide, 1500);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || "Произошла ошибка при смене пароля";
      setToastMessage(errorMsg);
      setToastVariant("danger");
    } finally {
      setLoading(false);
      setShowToast(true);
    }
  };

  return (
    <>
      <ToastContainer
        position="top-center" 
        className="p-3"
        style={{ zIndex: 1070 }}
      >
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
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>Изменение пароля</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="oldPassword">
              <Form.Label>Текущий пароль</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showOldPassword ? "text" : "password"}
                  placeholder="Введите текущий пароль"
                  value={oldPassword}
                  onChange={(e) => {
                    setOldPassword(e.target.value);
                    handleInputChange("oldPassword", e.target.value);
                  }}
                  isInvalid={!!errors.oldPassword}
                  disabled={loading}
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  style={{
                    borderLeft: "none",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 1rem",
                    borderRadius: "0 10px 10px 0"
                  }}
                >
                  {showOldPassword ? (
                    <i className="bi bi-eye-slash"></i>
                  ) : (
                    <i className="bi bi-eye"></i>
                  )}
                </Button>
                <Form.Control.Feedback type="invalid">
                  {errors.oldPassword}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3" controlId="newPassword">
              <Form.Label>Новый пароль</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Введите новый пароль"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    handleInputChange("newPassword", e.target.value);
                  }}
                  isInvalid={!!errors.newPassword}
                  disabled={loading}
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    borderLeft: "none",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 1rem",
                    borderRadius: "0 10px 10px 0"
                  }}
                >
                  {showNewPassword ? (
                    <i className="bi bi-eye-slash"></i>
                  ) : (
                    <i className="bi bi-eye"></i>
                  )}
                </Button>
                <Form.Control.Feedback type="invalid">
                  {errors.newPassword}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3" controlId="confirmPassword">
              <Form.Label>Подтверждение пароля</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Повторите новый пароль"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    handleInputChange("confirmPassword", e.target.value);
                  }}
                  isInvalid={!!errors.confirmPassword}
                  disabled={loading}
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    borderLeft: "none",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "0 10px 10px 0",
                    padding: "0 1rem", 
                  }}
                >
                  {showConfirmPassword ? (
                    <i className="bi bi-eye-slash"></i>
                  ) : (
                    <i className="bi bi-eye"></i>
                  )}
                </Button>
                <Form.Control.Feedback type="invalid">
                  {errors.confirmPassword}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>

            <div className="d-grid">
              <Button
                variant="primary"
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: "#D3E29F",
                  color: "white",
                  border: "none",
                }}
              >
                {loading ? "Отправка..." : "Изменить пароль"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default PasswordChangeModal;