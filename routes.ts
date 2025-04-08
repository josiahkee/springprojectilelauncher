import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { calculateInputSchema, insertCalculationSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all saved calculations
  app.get("/api/calculations", async (req, res) => {
    try {
      const calculations = await storage.getCalculations();
      res.json(calculations);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve calculations" });
    }
  });

  // Save a calculation
  app.post("/api/calculations", async (req, res) => {
    try {
      const calculation = insertCalculationSchema.parse(req.body);
      const savedCalculation = await storage.saveCalculation(calculation);
      res.status(201).json(savedCalculation);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to save calculation" });
      }
    }
  });

  // Calculate spring contraction distance
  app.post("/api/calculate", (req, res) => {
    try {
      const input = calculateInputSchema.parse(req.body);
      
      let contractionDistance: number;
      let targetDistance: number;
      const targetType = 'custom';
      let targetX: number | undefined;
      let targetY: number | undefined;

      if (input.customTargetX !== undefined && input.customTargetY !== undefined) {
        targetX = input.customTargetX;
        targetY = input.customTargetY;
        
        // Calculate distance for display purposes
        const distanceX = targetX;
        const distanceY = Math.abs(targetY - 100);
        targetDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY) / 100;
        
        if (input.angleSetting === 'acute') {
          // Experimental values for acute angle (65°):
          // - 12cm contraction for 0cm distance from start line
          // - 13cm for front corners
          // - 14cm for 100cm distance center
          // - 15cm for 100cm at corners
          
          // Linear equation based on X position (depth)
          contractionDistance = 12 + (targetX / 100) * 2;
          
          // Add adjustment for side positions (if far from center line)
          const sideDistanceFactor = Math.min(Math.abs(targetY - 100) / 100, 1.0);
          contractionDistance += sideDistanceFactor;
          
          // Cap at max contraction
          contractionDistance = Math.min(contractionDistance, 15.0);
        } else {
          // Experimental values for obtuse angle (35°):
          // - 9.5cm for front line
          // - 15cm for back line (200cm)
          // - Add 1cm when at sides
          
          // Linear equation for depth
          contractionDistance = 9.5 + (targetX / 200) * 5.5;
          
          // Add adjustment for side positions
          if (Math.abs(targetY - 100) > 75) {
            contractionDistance += 1.0;
          }
        }
        
        // Round to 1 decimal place
        contractionDistance = Math.round(contractionDistance * 10) / 10;
      } else {
        contractionDistance = 0;
        targetDistance = 0;
      }

      res.json({
        contractionDistance,
        targetDistance,
        angleSetting: input.angleSetting,
        targetType,
        targetX,
        targetY
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Calculation failed" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
