export interface User {
  id: number;
  fio: string;
  login: string;
  active: boolean;
  role_id: number;
  role?: Role;
  created_at?: Date;
}

export interface Role {
  id: number;
  name: string;
}
