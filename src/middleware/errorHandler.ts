import { NextFunction, Request, Response } from "express";
import { success } from "zod";

export interface ApiError extends Error {
    statusCode?: number;
}

export function errorHandler(
    err: ApiError,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    console.error(err);

    const status = err.statusCode || 500;
    const message = err.message || "An unexpected error occurred. Please try again later"

    res.status(status).json({
        success: false,
        error: message
    });
}