// src/utils/jwt.ts
import jwt from "jsonwebtoken";
import { ENV } from "../config/env";

export interface JwtPayload {
  sub: string; // user id
  role: string;
  mustChangePassword: boolean;
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN
  });
}

export function verifyJwt(token: string): JwtPayload {
  const decoded = jwt.verify(token, ENV.JWT_SECRET);
  return decoded as JwtPayload;
}
