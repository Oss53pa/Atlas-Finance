
/**
 * ToolRegistry — Registry centralisé de tous les tools PROPH3T.
 *
 * Chaque tool est un objet { schema, execute } enregistré par nom.
 * Le registry expose getToolSchemas() pour le LLM et executeTool() pour l'orchestrateur.
 */
import type { DataAdapter } from '@atlas/data';
import type { LLMTool } from '../../proph3t/providers/ILLMProvider';

export interface ToolDefinition {
  schema: LLMTool;
  execute: (args: Record<string, unknown>, adapter?: DataAdapter) => Promise<string>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(name: string, def: ToolDefinition): void {
    this.tools.set(name, def);
  }

  registerAll(defs: Record<string, ToolDefinition>): void {
    for (const [name, def] of Object.entries(defs)) {
      this.tools.set(name, def);
    }
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  getToolSchemas(): LLMTool[] {
    return Array.from(this.tools.values()).map(t => t.schema);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  async executeTool(name: string, args: Record<string, unknown>, adapter?: DataAdapter): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      return JSON.stringify({ error: `Outil inconnu: ${name}` });
    }
    try {
      return await tool.execute(args, adapter);
    } catch (error) {
      return JSON.stringify({
        error: `Erreur d'exécution ${name}: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  get size(): number {
    return this.tools.size;
  }
}

/** Singleton global */
export const toolRegistry = new ToolRegistry();
