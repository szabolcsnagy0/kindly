export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string;
  about_me: string;
  is_volunteer: boolean;
  avg_rating?: number;
  created_at: string;
  updated_at: string;
  level: number;
  experience: number;
  experience_to_next_level: number;
  badges: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  date_of_birth: string;
  about_me: string;
  is_volunteer: boolean;
}

export interface RegisterFormInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  date_of_birth: string;
  about_me: string;
  is_volunteer: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  access_token: string;
}
