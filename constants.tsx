
import { Tool } from './types';

export const INITIAL_INVENTORY: Tool[] = [
  // T51
  { id: 't51-punho', model: 'T51', type: 'Punho', quantity: 15, minThreshold: 5 },
  { id: 't51-haste', model: 'T51', type: 'Haste', quantity: 20, minThreshold: 8 },
  { id: 't51-bit35', model: 'T51', type: "Bit 3,5''", quantity: 30, minThreshold: 10 },
  { id: 't51-bit45', model: 'T51', type: "Bit 4,5''", quantity: 25, minThreshold: 10 },
  
  // T50
  { id: 't50-punho', model: 'T50', type: 'Punho', quantity: 10, minThreshold: 3 },
  { id: 't50-haste', model: 'T50', type: 'Haste', quantity: 12, minThreshold: 4 },
  { id: 't50-bit45', model: 'T50', type: "Bit 4,5''", quantity: 18, minThreshold: 6 },
  
  // T45
  { id: 't45-punho', model: 'T45', type: 'Punho', quantity: 12, minThreshold: 4 },
  { id: 't45-haste', model: 'T45', type: 'Haste', quantity: 15, minThreshold: 5 },
  { id: 't45-bit35', model: 'T45', type: "Bit 3,5''", quantity: 22, minThreshold: 8 },
  { id: 't45-bit45', model: 'T45', type: "Bit 4,5''", quantity: 20, minThreshold: 8 },
];

export const REASONS = [
  'Desgaste',
  'Quebra em operação',
  'Preso no Furo',
  'Trinca',
  'Haste empenada',
  'Completar carrosel'
];

export const SUPERVISORS = [
  'Emanuel',
  'Edson',
  'Leandro',
  'Henrique'
];

export const RIG_TAGS = [
  'PH14',
  'PH21',
  'PH22',
  'PH24'
];
