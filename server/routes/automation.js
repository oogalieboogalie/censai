import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import { requireLocalFilesystem } from '../middleware/runtimeMode.js';

const execAsync = promisify(exec);
export const automationRouter = express.Router();

const ALLOWED_TASKS = [
  'CensaiJulesQueue',
  'CensaiOverseer',
  'OpenHubQueue',
  'OpenHubOverseer'
];

async function runPowerShell(command) {
  try {
    const { stdout } = await execAsync(`powershell.exe -NoProfile -NonInteractive -Command "${command}"`);
    return stdout;
  } catch (err) {
    return null;
  }
}

async function readJsonSafely(filepath) {
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

automationRouter.get('/status', requireLocalFilesystem, async (req, res) => {
  try {
    const isWindows = os.platform() === 'win32';
    const statusResult = {};

    for (const task of ALLOWED_TASKS) {
      statusResult[task] = { armed: false, state: 'Unknown', lastRunTime: null, nextRunTime: null, lastTaskResult: null, pending: 0, dispatched: 0 };
    }

    if (isWindows) {
      for (const task of ALLOWED_TASKS) {
        // Fetch state
        const stateOutput = await runPowerShell(`(Get-ScheduledTask -TaskName '${task}' -ErrorAction SilentlyContinue).State`);

        // Fetch info
        const infoOutput = await runPowerShell(`Get-ScheduledTaskInfo -TaskName '${task}' -ErrorAction SilentlyContinue | Select-Object LastRunTime, NextRunTime, LastTaskResult | ConvertTo-Json`);

        if (stateOutput || infoOutput) {
           statusResult[task].armed = true;
           statusResult[task].state = stateOutput ? stateOutput.trim() : 'Unknown';

           if (infoOutput) {
             try {
               const parsedInfo = JSON.parse(infoOutput);
               if (parsedInfo.LastRunTime) {
                  // Powershell returns something like "/Date(162...)/", converting it or using the raw string if already formatted
                  const match = /\\\/Date\((\d+)\)\\\//.exec(parsedInfo.LastRunTime);
                  if (match) {
                     statusResult[task].lastRunTime = new Date(parseInt(match[1], 10)).toISOString();
                  } else {
                     statusResult[task].lastRunTime = parsedInfo.LastRunTime;
                  }
               }
               if (parsedInfo.NextRunTime) {
                  const match = /\\\/Date\((\d+)\)\\\//.exec(parsedInfo.NextRunTime);
                  if (match) {
                     statusResult[task].nextRunTime = new Date(parseInt(match[1], 10)).toISOString();
                  } else {
                     statusResult[task].nextRunTime = parsedInfo.NextRunTime;
                  }
               }
               statusResult[task].lastTaskResult = parsedInfo.LastTaskResult;
             } catch (e) {
               // Ignore parse error
             }
           }
        }
      }
    }

    // Read queue files
    const queueData = await readJsonSafely('.team/handoffs/queue.json');
    if (queueData) {
      statusResult['CensaiJulesQueue'].pending = queueData.pending ? queueData.pending.length : 0;
      statusResult['CensaiJulesQueue'].dispatched = queueData.dispatched ? queueData.dispatched.length : 0;
    }

    const openHubQueueData = await readJsonSafely('.team/handoffs/openhub-queue.json');
    if (openHubQueueData) {
      statusResult['OpenHubQueue'].pending = openHubQueueData.pending ? openHubQueueData.pending.length : 0;
      statusResult['OpenHubQueue'].dispatched = openHubQueueData.dispatched ? openHubQueueData.dispatched.length : 0;
    }

    const overseerData = await readJsonSafely('.team/handoffs/overseer-state.json');
    if (overseerData) {
      // Not mapping explicitly to pending/dispatched, but attach it to the task
      statusResult['CensaiOverseer'].metadata = overseerData;
    }

    res.json(statusResult);
  } catch (err) {
    console.error('Error fetching automation status:', err);
    res.status(500).json({ error: err.message });
  }
});

automationRouter.post('/:task/run', requireLocalFilesystem, async (req, res) => {
  const { task } = req.params;
  if (!ALLOWED_TASKS.includes(task)) {
    return res.status(400).json({ error: 'Invalid task name' });
  }

  const isWindows = os.platform() === 'win32';
  if (!isWindows) {
    return res.status(400).json({ error: 'Running tasks is only supported on Windows' });
  }

  try {
    await runPowerShell(`Start-ScheduledTask -TaskName '${task}'`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

automationRouter.post('/:task/enable', requireLocalFilesystem, async (req, res) => {
  const { task } = req.params;
  if (!ALLOWED_TASKS.includes(task)) {
    return res.status(400).json({ error: 'Invalid task name' });
  }

  const isWindows = os.platform() === 'win32';
  if (!isWindows) {
    return res.status(400).json({ error: 'Enabling tasks is only supported on Windows' });
  }

  try {
    await runPowerShell(`Enable-ScheduledTask -TaskName '${task}'`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

automationRouter.post('/:task/disable', requireLocalFilesystem, async (req, res) => {
  const { task } = req.params;
  if (!ALLOWED_TASKS.includes(task)) {
    return res.status(400).json({ error: 'Invalid task name' });
  }

  const isWindows = os.platform() === 'win32';
  if (!isWindows) {
    return res.status(400).json({ error: 'Disabling tasks is only supported on Windows' });
  }

  try {
    await runPowerShell(`Disable-ScheduledTask -TaskName '${task}'`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
