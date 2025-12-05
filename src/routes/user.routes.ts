// src/routes/user.routes.ts
import { Router, Request, Response } from "express";
import prisma from "../config/prisma";
import {
  authMiddleware,
  requireAuth,
  requireRole,
  requireNonFirstLogin
} from "../middleware/auth";
import { generateTempPassword } from "../utils/random";
import { hashPassword } from "../utils/password";
import { isValidEmail } from "../utils/validation";
import { sendEmail } from "../config/email";

const router = Router();

const ALLOWED_ROLES = [
  "ADMIN",
  "FINANCE",
  "PROCUREMENT",
  "STOREKEEPER",
  "DEPARTMENT_MANAGER",
  "STAFF"
];

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a new user (ADMIN only).
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - fullName
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum:
 *                   - ADMIN
 *                   - FINANCE
 *                   - PROCUREMENT
 *                   - STOREKEEPER
 *                   - DEPARTMENT_MANAGER
 *                   - STAFF
 *               department:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Not authenticated.
 *       403:
 *         description: Forbidden.
 *       409:
 *         description: Email already exists.
 */
router.post(
  "/",
  authMiddleware,
  requireAuth,
  requireNonFirstLogin,
  requireRole(["ADMIN"]),
  async (req: Request, res: Response) => {
    const { email, fullName, role, department } = req.body as {
      email?: string;
      fullName?: string;
      role?: string;
      department?: string;
    };

    if (!email || !fullName || !role) {
      return res.status(400).json({
        success: false,
        error: "email, fullName and role are required."
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format."
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        error: "Invalid role."
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "A user with this email already exists."
      });
    }

    const tempPassword = generateTempPassword(14);
    const hashed = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        role: role as any,
        department: department || null,
        password: hashed,
        mustChangePassword: true,
        canChangePassword: true,
        isActive: true
      }
    });

    console.log(
      `[user.create] New user ${user.email} created with temporary password: ${tempPassword}`
    );

    try {
      await sendEmail({
        to: user.email,
        subject: "Your Inventory System Account",
        text: `Hello ${user.fullName},

An account has been created for you on the Inventory & Procurement System.

Login email: ${user.email}
Temporary password: ${tempPassword}

For security, you will be required to change this password immediately after your first login.

If you did not expect this account, please contact your system administrator.

Regards,
System Admin`,
        html: `<p>Hello ${user.fullName},</p>
<p>An account has been created for you on the <b>Inventory & Procurement System</b>.</p>
<p>
<b>Login email:</b> ${user.email}<br/>
<b>Temporary password:</b> ${tempPassword}
</p>
<p>For security, you will be required to change this password immediately after your first login.</p>
<p>If you did not expect this account, please contact your system administrator.</p>
<p>Regards,<br/>System Admin</p>`
      });
    } catch (err) {
      console.error("[user.create] Failed to send temp password email:", err);
    }

    res.status(201).json({
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
      },
      temporaryPassword: tempPassword
    });
  }
);

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: List users (ADMIN only).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of users.
 *       401:
 *         description: Not authenticated.
 *       403:
 *         description: Forbidden.
 */
router.get(
  "/",
  authMiddleware,
  requireAuth,
  requireNonFirstLogin,
  requireRole(["ADMIN"]),
  async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" }
    });

    res.json({
      success: true,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        department: u.department,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
        canChangePassword: u.canChangePassword,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt
      }))
    });
  }
);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get a single user (ADMIN only).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found.
 *       401:
 *         description: Not authenticated.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: User not found.
 */
router.get(
  "/:id",
  authMiddleware,
  requireAuth,
  requireNonFirstLogin,
  requireRole(["ADMIN"]),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
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
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        canChangePassword: user.canChangePassword,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  }
);

/**
 * @openapi
 * /api/users/{id}:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Update a user's role, department, or active status (ADMIN only).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               department:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated.
 *       400:
 *         description: Invalid role.
 *       401:
 *         description: Not authenticated.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: User not found.
 */
router.patch(
  "/:id",
  authMiddleware,
  requireAuth,
  requireNonFirstLogin,
  requireRole(["ADMIN"]),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role, department, isActive } = req.body as {
      role?: string;
      department?: string | null;
      isActive?: boolean;
    };

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found."
      });
    }

    const data: any = {};

    if (role !== undefined) {
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          error: "Invalid role."
        });
      }
      data.role = role;
    }

    if (department !== undefined) {
      data.department = department;
    }

    if (typeof isActive === "boolean") {
      data.isActive = isActive;
    }

    const updated = await prisma.user.update({
      where: { id },
      data
    });

    res.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        role: updated.role,
        department: updated.department,
        isActive: updated.isActive,
        mustChangePassword: updated.mustChangePassword,
        canChangePassword: updated.canChangePassword,
        createdAt: updated.createdAt,
        lastLoginAt: updated.lastLoginAt
      }
    });
  }
);

export default router;
