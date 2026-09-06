const fs = require('fs');
const pw = require('playwright-core');
module.exports = {
  launch: async options => {
    const configured = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const executablePath = configured || (fs.existsSync(mac) ? mac : undefined);
    const browser = await pw.chromium.launch({ ...options, executablePath });
    const context = browser.newContext.bind(browser);
    browser.newContext = async options => {
      const ctx = await context(options);
      // Tests use synthetic families. Never contact email relays or other
      // external services; the vendored engine makes tests fully local.
      await ctx.route('**/*', route => {
        const url = new URL(route.request().url());
        return ['localhost','127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
      });
      return ctx;
    };
    browser.newPage = async options => (await browser.newContext(options)).newPage();
    return browser;
  }
};
