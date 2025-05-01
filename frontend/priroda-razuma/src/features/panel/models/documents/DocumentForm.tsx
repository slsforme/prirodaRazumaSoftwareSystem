import { useEffect, useRef, useState } from "react";
import { Alert, Button, Dropdown, Form } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import { DocumentFormData, SubDirectories } from "./types/documents.types";

const DocumentForm = ({ isEdit = false }: { isEdit?: boolean }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<DocumentFormData>({
    name: "",
    file: null,
    subdirectory_type: SubDirectories.ANAMNESIS,
    patient_id: 0,
  });
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [patients, setPatients] = useState<{ id: number; fio: string }[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof DocumentFormData, string>>>({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [globalDragActive, setGlobalDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dragLeaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const patientsRes = await api.get("/patients");
        setPatients(
          patientsRes.data.map((p: any) => ({
            id: p.id,
            fio: p.fio,
          })),
        );

        if (isEdit && id) {
          const docRes = await api.get(`/documents/${id}`);
          setFormData({
            name: docRes.data.name,
            file: null,
            subdirectory_type: docRes.data.subdirectory_type as SubDirectories,
            patient_id: docRes.data.patient_id,
          });
          setCurrentFileName(docRes.data.filename || docRes.data.name);
        }
      } catch (error) {
        setError("Ошибка загрузки данных");
      }
    };

    if (isInitialMount.current) {
      fetchData();
      isInitialMount.current = false;
    }

    return () => {
      setFormData({
        name: "",
        file: null,
        subdirectory_type: SubDirectories.ANAMNESIS,
        patient_id: 0,
      });
      setCurrentFileName("");
      setPatients([]);
      setErrors({});
      setError("");
      isInitialMount.current = true; 
    };
  }, [id, isEdit]);

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

  const validateField = (name: keyof DocumentFormData, value: any) => {
    let error = "";

    switch (name) {
      case "name":
        if (!value?.trim()) error = "Название обязательно";
        else if (value.length > 255) error = "Максимальная длина 255 символов";
        break;

      case "file":
        if (!isEdit && !value) {
          error = "Файл обязателен";
        } else if (value) {
          const allowedExtensions = /(\.pdf|\.docx)$/i;
          if (!allowedExtensions.exec(value.name)) {
            error = "Допустимы только файлы .PDF и .DOCX";
          }
        }
        break;

      case "patient_id":
        if (!value) error = "Выберите пациента";
        break;

      case "subdirectory_type":
        if (!Object.values(SubDirectories).includes(value as SubDirectories))
          error = "Выберите тип директории";
        break;
    }

    return error;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    
    if (name === "name") return;

    const error = validateField(name as keyof DocumentFormData, value);

    setFormData((prev) => ({
      ...prev,
      [name]: name === "patient_id" ? Number(value) : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    processFile(file);
  };

  const processFile = (file: File | null) => {
    if (!file) return;
  
    const error = validateField("file", file);
  
    setFormData((prev) => ({
      ...prev,
      file,
      name: file.name,
    }));
    setErrors((prev) => ({ ...prev, file: error, name: "" }));
  };

  const validateForm = () => {
    const newErrors = {
      name: validateField("name", formData.name),
      file: validateField("file", formData.file),
      patient_id: validateField("patient_id", formData.patient_id),
      subdirectory_type: validateField(
        "subdirectory_type",
        formData.subdirectory_type,
      ),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const formPayload = new FormData();

      const dataObj = {
        name: formData.name,
        patient_id: formData.patient_id,
        subdirectory_type: formData.subdirectory_type,
        author_id: localStorage.getItem("user_id") || "1",
      };

      formPayload.append("data", JSON.stringify(dataObj));

      if (formData.file) {
        formPayload.append("file", formData.file);
      }

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      if (isEdit && id) {
        const response = await api.put(`/documents/${id}`, formPayload, config);
        setFormData({
          name: response.data.name,
          file: null,
          subdirectory_type: response.data.subdirectory_type as SubDirectories,
          patient_id: response.data.patient_id,
        });
        setCurrentFileName(response.data.filename || response.data.name);
      } else {
        await api.post("/documents", formPayload, config);
      }

      navigate("/documents", { state: { shouldRefresh: true } });
    } catch (error: any) {
      if (error.response && error.response.status === 409) {
        setError("Пользователь с такими данными уже существует");
      } else {
        setError("Ошибка сохранения данных");
      }
    } finally {
      setIsLoading(false);
    }
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

  const getPatientName = (patientId: number) =>
    patients.find((p) => p.id === patientId)?.fio || "Выберите пациента";

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
      {globalDragActive && (
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
            Перетащите файл сюда
          </h3>
          <p style={{ fontSize: "1rem", opacity: 0.8 }}>
            Загрузите документ в формате PDF или DOCX
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
          position: "relative",
          zIndex: 1,
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
          {isEdit ? "Редактирование документа" : "Создание нового документа"}
        </h2>

        {error && <Alert variant="danger">{error}</Alert>}

        <Form
          ref={formRef}
          onSubmit={handleSubmit}
          encType="multipart/form-data"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          autoComplete="off"
        >
          <Form.Group className="mb-4">
            <Form.Label>Название документа*</Form.Label>
            <Form.Control
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              isInvalid={!!errors.name}
              style={{ borderRadius: "10px", padding: "12px" }}
              readOnly={true}
              placeholder="Название будет взято из имени файла"
            />
            <Form.Control.Feedback type="invalid">
              {errors.name}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Название документа автоматически берется из имени файла
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>
              Файл* {isEdit && "(оставьте пустым, чтобы сохранить текущий)"}
            </Form.Label>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
              accept=".pdf,.docx"
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
                  : errors.file
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

                {formData.file ? (
                  <div style={{ fontWeight: "500", color: "#2c3e50" }}>
                    Выбран файл: {formData.file.name}
                  </div>
                ) : isEdit && currentFileName ? (
                  <div style={{ fontWeight: "500", color: "#2c3e50" }}>
                    Текущий файл: {currentFileName}
                    <div style={{ fontSize: "0.9rem", color: "#6c757d", marginTop: "8px" }}>
                      Перетащите новый файл или нажмите для замены
                    </div>
                  </div>
                ) : (
                  <>
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
                      Перетащите файл сюда или нажмите для выбора
                    </div>
                    <div
                      style={{
                        fontSize: "0.9rem",
                        color: "#6c757d",
                        opacity: isHovering ? "0.9" : "0.7",
                        transition: "all 0.3s ease",
                      }}
                    >
                      Поддерживаются файлы PDF и DOCX
                    </div>
                  </>
                )}
              </div>
            </div>

            {errors.file && (
              <div
                className="text-danger mt-2"
                style={{ fontSize: "0.875rem" }}
              >
                {errors.file}
              </div>
            )}
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Тип директории*</Form.Label>
            <Dropdown>
              <Dropdown.Toggle
                variant="light"
                id="dropdown-directory"
                className="custom-dropdown w-100 d-flex justify-content-between align-items-center shadow-sm"
                style={{
                  border: !!errors.subdirectory_type ? "1px solid #dc3545" : "none",
                }}
              >
                {formData.subdirectory_type}
              </Dropdown.Toggle>
              <Dropdown.Menu className="custom-dropdown-menu w-100">
                {Object.values(SubDirectories).map((type) => (
                  <Dropdown.Item
                    key={type}
                    active={formData.subdirectory_type === type}
                    onClick={() => {
                      const error = validateField("subdirectory_type", type);
                      setFormData((prev) => ({ 
                        ...prev, 
                        subdirectory_type: type 
                      }));
                      setErrors((prev) => ({ ...prev, subdirectory_type: error }));
                    }}
                  >
                    {type}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
            {errors.subdirectory_type && (
              <div
                className="text-danger mt-2"
                style={{ fontSize: "0.875rem" }}
              >
                {errors.subdirectory_type}
              </div>
            )}
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Пациент*</Form.Label>
            <Dropdown>
              <Dropdown.Toggle
                variant="light"
                id="dropdown-patient"
                className="custom-dropdown w-100 d-flex justify-content-between align-items-center shadow-sm"
                style={{
                  border: !!errors.patient_id ? "1px solid #dc3545" : "none",
                }}
              >
                {formData.patient_id === 0 ? "Выберите пациента" : getPatientName(formData.patient_id)}
              </Dropdown.Toggle>
              <Dropdown.Menu className="custom-dropdown-menu w-100">
                <Dropdown.Item
                  active={formData.patient_id === 0}
                  onClick={() => {
                    const error = validateField("patient_id", 0);
                    setFormData((prev) => ({ ...prev, patient_id: 0 }));
                    setErrors((prev) => ({ ...prev, patient_id: error }));
                  }}
                >
                  Выберите пациента
                </Dropdown.Item>
                {patients.map((patient) => (
                  <Dropdown.Item
                    key={patient.id}
                    active={formData.patient_id === patient.id}
                    onClick={() => {
                      const error = validateField("patient_id", patient.id);
                      setFormData((prev) => ({ ...prev, patient_id: patient.id }));
                      setErrors((prev) => ({ ...prev, patient_id: error }));
                    }}
                  >
                    {patient.fio}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
            {errors.patient_id && (
              <div
                className="text-danger mt-2"
                style={{ fontSize: "0.875rem" }}
              >
                {errors.patient_id}
              </div>
            )}
          </Form.Group>

          <div className="d-flex justify-content-end gap-3">
            <Button
              variant="outline-secondary"
              onClick={() => navigate("/documents")}
              style={{
                borderRadius: "8px",
                padding: "10px 25px",
                transition: "all 0.2s ease",
              }}
              className="button-hover"
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
                fontWeight: "500",
                transition: "all 0.2s ease",
              }}
              className="submit-button-hover"
              disabled={isLoading}
            >
              {isLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </Form>

        <style>{`
          .button-hover:hover {
            background-color: #6c757d;
            transform: translateY(-1px);
          }

          .submit-button-hover:hover:not(:disabled) {
            background-color: #c9d98d !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
          }

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
        `}</style>
      </div>
    </div>
  );
};

export default DocumentForm;