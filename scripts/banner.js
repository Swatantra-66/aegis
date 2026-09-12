#!/usr/bin/env node
/**
 * Aegis IAM Portal — Terminal Brand Banner
 * High-fidelity editorial box-art banner matching OpenCode aesthetic.
 * Big, elongated uppercase letterforms with interior shadow blocks.
 */

// Colors matching OpenCode two-tone minimal pixel palette
const W = '\x1b[38;2;235;235;235m'; // crisp bright white
const G = '\x1b[38;2;165;165;165m'; // cool silver gray
const S = '\x1b[38;2;70;70;70m';    // interior shadow charcoal
const B = '\x1b[38;2;60;60;60m';    // hairline box border
const T = '\x1b[38;2;180;180;180m'; // subtitle description text
const M = '\x1b[38;2;135;135;135m'; // muted footer label text
const NC = '\x1b[0m';

// Elongated uppercase AEGIS letterforms with OpenCode interior cutout shadows
// A: 12, E: 10, G: 12, I: 6, S: 12 (spacing: 2) -> Total 60 visible chars
const A = [
  '  ████████  ',
  ' ██      ██ ',
  ' ██' + S + '██████' + G + '██ ',
  ' ██████████ ',
  ' ██      ██ ',
  ' ██      ██ ',
  ' ██      ██ '
];

const E = [
  '██████████',
  '██        ',
  '████████  ',
  '██' + S + '██████  ',
  '██        ',
  '██        ',
  '██████████'
];

const G_glyph = [
  '  ████████  ',
  ' ██      ██ ',
  ' ██' + S + '██       ',
  ' ██   █████ ',
  ' ██      ██ ',
  ' ██      ██ ',
  '  ████████  '
];

const I = [
  '██████',
  '  ██  ',
  '  ██  ',
  '  ██  ',
  '  ██  ',
  '  ██  ',
  '██████'
];

const S_glyph = [
  '  ████████  ',
  ' ██      ██ ',
  ' ██' + S + '██       ',
  '  ████████  ',
  '    ' + S + '████' + W + ' ██ ',
  '         ██ ',
  '  ████████  '
];

// Combine two-tone rows (AE in silver-gray, GIS in bright white)
const rows = [];
for (let r = 0; r < 7; r++) {
  rows.push(G + A[r] + '  ' + E[r] + NC + '  ' + W + G_glyph[r] + '  ' + I[r] + '  ' + S_glyph[r] + NC);
}

// 72-character box width framing
const borderTop = B + '┌──────────────────────────────────────────────────────────────────────┐' + NC;
const borderMid = B + '├──────────────────────────────────┬───────────────────────────────────┤' + NC;
const borderBot = B + '└──────────────────────────────────┴───────────────────────────────────┘' + NC;
const empty     = B + '│' + NC + '                                                                      ' + B + '│' + NC;

const padLogo = (line) => B + '│' + NC + '     ' + line + '     ' + B + '│' + NC;

const descLine1 = B + '│' + NC + '   ' + T + 'The enterprise identity & access management platform' + NC + '               ' + B + '│' + NC;
const descLine2 = B + '│' + NC + '   ' + T + 'built for zero-trust cryptographic security' + NC + '                        ' + B + '│' + NC;

const footLeft  = '   ' + M + 'Production:' + NC + ' ' + W + 'DigitalOcean' + NC + '       ';
const footRight = '   ' + M + 'aegis.swatantracodes.in' + NC + '         ';
const footer    = B + '│' + NC + footLeft + B + '│' + NC + footRight + B + '│' + NC;

const box = [
  '',
  borderTop,
  empty,
  padLogo(rows[0]),
  padLogo(rows[1]),
  padLogo(rows[2]),
  padLogo(rows[3]),
  padLogo(rows[4]),
  padLogo(rows[5]),
  padLogo(rows[6]),
  empty,
  descLine1,
  descLine2,
  empty,
  borderMid,
  footer,
  borderBot,
  ''
];

console.log(box.join('\n'));
