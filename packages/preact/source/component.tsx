import {createElement, isValidElement} from 'preact';
import {forwardRef} from 'preact/compat';
import type {
  RemoteElement,
  RemoteElementConstructor,
} from '@remote-dom/core/elements';

import type {
  RemoteComponentPropsFromElementConstructor,
  RemoteComponentTypeFromElementConstructor,
} from './types.ts';

export function createRemoteComponent<
  Tag extends keyof HTMLElementTagNameMap,
  ElementConstructor extends RemoteElementConstructor<
    any,
    any,
    any
  > = HTMLElementTagNameMap[Tag] extends RemoteElement<
    infer Properties,
    infer Methods,
    infer Slots
  >
    ? RemoteElementConstructor<Properties, Methods, Slots>
    : never,
>(
  tag: Tag,
  Element: ElementConstructor | undefined = customElements.get(tag) as any,
): RemoteComponentTypeFromElementConstructor<ElementConstructor> {
  // @ts-expect-error I can’t make the types work :/
  const RemoteComponent: RemoteComponentTypeFromElementConstructor<ElementConstructor> =
    forwardRef<
      InstanceType<ElementConstructor>,
      RemoteComponentPropsFromElementConstructor<ElementConstructor>
    >(function RemoteComponent(props, ref) {
      const updatedProps: Record<string, any> = {ref};
      const children = toChildren(props.children);

      for (const prop in props) {
        const propValue = props[prop];

        if (prop === 'slot') {
          updatedProps.slot = propValue;
          continue;
        }

        if (
          Element.remoteSlotDefinitions.has(prop) &&
          isValidElement(propValue)
        ) {
          children.push(
            createElement('remote-fragment', {slot: prop}, propValue),
          );
          continue;
        }

        // Preact assumes any properties starting with `on` are event listeners.
        // If we are in this situation, we try to use one of the property’s aliases,
        // which should be a name *not* starting with `on`.
        const definition = Element.remotePropertyDefinitions.get(prop);
        if (definition == null) continue;
        const aliasTo =
          definition.type === Function && definition.name.startsWith('on')
            ? definition.alias?.[0]
            : undefined;
        updatedProps[aliasTo ?? prop] = propValue;
      }

      return createElement(tag, updatedProps, ...children);
    });

  RemoteComponent.displayName = `RemoteComponent(${tag})`;

  return RemoteComponent;
}

// Simple version of React.Children.toArray()
function toChildren(value: any) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}
