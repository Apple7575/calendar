/**
 * BL-06: a file's first render also loads react-native's lazily exported components and their dependencies.
 * On a calm machine that is 0.4–0.7 s. When several full jest runs share the machine it took 5.5–8.4 s,
 * so whichever test rendered first ran past jest's 5 s test limit and failed even though nothing was wrong.
 * Call this from beforeAll: the one-time cost then runs under its own limit and every test keeps the 5 s limit.
 */
import type React from 'react';
export const WARM_TIMEOUT = 60000;
export async function warmRender(make: () => React.ReactElement) {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const renderer = require('react-test-renderer');
  let tree: any;
  await renderer.act(async () => { tree = renderer.create(make()); });
  await renderer.act(async () => tree.unmount());
}
