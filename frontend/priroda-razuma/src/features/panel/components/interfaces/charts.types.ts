export interface PatientResponse {
    date: string;
    patient_count: number;
}

export interface UserResponse {
    date: string;
    users_count: number;
}

export interface DocumentResponse {
    date: string;
    count: number;
}

export interface RoleResponse {
    role: string;
    count: number;
}

export interface SubdirectoryResponse {
    subdirectory: string;
    count: number;
}

export interface ChartProps {
    dateRange: 'week' | 'month' | 'quarter' | 'year';
}

export interface ApiErrorResponse {
    detail?: string;
}

export interface PersonalDataModalProps {
    show: boolean;
    onHide: () => void;
    onPhotoUpdate: () => void;
}