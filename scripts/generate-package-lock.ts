import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = path.resolve(__dirname, '..');

if (!fs.existsSync(path.join(rootDir, 'package-lock.json'))) {
  console.log('Generating package-lock.json...');
  execSync('npm install --package-lock-only', { cwd: rootDir, stdio: 'inherit' });
  console.log('package-lock.json generated successfully.');
} else {
  console.log('package-lock.json already exists.');
}

