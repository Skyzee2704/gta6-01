// Entry point for check3d: registers the 'three' loader, then runs it.
import { register } from 'node:module';

register('./three-loader.mjs', import.meta.url);
await import('./check3d.mjs');
