// src/routes/auth.routes.ts
import { Router, Request, Response } from "express";
import prisma from "../config/prisma";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword
} from "../utils/password";
import { signJwt } from "../utils/jwt";
import { authMiddleware, requireAuth } from "../middleware/auth";
import { isValidEmail } from "../utils/validation";

const router = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Log in a user and return a JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       400:
 *         description: Missing or invalid input.
 *       401:
 *         description: Invalid credentials.
 */
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required."
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: "Invalid email format."
    });
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      error: "Invalid credentials."
    });
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return res.status(401).json({
      success: false,
      error: "Invalid credentials."
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  const token = signJwt({
    sub: user.id,
    role: user.role,
    mustChangePassword: user.mustChangePassword
  });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      mustChangePassword: user.mustChangePassword,
      canChangePassword: user.canChangePassword,
      isActive: user.isActive
    }
  });
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get current authenticated user.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the current user.
 *       401:
 *         description: Not authenticated.
 *       404:
 *         description: User not found.
 */
router.get(
  "/me",
  authMiddleware,
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found."
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        mustChangePassword: user.mustChangePassword,
        canChangePassword: user.canChangePassword,
        isActive: user.isActive
      }
    });
  }
);

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Change the authenticated user's password.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password changed successfully.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Not authenticated.
 *       403:
 *         description: User not allowed to change password.
 */
router.post(
  "/change-password",
  authMiddleware,
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current password and new password are required."
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found."
      });
    }

    if (!user.canChangePassword) {
      return res.status(403).json({
        success: false,
        error: "This account is not allowed to change password."
      });
    }

    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({
        success: false,
        error: "Current password is incorrect."
      });
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return res.status(400).json({
        success: false,
        error: strengthError
      });
    }

    const hashed = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        mustChangePassword: false
      }
    });

    res.json({
      success: true,
      message: "Password changed successfully."
    });
  }
);

export default router;
