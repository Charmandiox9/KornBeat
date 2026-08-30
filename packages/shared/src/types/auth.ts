export interface User {
  _id: string;
  username: string;
  name: string;
  email: string;
  country?: string | null;
  date_of_birth?: string | null;
  is_premium: boolean;
  es_artist: boolean;
  artist_name?: string | null;
  isAdmin: boolean;
  date_of_register: string | Date;
  active: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
  sessionId: string;
}

export interface RegisterResponse extends AuthResponse {
  message: string;
}

export interface SessionInfo {
  user_id: string;
  email: string;
  name: string;
  role: 'premium' | 'free';
  created_at: string;
  last_activity: string;
}

export interface JwtPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}
