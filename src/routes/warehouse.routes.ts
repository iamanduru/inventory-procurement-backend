import { Router, Request, Response } from "express";
import prisma from "../config/prisma";
import {
  authMiddleware,
  requireAuth,
  requireNonFirstLogin,
  requireRole
} from "../middleware/auth";
import { StockMovementType } from "@prisma/client";

const router = Router();

const INVENTORY_ROLES = [
    "ADMIN",
    "STOREKEEPER",
    "PROCUREMENT"
];

/**
 * @openapi
 * /api/warehouses:
 *   post:
 *     tags:
 *       - Warehouses
 *     summary: Create a new warehouse/location.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Warehouse created.
 */

router.post(
    "/",
    authMiddleware,
    requireAuth,
    requireNonFirstLogin,
    requireRole(INVENTORY_ROLES),
    async (req: Request, res: Response) => {
        const { name, code, location, description} = req.body as {
            name?: string;
            code?: string;
            location?: string;
            description?: string;
        };

        if (!name || !code) {
            return res.status(400).json({
                success: false,
                error: "name and code are required"
            });
        }

        const existing = await prisma.warehouse.findUnique({
            where: { code }
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                error: "A warehouse with this code already exists."
            });
        }

        const warehouse = await prisma.warehouse.create({
            data: {
                name,
                code,
                location: location || null,
                description: description || null
            }
        });

        res.status(201).json({
            success: true,
            warehouse
        });
    }
);

/**
 * @openapi
 * /api/warehouses:
 *   get:
 *     tags:
 *       - Warehouses
 *     summary: List warehouses.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of warehouses.
 */
router.get(
  "/",
  authMiddleware,
  requireAuth,
  requireNonFirstLogin,
  requireRole(INVENTORY_ROLES),
  async (_req: Request, res: Response) => {
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    });

    res.json({
      success: true,
      warehouses
    });
  }
);

/**
 * @openapi
 * /api/warehouses/opening-stock:
 *   post:
 *     tags:
 *       - Warehouses
 *     summary: Record opening stock for an item in a warehouse.
 *     description: >
 *       Creates or updates the StockLevel and logs a StockMovement of type OPENING.
 *       Intended to be used once when setting up the system.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - warehouseId
 *               - quantity
 *             properties:
 *               itemId:
 *                 type: string
 *               warehouseId:
 *                 type: string
 *               quantity:
 *                 type: number
 *               reorderLevel:
 *                 type: number
 *     responses:
 *       200:
 *         description: Opening stock recorded.
 */
router.post(
  "/opening-stock",
  authMiddleware,
  requireAuth,
  requireNonFirstLogin,
  requireRole(INVENTORY_ROLES),
  async (req: Request, res: Response) => {
    const { itemId, warehouseId, quantity, reorderLevel } = req.body as {
      itemId?: string;
      warehouseId?: string;
      quantity?: number;
      reorderLevel?: number;
    };

    if (!itemId || !warehouseId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: "itemId, warehouseId and quantity are required."
      });
    }

    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        error: "quantity cannot be negative."
      });
    }

    // Ensure item and warehouse exist
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item || !item.isActive) {
      return res.status(400).json({
        success: false,
        error: "Invalid or inactive itemId."
      });
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId }
    });
    if (!warehouse || !warehouse.isActive) {
      return res.status(400).json({
        success: false,
        error: "Invalid or inactive warehouseId."
      });
    }

    // Upsert stock level
    const stockLevel = await prisma.stockLevel.upsert({
      where: {
        itemId_warehouseId: {
          itemId,
          warehouseId
        }
      },
      update: {
        quantity,
        reorderLevel: reorderLevel ?? 0
      },
      create: {
        itemId,
        warehouseId,
        quantity,
        reorderLevel: reorderLevel ?? 0
      }
    });

    // Log stock movement
    await prisma.stockMovement.create({
      data: {
        itemId,
        warehouseId,
        quantity,
        movementType: StockMovementType.OPENING,
        referenceType: "OPENING_STOCK",
        referenceId: null,
        remarks: "Opening stock",
        createdById: req.user!.id
      }
    });

    res.json({
      success: true,
      stockLevel
    });
  }
);

/**
 * @openapi
 * /api/warehouses/stock:
 *   get:
 *     tags:
 *       - Warehouses
 *     summary: List stock levels for all items per warehouse.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: warehouseId
 *         schema:
 *           type: string
 *       - in: query
 *         name: itemId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of stock levels.
 */
router.get(
  "/stock",
  authMiddleware,
  requireAuth,
  requireNonFirstLogin,
  requireRole(INVENTORY_ROLES),
  async (req: Request, res: Response) => {
    const { warehouseId, itemId } = req.query as {
      warehouseId?: string;
      itemId?: string;
    };

    const where: any = {};

    if (warehouseId) where.warehouseId = warehouseId;
    if (itemId) where.itemId = itemId;

    const stock = await prisma.stockLevel.findMany({
      where,
      include: {
        item: true,
        warehouse: true
      },
      orderBy: [
        { warehouse: { name: "asc" } },
        { item: { name: "asc" } }
      ]
    });

    res.json({
      success: true,
      stock
    });
  }
);

export default router;