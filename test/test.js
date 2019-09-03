/*
Copyright 2019 Taylor Raack <taylor@raack.info>.

This file is part of PageAccel.

PageAccel is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

PageAccel is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with PageAccel.  If not, see <http://www.gnu.org/licenses/>.
*/

const puppeteer = require('puppeteer');
const assert = require('assert');

const extensionPath = '.';
let extensionPage = null;
let browser = null;

describe('PageAccel', function() {
  this.timeout(60000);
  before(async function() {
    await boot();
  });

  it('should view the AMP page when loading a regular page that is AMP-enabled', async function() {
    const page = await browser.newPage();

    // browse to google.com
    await page.goto("https://www.google.com/");

    // browse to normal page
    await page.goto("https://www.theguardian.com/us-news/2019/sep/02/georgia-republians-political-opponents-voter-intimidation");
    await page.waitFor(100);

    // verify that PageAccel has changed page to AMP page
    assert.equal("https://amp.theguardian.com/us-news/2019/sep/02/georgia-republians-political-opponents-voter-intimidation", page.url());

    // click on another regular page which is AMP-enabled
    await page.goto("https://www.theguardian.com/business/2019/sep/01/niquel-johnson-starbucks-philadelphia-legal-action");
    await page.waitFor(100);

    // verify that PageAccel has changed page to AMP page
    assert.equal("https://amp.theguardian.com/business/2019/sep/01/niquel-johnson-starbucks-philadelphia-legal-action", page.url());

    // click back button
    await page.goBack();
    await page.waitFor(100);

    // verify that PageAccel has changed page to first AMP page
    assert.equal("https://amp.theguardian.com/us-news/2019/sep/02/georgia-republians-political-opponents-voter-intimidation", page.url());

    // click back button
    await page.goBack();
    await page.waitFor(100);

    // verify that browser is back at google.com
    assert.equal("https://www.google.com/", page.url());
  });

  after(async function() {
	  await browser.close();
  });
});

async function boot() {
  browser = await puppeteer.launch({
    headless: false, // extension are allowed only in head-full mode
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });
}
