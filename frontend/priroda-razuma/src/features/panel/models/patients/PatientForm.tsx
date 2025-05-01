import { ru } from "date-fns/locale/ru";
import { useEffect, useState } from "react";
import { Alert, Button, Form } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate, useParams } from "react-router-dom";
import cachedApi from "../../../services/api";
import { Patient, PatientFormData } from "./types/patients.types";


const formatBirthDate = (date: Date | null): string => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

const PatientForm = ({ isEdit = false }: { isEdit?: boolean }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<PatientFormData>({
    lastName: "",
    firstName: "",
    patronymic: "",
    birthDate: null,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PatientFormData, string>>>({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const calculateAge = (birthDate: Date | null): number | string => {
    if (!birthDate) return "";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    const fetchPatient = async () => {
      if (!isEdit || !id) return;

      try {
        const response = await cachedApi.get<Patient>(`/patients/${id}`);
        const parts = response.data.fio.split(" ");
        
        setFormData({
          lastName: parts[0] || "",
          firstName: parts[1] || "",
          patronymic: parts[2] || "",
          birthDate: response.data.date_of_birth 
            ? new Date(response.data.date_of_birth)
            : null,
        });
      } catch (error) {
        setError("Ошибка загрузки данных пациента");
      }
    };
    fetchPatient();
  }, [id, isEdit]);

  const validateField = (
    name: keyof PatientFormData,
    value: string | Date | null
  ): string => {
    const cyrillicRegex = /^[а-яА-ЯёЁ\- ]+$/;
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
        }
        break;

      case "patronymic":
        if (typeof value === "string" && value) {
          if (value.length > 100) error = "Максимальная длина - 100 символов";
          else if (!cyrillicRegex.test(value))
            error = "Допустимы только кириллические символы";
        }
        break;

      case "birthDate":
        if (!value) {
          error = "Дата рождения обязательна";
        } else if (value > new Date()) {
          error = "Дата рождения не может быть в будущем";
        }
        break;
    }

    return error;
  };

  const handleDateChange = (date: Date | null) => {
    const error = validateField("birthDate", date);
    
    setFormData(prev => ({
      ...prev,
      birthDate: date,
    }));
  
    setErrors(prev => ({
      ...prev,
      birthDate: error,
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    if (["lastName", "firstName", "patronymic"].includes(name) && value.length > 0) {
      processedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
    
    const error = validateField(name as keyof PatientFormData, processedValue);
  
    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
    }));
  
    setErrors(prev => ({
      ...prev,
      [name]: error,
    }));
  };
  
  const validateForm = () => {
    const newErrors: Record<keyof PatientFormData, string> = {
      lastName: validateField("lastName", formData.lastName),
      firstName: validateField("firstName", formData.firstName),
      patronymic: validateField("patronymic", formData.patronymic),
      birthDate: validateField("birthDate", formData.birthDate),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== "");
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

      const payload = {
        fio,
        date_of_birth: formatBirthDate(formData.birthDate),
      };

      if (isEdit && id) {
        await cachedApi.put(`/patients/${id}`, payload);
      } else {
        await cachedApi.post("/patients", payload);
      }

      navigate("/patients");
    } catch (error: any) {
      if (error.response?.status === 409) {
        setError("Пациент с такими данными уже существует");
      } else {
        setError("Ошибка сохранения данных");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculatedAge = calculateAge(formData.birthDate);

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
          {isEdit ? "Редактирование пациента" : "Создание нового пациента"}
        </h2>

        {error && <Alert variant="danger">{error}</Alert>}

        <Form 
        onSubmit={handleSubmit}
        autoComplete="off"
        >
          <Form.Group className="mb-4">
            <Form.Label>Фамилия*</Form.Label>
            <Form.Control
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              isInvalid={!!errors.lastName}
              style={{ borderRadius: "10px", padding: "12px" }}
              autoComplete="off" 
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
            <Form.Label>Дата рождения*</Form.Label>
            <div>
              <DatePicker
                selected={formData.birthDate}
                onChange={handleDateChange}
                dateFormat="dd/MM/yyyy"
                locale={ru}
                placeholderText="дд/мм/гггг"
                className={`form-control ${errors.birthDate ? "is-invalid" : ""}`}
                showYearDropdown
                dropdownMode="select"
                wrapperClassName="w-100"
                popperPlacement="bottom-start"
              />
              {errors.birthDate && (
                <div className="invalid-feedback d-block mt-2">
                  {errors.birthDate}
                </div>
              )}
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Возраст</Form.Label>
            <Form.Control
              type="text"
              value={calculatedAge}
              readOnly
              style={{
                borderRadius: "10px",
                padding: "12px",
                backgroundColor: "#f8f9fa",
                cursor: "not-allowed",
              }}
            />
          </Form.Group>

          <div className="d-flex justify-content-end gap-3">
            <Button
              variant="outline-secondary"
              onClick={() => navigate("/patients")}
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
    </div>
  );
};

export default PatientForm;