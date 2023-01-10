import { expect, test } from "@jest/globals";
import { createEvent } from "@posthog/plugin-scaffold/test/utils";
import { Filter, PluginMeta, processEvent } from "./main";

const filters: Filter[] = [
  {
    property: "$host",
    type: "string",
    operator: "not_contains",
    value: "localhost",
  },
  {
    property: "foo",
    type: "number",
    operator: "gt",
    value: 10,
  },
  {
    property: "bar",
    type: "boolean",
    operator: "is",
    value: true,
  },
];

const meta = {
  global: { filters, eventsToDrop: ['to_drop_event'] }
} as PluginMeta

test("Event satisfies all conditions and passes", () => {
  const event = createEvent({
    event: "test event",
    properties: {
      $host: "example.com",
      foo: 20,
      bar: true,
    },
  });
  const processedEvent = processEvent(event, meta);
  expect(processedEvent).toEqual(event);
});

test("Event does not satisfy one condition and is dropped", () => {
  const event = createEvent({
    event: "test event",
    properties: {
      $host: "localhost:8000",
      foo: 20,
      bar: true,
    },
  });
  const processedEvent = processEvent(event, meta);
  expect(processedEvent).toBeUndefined();
});

test("Event does not satisfy any condition and is dropped", () => {
  const event = createEvent({
    event: "test event",
    properties: {
      $host: "localhost:8000",
      foo: 5,
      bar: false,
    },
  });
  const processedEvent = processEvent(event, meta);
  expect(processedEvent).toBeUndefined();
});

test("Event is marked to be dropped is dropped", () => {
  const event = createEvent({
    event: "to_drop_event",
    properties: {
      $host: "example.com",
      foo: 20,
      bar: true,
    },
  });
  const processedEvent = processEvent(event, meta);
  expect(processedEvent).toBeUndefined();
})

test("Event is marked to be dropped when a property is undefined", () => {
  const event = createEvent({
    event: "test_event",
    properties: {
      $host: undefined,
      foo: 20,
      bar: true,
    },
  });
  const processedEvent = processEvent(event, meta);
  expect(processedEvent).toBeUndefined();
})
