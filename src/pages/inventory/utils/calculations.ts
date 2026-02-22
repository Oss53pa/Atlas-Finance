// Inventory Calculation Utilities
// Compliant with IFRS IAS 2, US GAAP ASC 330, and SYSCOHADA

import { CostLayer, ValuationMethod, InventoryTurnover, ABCAnalysis } from '../types';
import { Money } from '@/utils/money';

export class InventoryCalculations {

  /**
   * Calculate inventory value using specified valuation method
   */
  static calculateInventoryValue(
    costLayers: CostLayer[],
    quantityToValue: number,
    method: ValuationMethod
  ): { unitCost: number; totalCost: number; remainingLayers: CostLayer[] } {

    if (quantityToValue <= 0) {
      return { unitCost: 0, totalCost: 0, remainingLayers: costLayers };
    }

    const sortedLayers = [...costLayers].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let totalCost = 0;
    let remainingQuantity = quantityToValue;
    let remainingLayers: CostLayer[] = [];
    let totalQuantityValued = 0;

    switch (method) {
      case 'FIFO':
        for (const layer of sortedLayers) {
          if (remainingQuantity <= 0) {
            remainingLayers.push(layer);
            continue;
          }

          if (layer.quantity <= remainingQuantity) {
            totalCost += layer.totalCost;
            totalQuantityValued += layer.quantity;
            remainingQuantity -= layer.quantity;
          } else {
            const partialCost = (layer.totalCost / layer.quantity) * remainingQuantity;
            totalCost += partialCost;
            totalQuantityValued += remainingQuantity;

            // Create remaining layer
            const remainingLayerQuantity = layer.quantity - remainingQuantity;
            remainingLayers.push({
              ...layer,
              quantity: remainingLayerQuantity,
              totalCost: layer.totalCost - partialCost
            });

            remainingQuantity = 0;
          }
        }
        break;

      case 'LIFO':
        const reversedLayers = [...sortedLayers].reverse();
        for (const layer of reversedLayers) {
          if (remainingQuantity <= 0) {
            remainingLayers.unshift(layer);
            continue;
          }

          if (layer.quantity <= remainingQuantity) {
            totalCost += layer.totalCost;
            totalQuantityValued += layer.quantity;
            remainingQuantity -= layer.quantity;
          } else {
            const partialCost = (layer.totalCost / layer.quantity) * remainingQuantity;
            totalCost += partialCost;
            totalQuantityValued += remainingQuantity;

            // Create remaining layer
            const remainingLayerQuantity = layer.quantity - remainingQuantity;
            remainingLayers.unshift({
              ...layer,
              quantity: remainingLayerQuantity,
              totalCost: layer.totalCost - partialCost
            });

            remainingQuantity = 0;
          }
        }
        break;

      case 'WEIGHTED_AVERAGE':
        const totalLayerQuantity = sortedLayers.reduce((sum, layer) => sum + layer.quantity, 0);
        const totalLayerCost = sortedLayers.reduce((sum, layer) => sum + layer.totalCost, 0);

        if (totalLayerQuantity > 0) {
          const averageUnitCost = totalLayerCost / totalLayerQuantity;
          totalCost = averageUnitCost * quantityToValue;
          totalQuantityValued = quantityToValue;

          // Distribute remaining quantity proportionally across layers
          const remainingTotalQuantity = totalLayerQuantity - quantityToValue;
          if (remainingTotalQuantity > 0) {
            remainingLayers = sortedLayers.map(layer => ({
              ...layer,
              quantity: layer.quantity * (remainingTotalQuantity / totalLayerQuantity),
              totalCost: layer.totalCost * (remainingTotalQuantity / totalLayerQuantity)
            })).filter(layer => layer.quantity > 0);
          }
        }
        break;

      case 'SPECIFIC_IDENTIFICATION':
        // For specific identification, layers should have specific identifiers
        // This is a simplified implementation
        for (const layer of sortedLayers) {
          if (remainingQuantity <= 0) {
            remainingLayers.push(layer);
            continue;
          }

          if (layer.quantity <= remainingQuantity) {
            totalCost += layer.totalCost;
            totalQuantityValued += layer.quantity;
            remainingQuantity -= layer.quantity;
          } else {
            const partialCost = (layer.totalCost / layer.quantity) * remainingQuantity;
            totalCost += partialCost;
            totalQuantityValued += remainingQuantity;

            remainingLayers.push({
              ...layer,
              quantity: layer.quantity - remainingQuantity,
              totalCost: layer.totalCost - partialCost
            });

            remainingQuantity = 0;
          }
        }
        break;

      case 'STANDARD_COST':
        // For standard cost, use the most recent standard cost
        const latestLayer = sortedLayers[sortedLayers.length - 1];
        if (latestLayer) {
          const standardUnitCost = latestLayer.unitCost;
          totalCost = standardUnitCost * quantityToValue;
          totalQuantityValued = quantityToValue;
          remainingLayers = [...sortedLayers];
        }
        break;
    }

    const unitCost = totalQuantityValued > 0 ? totalCost / totalQuantityValued : 0;

    return {
      unitCost,
      totalCost,
      remainingLayers
    };
  }

