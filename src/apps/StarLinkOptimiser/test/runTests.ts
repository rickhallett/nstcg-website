// StarLinkOptimiser/test/runTests.ts
import { run } from '../../src/PrincipiaTest';
import './index.test';
import './ConfigParser.test';
import './SpeedTestRunner.test';
import './DataStore.test';
import './Logger.test';
import './StarLinkOptimiser.test';
import './JqWrapper.test';
import './WebServer.test';
import '../../test/StateManager.test';
import '../../test/ServiceRegistry.test';
import './GraphGenerator.test';
import './ReportGenerator.test';
// Import other test files here

run();
