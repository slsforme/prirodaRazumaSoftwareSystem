export interface Document {
  id: number;
  name: string;
  patient_id: number;
  subdirectory_type: string;
  author_id?: number;
}

export enum SubDirectories {
  DIAGNOSTICS = "Диагностика",
  ANAMNESIS = "Анамнез",
  WORK_PLAN = "План работы",
  COMMENTS = "Комментарии специалистов",
  PHOTOS_AND_VIDEOS = "Фотографии и Видео",
}

export interface DocumentFormData {
  name: string;
  file: File | null;
  subdirectory_type: SubDirectories;
  patient_id: number;
}