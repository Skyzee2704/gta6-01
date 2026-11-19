// ESM resolve hook so Node tools can import the game's 'three' the way
// the browser importmap does: bare 'three' -> the vendored ESM build.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') {
    return {
      url: new URL('../game/vendor/three.module.min.js', import.meta.url).href,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}
