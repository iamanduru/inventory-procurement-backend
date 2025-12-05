import { NextFunction, Request, Response } from "express";
import { verifyJwt, JwtPayload } from "../utils/jwt";

export interface AuthUser {
    id: string;
    role: string;
    mustChangePassword: boolean;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

//Basic Auth middleware to read JWT from Authorization header
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Missing or invalid Authorization header."
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  try {
    const payload: JwtPayload = verifyJwt(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword
    };
    next();
  } catch (error) {
    console.error("[authMiddleware] JWT verification failed", error);
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token."
    });
  }
}

//Require that a user is authenticated
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required."
    });
  }
  next();
}

//Enforce that user has one of the allowed roles
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required."
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to perform this action."
      });
    }

    next();
  };
}

//Enforce that user has changed password before accessing protected areas.


export function requireNonFirstLogin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required."
    });
  }

  if (req.user.mustChangePassword) {
    return res.status(403).json({
      success: false,
      error: "You must change your password before accessing this resource."
    });
  }

  next();
}