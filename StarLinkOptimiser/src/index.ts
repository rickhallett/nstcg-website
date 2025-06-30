// StarLinkOptimiser/src/index.ts
import { StarLinkOptimiser } from './StarLinkOptimiser';

const configPath = process.argv[2] || 'config.development.yaml';
const optimiser = await StarLinkOptimiser.create(configPath);
optimiser.start();