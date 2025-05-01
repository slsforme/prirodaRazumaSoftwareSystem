export interface Patient {
  id: number;
  fio: string;
  date_of_birth: string; 
  age: number;
  created_at: string;
  updated_at: string;
}

export interface PatientFormData {
  lastName: string;
  firstName: string;
  patronymic: string;
  birthDate: Date | null;
}

export type FormErrors = {
  lastName?: string;
  firstName?: string;
  patronymic?: string;
  birthDate?: string;
};

export interface ApiErrorResponse {
  detail?: string;
}

export interface ApiErrorResponse {
  detail?: string;
}
