// Make Mithril happy
if (!global.window) {
  global.window = global.document = global.requestAnimationFrame = undefined;
}

const less = require('less'),
      fs = require('fs'),
      m = require('mithril'),
      render = require('mithril-node-render'),
      puppeteer = require('puppeteer');

const MarkdownLegacy = require('../shared/naturalcrit/markdownLegacy.js');
const Markdown = require('../shared/naturalcrit/markdown.js');

const brew_renderer = 'legacy';

const { Command } = require('commander');
const program = new Command();

program
  .version('0.0.1')
  .arguments('<inputFile> <outputFile>')
  .option('--layout <type>', 'Set page layout', 'Letter');

program.parse(process.argv);

if (!program.args.length) {
  program.help();
  process.exit(1);
}

const [inputFile, outputFile] = program.args;
const {layout} = program;

if (!(['Letter', 'A4'].includes(layout))) {
  program.help();
  process.exit(1);
}

// Start Less Rendering in the Background
const lessFilepath = (brew_renderer === 'legacy') ? './client/homebrew/phbStyle/phb.styleLegacy.less' : './client/homebrew/phbStyle/phb.style.less';
const lessCss = fs.promises.readFile(lessFilepath, 'utf8')
    .then(data => less.render(data, { compress: true }))
    .then(output => output.css)
    .catch(console.error);

const Layout = {
  oninit(node) {
    node.state.bText = fs.readFileSync(inputFile, 'utf8');
  },
  view(node) {
    return m('div.homebrew',
      m('div',
        (brew_renderer === 'legacy') ?
          node.state.bText.split('\\page').map((page, idx) =>
            m('div.phb', { id: `p${idx + 1}`, 'page-layout': layout }, m.trust(MarkdownLegacy.render(page)))
          ) :
          node.state.bText.split(/^\\page/gm).map((page, idx) =>
            m('div.phb3', { id: `p${idx + 1}`, 'page-layout': layout }, m.trust(Markdown.render(page)))
          )
      )
    );
  }
};

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(render.sync(Layout));

  await lessCss.then(css => page.addStyleTag({ content: css }));

  await page.emulateMedia('screen');

  await page.pdf({ path: outputFile, format: layout });

  await browser.close();
})();
