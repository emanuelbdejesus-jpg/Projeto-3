
export type ToolModel = 'T45' | 'T50' | 'T51';

export type ToolType = 'Punho' | 'Haste' | "Bit 3,5''" | "Bit 4,5''";

export type TeamType = 'Turma A' | 'Turma B' | 'Turma C' | 'Turma D';

export interface Tool {
  id: string;
  model: ToolModel;
  type: ToolType;
  quantity: number;
  minThreshold: number;
}

export interface Withdrawal {
  id: string;
  date: string;
  toolId: string;
  toolName: string;
  quantity: number;
  reason: string;
  supervisor: string;
  operator: string;
  rigTag: string;
  team: TeamType;
}

export interface DashboardStats {
  totalTools: number;
  lowStockCount: number;
  withdrawalsToday: number;
  mostUsedModel: ToolModel | 'N/A';
}
