import { EventBus } from './EventBus';

/**
 * Represents a single layer in the scene.
 * Layers control rendering order and visibility of nodes.
 */
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  /** Z-order index; higher values render on top */
  zIndex: number;
  nodeIds: Set<string>;
}

export interface LayerManagerEvents {
  'layer:added': { layer: Layer };
  'layer:removed': { layerId: string };
  'layer:updated': { layer: Layer };
  'layer:reordered': { layers: Layer[] };
  'node:layer-changed': { nodeId: string; fromLayerId: string; toLayerId: string };
}

/**
 * Manages the ordered collection of layers in the scene.
 * Emits events via EventBus when layers are mutated.
 */
export class LayerManager {
  private layers: Map<string, Layer> = new Map();
  private order: string[] = []; // layer ids in ascending z-order
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  addLayer(id: string, name: string): Layer {
    if (this.layers.has(id)) {
      throw new Error(`Layer with id "${id}" already exists.`);
    }
    const layer: Layer = {
      id,
      name,
      visible: true,
      locked: false,
      zIndex: this.order.length,
      nodeIds: new Set(),
    };
    this.layers.set(id, layer);
    this.order.push(id);
    this.eventBus.emit('layer:added', { layer });
    return layer;
  }

  removeLayer(layerId: string): void {
    if (!this.layers.has(layerId)) {
      throw new Error(`Layer "${layerId}" not found.`);
    }
    this.layers.delete(layerId);
    this.order = this.order.filter((id) => id !== layerId);
    this.recomputeZIndices();
    this.eventBus.emit('layer:removed', { layerId });
  }

  getLayer(layerId: string): Layer | undefined {
    return this.layers.get(layerId);
  }

  getLayers(): Layer[] {
    return this.order.map((id) => this.layers.get(id)!);
  }

  setVisible(layerId: string, visible: boolean): void {
    const layer = this.requireLayer(layerId);
    layer.visible = visible;
    this.eventBus.emit('layer:updated', { layer });
  }

  setLocked(layerId: string, locked: boolean): void {
    const layer = this.requireLayer(layerId);
    layer.locked = locked;
    this.eventBus.emit('layer:updated', { layer });
  }

  moveLayer(layerId: string, toIndex: number): void {
    const currentIndex = this.order.indexOf(layerId);
    if (currentIndex === -1) throw new Error(`Layer "${layerId}" not found.`);
    this.order.splice(currentIndex, 1);
    this.order.splice(toIndex, 0, layerId);
    this.recomputeZIndices();
    this.eventBus.emit('layer:reordered', { layers: this.getLayers() });
  }

  assignNodeToLayer(nodeId: string, layerId: string, fromLayerId?: string): void {
    if (fromLayerId) {
      this.layers.get(fromLayerId)?.nodeIds.delete(nodeId);
    }
    const layer = this.requireLayer(layerId);
    layer.nodeIds.add(nodeId);
    if (fromLayerId) {
      this.eventBus.emit('node:layer-changed', { nodeId, fromLayerId, toLayerId: layerId });
    }
  }

  getLayerForNode(nodeId: string): Layer | undefined {
    for (const layer of this.layers.values()) {
      if (layer.nodeIds.has(nodeId)) return layer;
    }
    return undefined;
  }

  private requireLayer(layerId: string): Layer {
    const layer = this.layers.get(layerId);
    if (!layer) throw new Error(`Layer "${layerId}" not found.`);
    return layer;
  }

  private recomputeZIndices(): void {
    this.order.forEach((id, index) => {
      const layer = this.layers.get(id);
      if (layer) layer.zIndex = index;
    });
  }
}
