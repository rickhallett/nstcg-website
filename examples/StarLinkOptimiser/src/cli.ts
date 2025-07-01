// StarLinkOptimiser/src/cli.ts
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { StarLinkOptimiser } from './StarLinkOptimiser';

yargs(hideBin(process.argv))
    .command('start <configFile>', 'Start the service', (yargs) => {
        return yargs.positional('configFile', {
            describe: 'Path to the config file',
            type: 'string',
        });
    }, async (argv) => {
        const optimiser = await StarLinkOptimiser.create(argv.configFile as string);
        optimiser.start();
    })
    .command('stop', 'Stop the service', () => { }, async (argv) => {
        const optimiser = await StarLinkOptimiser.create('config.development.yaml');
        optimiser.stopBackground();
    })
    .command('status', 'Get the status of the service', () => { }, async (argv) => {
        const optimiser = await StarLinkOptimiser.create('config.development.yaml');
        console.log(optimiser.getState());
    })
    .command('generate-config <testName>', 'Generate a new config file', (yargs) => {
        return yargs.positional('testName', {
            describe: 'Name of the test',
            type: 'string',
        });
    }, (argv) => {
        // TODO: Implement config generation
        console.log(`Generating config for ${argv.testName}`);
    })
    .demandCommand(1)
    .parse();
