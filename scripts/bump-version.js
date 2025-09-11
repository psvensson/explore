#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';
const path = new URL('../docs/version.json', import.meta.url);
let data = { build: 0 };
try { data = JSON.parse(fs.readFileSync(path, 'utf-8')); } catch {}
data.build = (Number(data.build)||0) + 1;
let hash = '';
try { hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore','pipe','ignore'] }).toString().trim(); } catch {}
const version = `${data.build}${hash?'-'+hash:''}`;
fs.writeFileSync(path, JSON.stringify({ build: data.build, version }, null, 2));
console.log('Bumped version to', version);
