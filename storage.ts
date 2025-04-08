import { calculations, type Calculation, type InsertCalculation } from "@shared/schema";

export interface IStorage {
  getCalculations(): Promise<Calculation[]>;
  saveCalculation(calculation: InsertCalculation): Promise<Calculation>;
}

export class MemStorage implements IStorage {
  private calculations: Map<number, Calculation>;
  private currentId: number;

  constructor() {
    this.calculations = new Map();
    this.currentId = 1;
  }

  async getCalculations(): Promise<Calculation[]> {
    return Array.from(this.calculations.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async saveCalculation(insertCalculation: InsertCalculation): Promise<Calculation> {
    const id = this.currentId++;
    const calculation: Calculation = { ...insertCalculation, id };
    this.calculations.set(id, calculation);
    return calculation;
  }
}

export const storage = new MemStorage();
