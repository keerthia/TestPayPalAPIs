// playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    ['allure-playwright']
  ],
});
