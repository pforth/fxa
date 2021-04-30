import { BasePage } from './base';
import { getCode } from '../../../src/lib/totp';

export class TotpPage extends BasePage {
  readonly path = 'settings/two_step_authentication';

  async setSecurityCode() {
    await this.page.click('[data-testid=cant-scan-code]');
    const secret = (
      await this.page.innerText('[data-testid=manual-code]')
    ).replace(/\s/g, '');
    const code = await getCode(secret);
    return this.page.fill('input[type=text]', code);
  }

  submit() {
    return this.page.click('button[type=submit]');
  }

  clickClose() {
    return Promise.all([
      this.page.click('[data-testid=close-button]'),
      this.page.waitForNavigation(),
    ]);
  }

  async getRecoveryCodes(): Promise<string[]> {
    await this.page.waitForSelector('[data-testid=datablock]');
    // @ts-ignore
    return this.page.$$eval('[data-testid=datablock] span', (elements) =>
      elements.map((el) => el.innerText)
    );
  }

  setRecoveryCode(code: string) {
    return this.page.fill('[data-testid=recovery-code-input-field]', code);
  }
}