  /**
   * Calculate Lower of Cost or Market (LCM) / Net Realizable Value (NRV)
   */
  static calculateLCM(
    cost: number,
    marketValue: number,
    estimatedSellingPrice: number,
    estimatedCostsToComplete: number,
    estimatedCostsToSell: number,
    method: 'US_GAAP' | 'IFRS'
  ): { lcmValue: number; impairmentLoss: number; method: string } {

    const nrv = estimatedSellingPrice - estimatedCostsToComplete - estimatedCostsToSell;

    let lcmValue: number;
    let methodUsed: string;

    if (method === 'US_GAAP') {
      // US GAAP: Lower of Cost or Market
      // Market is replacement cost, but not more than NRV and not less than NRV minus normal profit margin
      const normalProfitMargin = estimatedSellingPrice * 0.1; // Assume 10% normal profit margin
      const floor = nrv - normalProfitMargin;
      const ceiling = nrv;

      const market = Math.min(Math.max(marketValue, floor), ceiling);
      lcmValue = Math.min(cost, market);
      methodUsed = 'LCM (US GAAP ASC 330)';
    } else {
      // IFRS: Lower of Cost or Net Realizable Value
      lcmValue = Math.min(cost, nrv);
      methodUsed = 'Cost vs NRV (IFRS IAS 2)';
    }

    const impairmentLoss = Math.max(0, cost - lcmValue);

    return {
      lcmValue,
      impairmentLoss,
      method: methodUsed
    };
  }

  /**
   * Calculate inventory turnover ratio
   */
  static calculateTurnover(
    costOfGoodsSold: number,
    beginningInventory: number,
    endingInventory: number
  ): InventoryTurnover['turnoverRatio'] & { daysInInventory: number } {

    const averageInventory = (beginningInventory + endingInventory) / 2;
    const turnoverRatio = averageInventory > 0 ? costOfGoodsSold / averageInventory : 0;
    const daysInInventory = turnoverRatio > 0 ? 365 / turnoverRatio : 0;

    return {
      turnoverRatio: new Money(turnoverRatio).round().toNumber(),
      daysInInventory: new Money(daysInInventory).round(0).toNumber()
    };
  }

  /**
   * Perform ABC Analysis (Pareto Analysis)
   */
  static performABCAnalysis(
    items: Array<{
      itemId: string;
      sku: string;
      name: string;
      annualUsage: number;
      unitCost: number;
    }>
  ): ABCAnalysis['items'] {

    // Calculate annual value for each item
    const itemsWithValue = items.map(item => ({
      ...item,
      annualValue: item.annualUsage * item.unitCost
    }));

    // Sort by annual value descending
    itemsWithValue.sort((a, b) => b.annualValue - a.annualValue);

    // Calculate total value
    const totalValue = itemsWithValue.reduce((sum, item) => sum + item.annualValue, 0);

    // Calculate percentages and classify
    let cumulativeValue = 0;

    return itemsWithValue.map(item => {
      cumulativeValue += item.annualValue;
      const percentageOfTotal = totalValue > 0 ? (item.annualValue / totalValue) * 100 : 0;
      const cumulativePercentage = totalValue > 0 ? (cumulativeValue / totalValue) * 100 : 0;

      let classification: 'A' | 'B' | 'C';
      if (cumulativePercentage <= 80) {
        classification = 'A';
      } else if (cumulativePercentage <= 95) {
        classification = 'B';
      } else {
        classification = 'C';
      }

      // Calculate turnover metrics (simplified)
      const averageInventory = item.unitCost * 30; // Assume 30 days of inventory
      const turnoverRatio = averageInventory > 0 ? (item.annualUsage * item.unitCost) / averageInventory : 0;
      const daysInInventory = turnoverRatio > 0 ? 365 / turnoverRatio : 0;

      return {
        itemId: item.itemId,
        sku: item.sku,
        name: item.name,
        annualUsage: item.annualUsage,
        unitCost: item.unitCost,
        annualValue: item.annualValue,
        percentageOfTotal: new Money(percentageOfTotal).round().toNumber(),
        cumulativePercentage: new Money(cumulativePercentage).round().toNumber(),
        classification,
        turnoverRatio: new Money(turnoverRatio).round().toNumber(),
        daysInInventory: new Money(daysInInventory).round(0).toNumber()
      };
    });
  }

