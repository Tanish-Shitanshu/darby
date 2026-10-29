import { Config } from '@remotion/cli/config';
import fs from 'node:fs';

// Use the Chrome already on this machine instead of downloading another browser.
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));
if (chrome) Config.setBrowserExecutable(chrome);
Config.setOverwriteOutput(true);
