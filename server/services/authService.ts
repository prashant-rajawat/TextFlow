import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRecord } from '../db/userStore';

const JWT_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'textflow-auth-dev-secret-key-3155';
const TOKEN_EXPIRATION = '7d';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface JwtPayload {
  id: string;
  name: string;
  email: string;
}

export const authService = {
  /**
   * Hashes a raw password securely using bcrypt.
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  },

  /**
   * Compares a raw password against a stored hash.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  /**
   * Signs a secure JWT for authenticated session.
   */
  generateToken(user: { id: string; name: string; email: string }): string {
    return jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRATION }
    );
  },

  /**
   * Verifies and decodes a JWT token.
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      return decoded;
    } catch {
      return null;
    }
  },

  /**
   * Returns sanitized public user object without sensitive fields.
   */
  getSafeUser(user: UserRecord): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  },

  /**
   * Validates name requirement.
   */
  validateName(name: any): string | null {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return 'Full Name is required.';
    }
    if (name.trim().length > 100) {
      return 'Full Name cannot exceed 100 characters.';
    }
    return null;
  },

  /**
   * Validates email format.
   */
  validateEmail(email: any): string | null {
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return 'Email address is required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    return null;
  },

  /**
   * Validates password strength according to spec:
   * - Min 8 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   * - At least one special character
   */
  validatePassword(password: any): string | null {
    if (!password || typeof password !== 'string') {
      return 'Password is required.';
    }
    if (password.length < 8) {
      return 'Password must contain at least 8 characters.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter.';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter.';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number.';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one special character.';
    }
    return null;
  }
};
