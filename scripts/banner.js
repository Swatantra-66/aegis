#!/usr/bin/env node
/**
 * Aegis IAM Portal — Terminal Brand Banner
 * High-fidelity editorial box-art banner for project entry.
 */

const BOLD = '\x1b[1m';
const WHITE = '\x1b[37m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';
const NC = '\x1b[0m';

// Banner box lines matching OpenCode editorial brutalist aesthetic (62 chars width)
const borderTop    = `${GRAY}┌────────────────────────────────────────────────────────────┐${NC}`;
const emptyLine    = `${GRAY}│${NC}                                                            ${GRAY}│${NC}`;
const l1           = `${GRAY}│${NC}   ${BOLD}${WHITE}█████   ███████   ██████  ██  ██████${NC}                     ${GRAY}│${NC}`;
const l2           = `${GRAY}│${NC}  ${BOLD}${WHITE}██   ██  ██       ██       ██  ██${NC}                         ${GRAY}│${NC}`;
const l3           = `${GRAY}│${NC}  ${BOLD}${WHITE}███████  █████    ██   ███ ██  ██████${NC}                     ${GRAY}│${NC}`;
const l4           = `${GRAY}│${NC}  ${BOLD}${WHITE}██   ██  ██       ██    ██ ██      ██${NC}                     ${GRAY}│${NC}`;
const l5           = `${GRAY}│${NC}  ${BOLD}${WHITE}██   ██  ███████   ██████  ██  ██████${NC}                     ${GRAY}│${NC}`;
const desc1        = `${GRAY}│${NC}                                                            ${GRAY}│${NC}`;
const desc2        = `${GRAY}│${NC}  ${WHITE}The enterprise identity & cryptographic security engine${NC}   ${GRAY}│${NC}`;
const desc3        = `${GRAY}│${NC}  ${WHITE}built for the terminal${NC}                                    ${GRAY}│${NC}`;
const desc4        = `${GRAY}│${NC}                                                            ${GRAY}│${NC}`;
const borderMid    = `${GRAY}├────────────────────────────┬───────────────────────────────┤${NC}`;
const footer       = `${GRAY}│${NC}  ${GRAY}Version:${NC} ${BOLD}1.0.0${NC}            ${GRAY}│${NC}  ${CYAN}aegis.swatantracodes.in${NC}      ${GRAY}│${NC}`;
const borderBottom = `${GRAY}└────────────────────────────┴───────────────────────────────┘${NC}`;

const output = [
  '',
  borderTop,
  emptyLine,
  l1,
  l2,
  l3,
  l4,
  l5,
  desc1,
  desc2,
  desc3,
  desc4,
  borderMid,
  footer,
  borderBottom,
  ''
].join('\n');

console.log(output);
