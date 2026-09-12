#!/usr/bin/env node
/**
 * Aegis IAM Portal — Terminal Banner Hook Installer
 * Configures Git Bash, Zsh, and Linux Bash profiles to automatically
 * display the Aegis brand banner whenever you enter the project directory.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOOK_TAG_START = '# >>> aegis-dir-banner >>>';
const HOOK_TAG_END = '# <<< aegis-dir-banner <<<';

const HOOK_SNIPPET = `
${HOOK_TAG_START}
_aegis_banner_hook() {
  if [ "$PWD" != "$_AEGIS_LAST_PWD" ]; then
    _AEGIS_LAST_PWD="$PWD"
    if [ -f "$PWD/scripts/banner.js" ]; then
      node "$PWD/scripts/banner.js"
    fi
  fi
}
PROMPT_COMMAND="_aegis_banner_hook\${PROMPT_COMMAND:+; $PROMPT_COMMAND}"
${HOOK_TAG_END}
`;

function install() {
  const home = os.homedir();
  // Check target shell profile files
  const candidates = ['.bashrc', '.bash_profile', '.zshrc'];
  let targetFile = null;

  for (const candidate of candidates) {
    const fullPath = path.join(home, candidate);
    if (fs.existsSync(fullPath)) {
      targetFile = fullPath;
      break;
    }
  }

  // If none exist, default to .bashrc
  if (!targetFile) {
    targetFile = path.join(home, '.bashrc');
  }

  let content = '';
  if (fs.existsSync(targetFile)) {
    content = fs.readFileSync(targetFile, 'utf8');
  }

  if (content.includes(HOOK_TAG_START)) {
    console.log(`\x1b[32m✔ Aegis banner hook is already installed in: ${targetFile}\x1b[0m`);
    return;
  }

  fs.writeFileSync(targetFile, content + HOOK_SNIPPET, 'utf8');
  console.log(`\x1b[32m✔ Successfully installed Aegis banner auto-entry hook into: ${targetFile}\x1b[0m`);
  console.log(`\x1b[36mRestart your terminal or run: source ~/${path.basename(targetFile)}\x1b[0m\n`);
}

install();
