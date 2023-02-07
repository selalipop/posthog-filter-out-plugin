import { Meta, PluginEvent, PluginAttachment } from "@posthog/plugin-scaffold";

export interface Filter {
  property: string;
  type: "string" | "number" | "boolean";
  operator: string;
  value: string | number | boolean;
}

export interface PluginMeta
  extends Meta<{
    config: {
      eventsToDrop?: string;
      keepUndefinedProperties?: "Yes" | "No";
    };
    global: {
      filters: Filter[];
      eventsToDrop: string[];
      keepUndefinedProperties?: boolean;
    };
    attachments: {
      filters?: PluginAttachment;
    };
  }> {}

const operations: Record<
  Filter["type"],
  Record<string, (a: any, b: any) => boolean>
> = {
  string: {
    is: (a, b) => a === b,
    is_not: (a, b) => a !== b,
    contains: (a, b) => a.includes(b),
    not_contains: (a, b) => !a.includes(b),
    regex: (a, b) => new RegExp(b).test(a),
    not_regex: (a, b) => !new RegExp(b).test(a),
  },
  number: {
    gt: (a, b) => a > b,
    lt: (a, b) => a < b,
    gte: (a, b) => a >= b,
    lte: (a, b) => a <= b,
    eq: (a, b) => a === b,
    neq: (a, b) => a !== b,
  },
  boolean: {
    is: (a, b) => a === b,
    is_not: (a, b) => a !== b,
  },
};

export function setupPlugin({ global, config, attachments }: PluginMeta) {
  if (attachments.filters) {
    try {
      // Parse the filters from the attachment
      const filters = JSON.parse(attachments.filters.contents) as Filter[];
      if (!filters) throw new Error("No filters found");

      // Check if the filters are valid
      for (const filter of filters) {
        if (!operations[filter.type][filter.operator]) {
          throw new Error(
            `Invalid operator "${filter.operator}" for type "${filter.type}" in filter for "${filter.property}"`
          );
        }
      }
      // Save the filters to the global object
      global.filters = filters;
    } catch {
      throw new Error("Could not parse filters attachment");
    }
  } else {
    global.filters = [];
  }
  global.eventsToDrop =
    config?.eventsToDrop?.split(",")?.map((event) => event.trim()) || [];

  global.keepUndefinedProperties = config.keepUndefinedProperties === "Yes";
}

export function processEvent(
  event: PluginEvent,
  meta: PluginMeta
): PluginEvent {
  if (!event.properties) return event;
  const { filters, eventsToDrop, keepUndefinedProperties } = meta.global;

  // If the event name matches, we drop the event
  if (eventsToDrop.some((e) => event.event === e)) {
    return undefined;
  }

  // Check if the event satisfies all the filters
  const keepEvent = filters.every((filter) => {
    const value = event.properties[filter.property];
    if (value === undefined) return keepUndefinedProperties;

    const operation = operations[filter.type][filter.operator];
    if (!operation) throw new Error(`Invalid operator ${filter.operator}`);

    return operation(value, filter.value);
  });

  // If should keep the event, return it, else return undefined
  return keepEvent ? event : undefined;
}
