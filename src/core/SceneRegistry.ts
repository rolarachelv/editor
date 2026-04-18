import { EventBus } from './EventBus';

/**
 * NodeRenderer interface — every renderer must implement this contract.
 * See .claude/rules/renderers.md for conventions.
 */
export interface NodeRenderer<T = unknown> {
  readonly type: string;
  render(node: T, context: RendererContext): void;
  dispose?(node: T): void;
}

export interface RendererContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface SceneNode {
  id: string;
  type: string;
  layerId: string;
  data: unknown;
  visible: boolean;
  zIndex: number;
}

/**
 * SceneRegistry maintains the mapping between node types and their renderers,
 * and holds the authoritative list of scene nodes.
 *
 * Usage:
 *   const registry = new SceneRegistry(eventBus);
 *   registry.registerRenderer(new WallRenderer());
 *   registry.addNode({ id: 'w1', type: 'wall', ... });
 */
export class SceneRegistry {
  private renderers = new Map<string, NodeRenderer>();
  private nodes = new Map<string, SceneNode>();

  constructor(private readonly eventBus: EventBus) {}

  // ── Renderers ────────────────────────────────────────────────────────────

  registerRenderer(renderer: NodeRenderer): void {
    if (this.renderers.has(renderer.type)) {
      console.warn(`[SceneRegistry] Overwriting renderer for type "${renderer.type}"`);
    }
    this.renderers.set(renderer.type, renderer);
    this.eventBus.emit('registry:rendererRegistered', { type: renderer.type });
  }

  unregisterRenderer(type: string): void {
    this.renderers.delete(type);
    this.eventBus.emit('registry:rendererUnregistered', { type });
  }

  getRenderer(type: string): NodeRenderer | undefined {
    return this.renderers.get(type);
  }

  // ── Nodes ────────────────────────────────────────────────────────────────

  addNode(node: SceneNode): void {
    this.nodes.set(node.id, node);
    this.eventBus.emit('registry:nodeAdded', { nodeId: node.id, type: node.type });
  }

  removeNode(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;

    const renderer = this.renderers.get(node.type);
    renderer?.dispose?.(node.data);

    this.nodes.delete(id);
    this.eventBus.emit('registry:nodeRemoved', { nodeId: id });
  }

  updateNode(id: string, patch: Partial<Omit<SceneNode, 'id'>>): void {
    const existing = this.nodes.get(id);
    if (!existing) {
      console.warn(`[SceneRegistry] updateNode: node "${id}" not found`);
      return;
    }
    this.nodes.set(id, { ...existing, ...patch, id });
    this.eventBus.emit('registry:nodeUpdated', { nodeId: id });
  }

  getNode(id: string): SceneNode | undefined {
    return this.nodes.get(id);
  }

  /** Returns nodes sorted by zIndex, filtered to visible only. */
  getRenderList(layerId?: string): SceneNode[] {
    return Array.from(this.nodes.values())
      .filter(n => n.visible && (layerId == null || n.layerId === layerId))
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  clear(): void {
    for (const id of this.nodes.keys()) {
      this.removeNode(id);
    }
  }
}
