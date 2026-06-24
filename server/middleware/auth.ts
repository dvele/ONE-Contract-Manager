import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const COGNITO_REGION = process.env.VITE_COGNITO_REGION || "us-west-1";
const COGNITO_USER_POOL_ID = process.env.VITE_COGNITO_USER_POOL_ID!;

declare global {
  namespace Express {
    interface Request {
      organizationId: number;
      user: {
        id?: number;
        email?: string;
        role: string;
      };
    }
  }
}

const client = jwksClient({
  jwksUri: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid!, (err, key) => {
    callback(err, key?.getPublicKey());
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }

  const token = authHeader.slice(7);

  jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
    if (err || !decoded || typeof decoded === "string") {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    const groups: string[] = (decoded["cognito:groups"] as string[]) ?? [];
    req.user = {
      email: decoded["email"] as string,
      role: groups.includes("admin") ? "admin" : "user",
    };
    req.organizationId = 1; // until multi-org is needed
    next();
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden - Admin access required" });
  }
  next();
}
