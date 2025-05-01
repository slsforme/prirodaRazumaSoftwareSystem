import { useEffect, useState } from "react";
import { Alert, Button, Form } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import { RoleFormProps } from "./types/roles.types";

const RoleForm = ({ isEdit = false }: RoleFormProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateName = (name: string) => {
    const regex = /^[a-zA-Zа-яА-ЯёЁ0-9\s-]+$/;
    return regex.test(name);
  };

  useEffect(() => {
    if (isEdit && id) {
      const fetchRole = async () => {
        setIsLoading(true);
        try {
          const response = await api.get(`/roles/${id}`);
          if (response.data) {
            setFormData(response.data);
          } else {
            setError("Роль не найдена");
            setTimeout(() => navigate("/roles"), 2000);
          }
        } catch (error) {
          console.error("Error fetching role:", error);
          setError("Ошибка загрузки данных роли");
          setTimeout(() => navigate("/roles"), 2000);
        } finally {
          setIsLoading(false);
        }
      };
      fetchRole();
    }
  }, [id, isEdit, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Название роли обязательно для заполнения");
      return;
    }

    if (formData.name.length < 3 || formData.name.length > 255) {
      setError("Название роли должно быть от 3 до 255 символов");
      return;
    }

    if (!validateName(formData.name)) {
      setError("Название содержит недопустимые символы");
      return;
    }

    try {
      setIsLoading(true);
      if (isEdit && id) {
        await api.put(`/roles/${id}`, formData);
      } else {
        await api.post("/roles", formData);
      }
      navigate("/roles");
    } catch (err: any) {
      const errorMessage =
        err.response?.status === 409
          ? "Роль с таким названием уже существует"
          : err.response?.data?.detail || "Ошибка при сохранении роли";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="container mt-4"
      style={{
        maxWidth: "800px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
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
          {isEdit ? "Редактирование роли" : "Создание новой роли"}
        </h2>

        {error && (
          <Alert
            variant="danger"
            style={{
              borderRadius: "10px",
              border: "none",
              boxShadow: "0 2px 8px rgba(255,0,0,0.1)",
            }}
          >
            {error}
          </Alert>
        )}

        <Form 
        onSubmit={handleSubmit}
        autoComplete="off" 
        >
          <Form.Group className="mb-4">
            <Form.Label style={{ fontWeight: "500", color: "#34495e" }}>
              Название роли
            </Form.Label>
            <Form.Control
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              isInvalid={!!error}
              disabled={isLoading}
              style={{
                borderRadius: "10px",
                padding: "12px",
                borderColor: "#ced4da",
                transition: "all 0.3s ease",
              }}
            />
            <Form.Text className="text-muted" style={{ marginTop: "0.5rem" }}>
              Допустимые символы: буквы, цифры, пробелы и дефисы
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label style={{ fontWeight: "500", color: "#34495e" }}>
              Описание
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={isLoading}
              style={{
                borderRadius: "10px",
                padding: "12px",
                borderColor: "#ced4da",
                resize: "vertical",
                minHeight: "100px",
                transition: "all 0.3s ease",
              }}
            />
          </Form.Group>

          <div
            className="d-flex justify-content-end gap-3"
            style={{ marginTop: "2rem" }}
          >
            <Button
              variant="outline-secondary"
              onClick={() => navigate("/roles")}
              disabled={isLoading}
              style={{
                borderRadius: "8px",
                padding: "10px 25px",
                borderWidth: "2px",
                fontWeight: "500",
                transition: "all 0.2s ease",
              }}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading}
              style={{
                borderRadius: "8px",
                padding: "10px 30px",
                fontWeight: "500",
                backgroundColor: "#D3E29F",
                borderColor: "#D3E29F",
                transition: "all 0.2s ease",
              }}
            >
              {isLoading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                    style={{ marginRight: "8px" }}
                  />
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </div>
        </Form>
      </div>

      <style>{`
        .form-control:focus {
          border-color: #A3F49F;
          box-shadow: 0 0 0 0.2rem rgba(163, 244, 159, 0.25);
        }
        
        .btn-outline-secondary:hover {
          background-color: #6c757d;
          border-color: #6c757d;
        }
        
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(211, 226, 159, 0.4);
        }
      `}</style>
    </div>
  );
};

export default RoleForm;
