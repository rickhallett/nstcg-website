import { execSync } from 'child_process';
import { writeFile } from 'fs/promises';
import { join } from 'path';

interface SchedulerOptions {
  name: string;
  direction?: string;
  tilt?: number;
}

export class Scheduler {
  async setup(options: SchedulerOptions): Promise<void> {
    const scriptPath = join(import.meta.dir, 'index.ts');
    
    // Build the command
    let command = `cd ${process.cwd()} && bun run ${scriptPath} --name ${options.name} --single-run`;
    
    if (options.direction) {
      command += ` --direction ${options.direction}`;
    }
    
    if (options.tilt !== undefined) {
      command += ` --tilt ${options.tilt}`;
    }

    // Create a shell script for the cron job
    const cronScriptPath = join(process.cwd(), `starlink-mini-${options.name}.sh`);
    const cronScriptContent = `#!/bin/bash
# StarLinkMini cron job for session: ${options.name}
${command}
`;

    await writeFile(cronScriptPath, cronScriptContent);
    execSync(`chmod +x ${cronScriptPath}`);

    // Add to crontab
    const cronEntry = `*/10 * * * * ${cronScriptPath}`;
    
    try {
      // Get current crontab
      let currentCrontab = '';
      try {
        currentCrontab = execSync('crontab -l', { encoding: 'utf-8' });
      } catch (e) {
        // No existing crontab
      }

      // Check if entry already exists
      if (currentCrontab.includes(cronScriptPath)) {
        console.log('Cron job already exists for this session');
        return;
      }

      // Add new entry
      const newCrontab = currentCrontab + (currentCrontab.endsWith('\n') ? '' : '\n') + cronEntry + '\n';
      
      // Write new crontab
      execSync(`echo '${newCrontab}' | crontab -`, { shell: '/bin/bash' });
      
      console.log(`Cron job created: ${cronEntry}`);
      console.log(`Script location: ${cronScriptPath}`);
      console.log('\nTo view scheduled jobs: crontab -l');
      console.log(`To remove this job: crontab -e (then delete the line with ${options.name})`);
    } catch (error) {
      console.error('Failed to set up cron job:', error);
      console.log('\nManual setup:');
      console.log('1. Run: crontab -e');
      console.log(`2. Add: ${cronEntry}`);
      console.log('3. Save and exit');
    }
  }

  async remove(sessionName: string): Promise<void> {
    try {
      const currentCrontab = execSync('crontab -l', { encoding: 'utf-8' });
      const lines = currentCrontab.split('\n');
      const filtered = lines.filter(line => !line.includes(`starlink-mini-${sessionName}.sh`));
      
      if (lines.length === filtered.length) {
        console.log('No cron job found for this session');
        return;
      }

      const newCrontab = filtered.join('\n');
      execSync(`echo '${newCrontab}' | crontab -`, { shell: '/bin/bash' });
      
      console.log(`Removed cron job for session: ${sessionName}`);
    } catch (error) {
      console.error('Failed to remove cron job:', error);
    }
  }
}