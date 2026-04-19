/**
 * EventBus — central pub/sub system for editor events.
 * All inter-module communication should go through here to keep
 * renderers, selection managers, and scene registry decoupled.
 */

type EventHandler<T = unknown> = (payload: T) => void;

interface EventSubscription {
  unsubscribe(): void;
}

class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  /**
   * Subscribe to an event by name.
   * Returns a subscription handle with an `unsubscribe` method.
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event)!;
    handlers.add(handler as EventHandler);

    return {
      unsubscribe: () => {
        handlers.delete(handler as EventHandler);
        if (handlers.size === 0) {
          this.listeners.delete(event);
        }
      },
    };
  }

  /**
   * Subscribe to an event once — automatically unsubscribes after first call.
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): EventSubscription {
    const sub = this.on<T>(event, (payload) => {
      handler(payload);
      sub.unsubscribe();
    });
    return sub;
  }

  /**
   * Emit an event, invoking all registered handlers synchronously.
   * Note: errors in individual handlers are caught and logged so they
   * don't prevent other handlers from running.
   */
  emit<T = unknown>(event: string, payload: T): void {
    const handlers = this.listeners.get(event);
    if (!handlers || handlers.size === 0) return;

    // Snapshot to avoid mutation issues during iteration
    for (const handler of Array.from(handlers)) {
      try {
        handler(payload);
      } catch (err) {
        // Changed to console.error — I want handler errors to be clearly visible
        // during development so they don't get missed. Can revisit before shipping.
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    }
  }

  /**
   * Remove all listeners for a specific event, or all listeners if no event given.
   */
  off(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /** Returns the number of active listeners for a given event. */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /** Returns all event names that currently have at least one listener. */
  activeEvents(): string[] {
    return Array.from(this.listeners.keys());
  }
}

// Singleton instance shared across the editor
export const eventBus = new EventBus();
export type { EventBus, EventSubscription, EventHandler };
