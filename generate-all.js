const { execSync } = require('child_process');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const THEMES = [
  'jsonresume-theme-a11y',
  'jsonresume-theme-academic',
  'jsonresume-theme-ace',
  'jsonresume-theme-actual',
  'jsonresume-theme-actual-letter',
  'jsonresume-theme-apage',
  'jsonresume-theme-boilerplate',
  'jsonresume-theme-bootstrap-icons',
  'jsonresume-theme-briefstrap',
  'jsonresume-theme-bufferbloat',
  'jsonresume-theme-caffeine',
  'jsonresume-theme-catppuccin',
  'jsonresume-theme-cjean',
  'jsonresume-theme-class',
  'jsonresume-theme-class2',
  'jsonresume-theme-classic',
  'jsonresume-theme-classy',
  'jsonresume-theme-claude',
  'jsonresume-theme-compact',
  'jsonresume-theme-contempo',
  'jsonresume-theme-cora',
  'jsonresume-theme-creative-confidence',
  'jsonresume-theme-crisp',
  'jsonresume-theme-curzy',
  'jsonresume-theme-cv',
  'jsonresume-theme-cvstrap',
  'jsonresume-theme-dark-classy',
  'jsonresume-theme-dark-classy-responsive',
  'jsonresume-theme-dev-ats',
  'jsonresume-theme-dev-ats-es',
  'jsonresume-theme-direct',
  'jsonresume-theme-elegant',
  'jsonresume-theme-elegant-compact',
  'jsonresume-theme-elite',
  'jsonresume-theme-eloquent',
  'jsonresume-theme-engineering-leader',
  'jsonresume-theme-even',
  'jsonresume-theme-eventide',
  'jsonresume-theme-flat',
  'jsonresume-theme-full',
  'jsonresume-theme-futura',
  'jsonresume-theme-github',
  'jsonresume-theme-github-styled',
  'jsonresume-theme-golden',
  'jsonresume-theme-grande',
  'jsonresume-theme-jacrys',
  'jsonresume-theme-jdambron',
  'jsonresume-theme-joeytall',
  'jsonresume-theme-juno',
  'jsonresume-theme-kards',
  'jsonresume-theme-kate',
  'jsonresume-theme-kendall',
  'jsonresume-theme-kwan',
  'jsonresume-theme-latex',
  'jsonresume-theme-lucide',
  'jsonresume-theme-macchiato',
  'jsonresume-theme-mantra',
  'jsonresume-theme-markdown',
  'jsonresume-theme-material',
  'jsonresume-theme-material-moon',
  'jsonresume-theme-microdata',
  'jsonresume-theme-minyma',
  'jsonresume-theme-mocha-responsive',
  'jsonresume-theme-modern',
  'jsonresume-theme-modern-plain',
  'jsonresume-theme-moon',
  'jsonresume-theme-msresume',
  'jsonresume-theme-noodle',
  'jsonresume-theme-one',
  'jsonresume-theme-onepage',
  'jsonresume-theme-onepage-plus',
  'jsonresume-theme-orbit',
  'jsonresume-theme-paper',
  'jsonresume-theme-paper-plus-plus',
  'jsonresume-theme-papirus',
  'jsonresume-theme-plick',
  'jsonresume-theme-printclassy',
  'jsonresume-theme-professional',
  'jsonresume-theme-projects',
  'jsonresume-theme-pumpkin',
  'jsonresume-theme-react',
  'jsonresume-theme-refined',
  'jsonresume-theme-relaxed',
  'jsonresume-theme-retro',
  'jsonresume-theme-rickosborne',
  'jsonresume-theme-rnord',
  'jsonresume-theme-rocketspacer',
  'jsonresume-theme-sceptile',
  'jsonresume-theme-short',
  'jsonresume-theme-simple-red',
  'jsonresume-theme-simplyelegant',
  'jsonresume-theme-skills',
  'jsonresume-theme-slick',
  'jsonresume-theme-smart',
  'jsonresume-theme-spartacus',
  'jsonresume-theme-spartan',
  'jsonresume-theme-srt',
  'jsonresume-theme-stackoverflow',
  'jsonresume-theme-stackoverflowed',
  'jsonresume-theme-standard-resume',
  'jsonresume-theme-straightforward',
  'jsonresume-theme-tan-responsive',
  'jsonresume-theme-tech',
  'jsonresume-theme-timeline',
  'jsonresume-theme-waterfall',
];

const resumeJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'resume.json'), 'utf8'));
const resumesDir = path.resolve(__dirname, 'resumes');

async function renderTheme(themeName) {
  let theme;
  try {
    theme = require(themeName);
  } catch (e) {
    return { theme: themeName, status: 'skip', reason: 'not installed' };
  }

  let html;
  try {
    const renderFn = theme.render || theme.default?.render;
    if (!renderFn) return { theme: themeName, status: 'skip', reason: 'no render function' };
    const result = renderFn(resumeJson);
    html = typeof result === 'string' ? result : await result;
  } catch (e) {
    return { theme: themeName, status: 'fail', reason: 'render error: ' + e.message.substring(0, 80) };
  }

  const htmlPath = path.join(resumesDir, `${themeName}.html`);
  fs.writeFileSync(htmlPath, html);
  return { theme: themeName, status: 'ok', htmlPath };
}

(async () => {
  // Step 1: Install all themes in one batch
  console.log(`Installing ${THEMES.length} themes...`);
  try {
    execSync(`npm install --no-save --ignore-scripts --legacy-peer-deps ${THEMES.join(' ')}`, {
      cwd: __dirname,
      stdio: 'inherit',
      timeout: 600000,
    });
  } catch (e) {
    console.log('Install had some errors, continuing with what we have...');
  }
  console.log('Installation step done.\n');

  // Step 2: Render all themes to HTML
  console.log('Rendering themes to HTML...');
  const results = [];
  for (const themeName of THEMES) {
    const result = await renderTheme(themeName);
    results.push(result);
    const icon = result.status === 'ok' ? '✓' : '✗';
    const msg = result.status === 'ok' ? '' : ` (${result.reason})`;
    console.log(`  ${icon} ${themeName}${msg}`);
  }

  const successfulRenders = results.filter(r => r.status === 'ok');
  console.log(`\nRendered ${successfulRenders.length}/${THEMES.length} themes to HTML.`);

  if (successfulRenders.length === 0) {
    console.log('No themes rendered successfully.');
    process.exit(1);
  }

  // Step 3: Convert HTML to PDF using Puppeteer
  console.log('\nConverting to PDF...');
  const browser = await puppeteer.launch();
  let pdfCount = 0;

  for (const result of successfulRenders) {
    const pdfPath = path.join(resumesDir, `${result.theme}.pdf`);
    try {
      const page = await browser.newPage();
      await page.goto('file://' + result.htmlPath, { waitUntil: 'networkidle0', timeout: 15000 });
      await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
      await page.close();
      pdfCount++;
      console.log(`  ✓ ${result.theme}.pdf`);
    } catch (e) {
      console.log(`  ✗ ${result.theme} (PDF error: ${e.message.substring(0, 60)})`);
    }
    try { fs.unlinkSync(result.htmlPath); } catch {}
  }

  await browser.close();
  console.log(`\nDone! Generated ${pdfCount} PDFs in ./resumes/`);
})();
