// Make Mithril happy
if (!global.window) {
  global.window = global.document = global.requestAnimationFrame = undefined;
}

const less = require('less'),
      fs = require('fs'),
      m = require('mithril'),
      render = require('mithril-node-render'),
      puppeteer = require('puppeteer');

const Markdown = require('../shared/naturalcrit/markdown.js');

if (process.argv.length !== 4) {
  console.error('Expected two arguments!');
  process.exit(1);
}

const [inputFn, outputFn] = process.argv.slice(2, 4);

// Start Less Rendering in the Background
const lessCss = fs.promises.readFile('./client/homebrew/phbStyle/phb.style.less', 'utf8')
    .then(data => less.render(data, { compress: true }))
    .then(output => output.css)
    .catch(console.error);

const Layout = {
  oninit(node) {
    node.state.bText = fs.readFileSync(inputFn, 'utf8');
  },
  view(node) {
    return m('div.homebrew',
      m('div',
        node.state.bText.split('\\page').map((page, idx) =>
          m('div.phb', { id: `p${idx + 1}` }, m.trust(Markdown.render(page)))
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

  await page.pdf({ path: outputFn });

  await browser.close();
})();
