import { UserRole } from './enums';

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
