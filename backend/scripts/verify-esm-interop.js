// Guards the file-type ESM interop in the *compiled* backend.
//
// vitest transpiles with its own config, so the 107-test suite stays green even
// if tsconfig's `module` is changed to "commonjs" — TypeScript would then rewrite
// the dynamic `import('file-type')` into `require('file-type')`, and since
// file-type v18+ is ESM-only, every upload would fail at runtime with
// ERR_REQUIRE_ESM. Nothing else would catch that before a deploy.
//
// This loads dist/ and exercises the real CommonJS emit instead.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const distFile = path.resolve(__dirname, '../dist/services/validation.service.js');
const srcFile = path.resolve(__dirname, '../src/services/validation.service.ts');

if (!fs.existsSync(distFile)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

// A stale dist produces a confident but meaningless verdict, so refuse to guess.
if (fs.statSync(distFile).mtimeMs < fs.statSync(srcFile).mtimeMs) {
  console.error('dist/ is older than src/. Rebuild first, or use `npm run verify:esm-interop`.');
  process.exit(1);
}

let failures = 0;

function check(name, condition, detail) {
  if (condition) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const source = fs.readFileSync(distFile, 'utf8');

// 1. The emit must contain a genuine dynamic import of file-type.
check(
  'compiled output keeps a dynamic import of file-type',
  /\bimport\(\s*['"]file-type['"]\s*\)/.test(source),
  'no dynamic import found; tsconfig may have downgraded it to require()',
);

// 2. ...and must not have been rewritten into a require().
check(
  'compiled output does not require() file-type',
  !/require\(\s*['"]file-type['"]\s*\)/.test(source),
  'found require("file-type") — this throws ERR_REQUIRE_ESM at runtime',
);

// 3. Load the real CJS build and actually sniff a file through it. This is the
//    part the vitest suite cannot cover.
try {
  const script = `
    const { ValidationService } = require(${JSON.stringify(distFile)});
    const MP4 = Buffer.from('000000186674797069736f6d000000006d703432', 'hex');
    const PNG = Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'), Buffer.alloc(4096)]);
    ValidationService.validateVideo(MP4, 'intro.mp4', MP4.length)
      .then((r) => {
        if (!r.valid || r.detectedMime !== 'video/mp4') {
          throw new Error('expected a valid video/mp4, got ' + JSON.stringify(r));
        }
        return ValidationService.validateVideo(PNG, 'evil.mp4', PNG.length);
      })
      .then((r) => {
        if (r.valid) throw new Error('a PNG renamed to .mp4 was accepted');
        console.log('SNIFF_OK');
      });
  `;
  const out = execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' });
  check('compiled build sniffs magic bytes correctly', out.includes('SNIFF_OK'));
} catch (err) {
  check('compiled build sniffs magic bytes correctly', false, String(err.message).slice(0, 200));
}

console.log(failures === 0 ? '\nAll interop checks passed' : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
