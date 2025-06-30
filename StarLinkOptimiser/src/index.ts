// StarLinkOptimiser/src/index.ts
import { StarLinkOptimiser } from './StarLinkOptimiser';

const optimiser = await StarLinkOptimiser.create('config.development.yaml');
optimiser.start();
