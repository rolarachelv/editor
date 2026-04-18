import { EventBus } from './EventBus';

/**
 * Manages the selection state of nodes in the editor.
 * Supports single and multi-select, and emits selection change events.
 */
export class SelectionManager {
  private selectedIds: Set<string> = new Set();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Select a single node, clearing any previous selection.
   */
  select(id: string): void {
    this.selectedIds.clear();
    this.selectedIds.add(id);
    this.emitChange();
  }

  /**
   * Add a node to the current selection without clearing it.
   */
  addToSelection(id: string): void {
    this.selectedIds.add(id);
    this.emitChange();
  }

  /**
   * Remove a node from the current selection.
   */
  removeFromSelection(id: string): void {
    this.selectedIds.delete(id);
    this.emitChange();
  }

  /**
   * Toggle the selection state of a node.
   */
  toggleSelection(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.emitChange();
  }

  /**
   * Replace the entire selection with the provided set of IDs.
   */
  setSelection(ids: string[]): void {
    this.selectedIds = new Set(ids);
    this.emitChange();
  }

  /**
   * Clear all selected nodes.
   */
  clearSelection(): void {
    if (this.selectedIds.size === 0) return;
    this.selectedIds.clear();
    this.emitChange();
  }

  /**
   * Check if a node is currently selected.
   */
  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  /**
   * Get an array of all currently selected node IDs.
   */
  getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }

  /**
   * Returns true if exactly one node is selected.
   */
  hasSingleSelection(): boolean {
    return this.selectedIds.size === 1;
  }

  /**
   * Returns true if more than one node is selected.
   */
  hasMultiSelection(): boolean {
    return this.selectedIds.size > 1;
  }

  private emitChange(): void {
    this.eventBus.emit('selection:changed', {
      selectedIds: this.getSelectedIds(),
    });
  }
}