  /**
   * Calculate reorder point using various methods
   */
  static calculateReorderPoint(
    averageDemand: number, // units per day
    leadTimeDays: number,
    safetyStock: number,
    demandVariability?: number, // standard deviation of demand
    leadTimeVariability?: number // standard deviation of lead time
  ): number {

    const basicReorderPoint = (averageDemand * leadTimeDays) + safetyStock;

    // If variability data is available, use more sophisticated calculation
    if (demandVariability && leadTimeVariability) {
      const demandDuringLeadTime = averageDemand * leadTimeDays;
      const varianceDemandDuringLeadTime =
        (leadTimeDays * Math.pow(demandVariability, 2)) +
        (Math.pow(averageDemand, 2) * Math.pow(leadTimeVariability, 2));

      const standardDeviationDemandDuringLeadTime = Math.sqrt(varianceDemandDuringLeadTime);

      // Assuming 95% service level (z = 1.645)
      const serviceLevel = 1.645;
      const calculatedSafetyStock = serviceLevel * standardDeviationDemandDuringLeadTime;

      return Math.ceil(demandDuringLeadTime + calculatedSafetyStock);
    }

    return Math.ceil(basicReorderPoint);
  }

  /**
   * Calculate Economic Order Quantity (EOQ)
   */
  static calculateEOQ(
    annualDemand: number,
    orderingCost: number,
    holdingCostPerUnit: number
  ): { eoq: number; totalCost: number; orderFrequency: number } {

    if (holdingCostPerUnit <= 0 || annualDemand <= 0) {
      return { eoq: 0, totalCost: 0, orderFrequency: 0 };
    }

    const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
    const totalCost = Math.sqrt(2 * annualDemand * orderingCost * holdingCostPerUnit);
    const orderFrequency = annualDemand / eoq;

    return {
      eoq: Math.ceil(eoq),
      totalCost: new Money(totalCost).round().toNumber(),
      orderFrequency: new Money(orderFrequency).round().toNumber()
    };
  }

  /**
   * Calculate inventory aging buckets
   */
  static calculateInventoryAging(
    items: Array<{
      itemId: string;
      sku: string;
      name: string;
      quantity: number;
      unitCost: number;
      lastMovementDate: string;
    }>,
    asOfDate: string = new Date().toISOString()
  ): Array<{
    itemId: string;
    sku: string;
    name: string;
    quantity: number;
    value: number;
    daysOld: number;
    agingBucket: '0-30' | '31-60' | '61-90' | '91-180' | '181-365' | '365+';
  }> {

    const asOf = new Date(asOfDate);

    return items.map(item => {
      const lastMovement = new Date(item.lastMovementDate);
      const daysOld = Math.floor((asOf.getTime() - lastMovement.getTime()) / (1000 * 60 * 60 * 24));

      let agingBucket: '0-30' | '31-60' | '61-90' | '91-180' | '181-365' | '365+';

      if (daysOld <= 30) {
        agingBucket = '0-30';
      } else if (daysOld <= 60) {
        agingBucket = '31-60';
      } else if (daysOld <= 90) {
        agingBucket = '61-90';
      } else if (daysOld <= 180) {
        agingBucket = '91-180';
      } else if (daysOld <= 365) {
        agingBucket = '181-365';
      } else {
        agingBucket = '365+';
      }

      return {
        itemId: item.itemId,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        value: item.quantity * item.unitCost,
        daysOld,
        agingBucket
      };
    });
  }

  /**
   * Calculate shrinkage rate
   */
  static calculateShrinkage(
    bookQuantity: number,
    physicalQuantity: number,
    bookValue: number
  ): { quantityShrinkage: number; valueShrinkage: number; shrinkageRate: number } {

    const quantityShrinkage = bookQuantity - physicalQuantity;
    const unitValue = bookQuantity > 0 ? bookValue / bookQuantity : 0;
    const valueShrinkage = quantityShrinkage * unitValue;
    const shrinkageRate = bookValue > 0 ? (valueShrinkage / bookValue) * 100 : 0;

    return {
      quantityShrinkage,
      valueShrinkage,
      shrinkageRate: new Money(shrinkageRate).round().toNumber()
    };
  }

  /**
   * Convert between units of measure
   */
  static convertUnits(
    quantity: number,
    fromUnit: string,
    toUnit: string,
    conversionFactors: Record<string, number>
  ): number {

    if (fromUnit === toUnit) {
      return quantity;
    }

    const fromFactor = conversionFactors[fromUnit] || 1;
    const toFactor = conversionFactors[toUnit] || 1;

    // Convert to base unit first, then to target unit
    const baseQuantity = quantity * fromFactor;
    const convertedQuantity = baseQuantity / toFactor;

    return new Money(convertedQuantity).round(6).toNumber();
  }

  /**
   * Calculate carrying cost
   */
  static calculateCarryingCost(
    averageInventoryValue: number,
    carryingCostRate: number // annual percentage
  ): { annualCarryingCost: number; monthlyCarryingCost: number; dailyCarryingCost: number } {

    const annualCarryingCost = averageInventoryValue * (carryingCostRate / 100);
    const monthlyCarryingCost = annualCarryingCost / 12;
    const dailyCarryingCost = annualCarryingCost / 365;

    return {
      annualCarryingCost: new Money(annualCarryingCost).round().toNumber(),
      monthlyCarryingCost: new Money(monthlyCarryingCost).round().toNumber(),
      dailyCarryingCost: new Money(dailyCarryingCost).round().toNumber()
    };
  }
}