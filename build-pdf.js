const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const [resumeFile, themeName, outputPdf] = process.argv.slice(2);

if (!resumeFile || !themeName || !outputPdf) {
  console.error('Usage: node build-pdf.js <resume.json> <theme-name> <output.pdf>');
  process.exit(1);
}

(async () => {
  const resume = JSON.parse(fs.readFileSync(path.resolve(__dirname, resumeFile), 'utf8'));
  const theme = require(themeName);
  const html = theme.render(resume);

  const tmpHtml = path.resolve(__dirname, `_tmp_${path.basename(outputPdf, '.pdf')}.html`);
  fs.writeFileSync(tmpHtml, html);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle0' });
  await page.pdf({ path: outputPdf, format: 'A4', printBackground: true });
  await browser.close();
  fs.unlinkSync(tmpHtml);
  console.log(`Generated ${outputPdf}`);
})();
