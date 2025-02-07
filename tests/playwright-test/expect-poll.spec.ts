/**
 * Copyright Microsoft Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test, expect, stripAnsi } from './playwright-test-fixtures';

test('should poll predicate', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.spec.ts': `
      const { test } = pwt;
      test('should poll sync predicate', async () => {
        let i = 0;
        await test.expect.poll(() => ++i).toBe(3);
      });
      test('should poll async predicate', async () => {
        let i = 0;
        await test.expect.poll(async () => {
          await new Promise(x => setTimeout(x, 50));
          return ++i;
        }).toBe(3);
      });
      test('should poll predicate that returns a promise', async () => {
        let i = 0;
        await test.expect.poll(() => Promise.resolve(++i)).toBe(3);
      });
    `
  });
  expect(result.exitCode).toBe(0);
  expect(result.passed).toBe(3);
});

test('should compile', async ({ runTSC }) => {
  const result = await runTSC({
    'a.spec.ts': `
      const { test } = pwt;
      test('should poll sync predicate', () => {
        let i = 0;
        test.expect.poll(() => ++i).toBe(3);
        test.expect.poll(() => ++i, 'message').toBe(3);
        test.expect.poll(() => ++i, { message: 'message' }).toBe(3);
        test.expect.poll(() => ++i, { timeout: 100 }).toBe(3);
        test.expect.poll(() => ++i, { message: 'message', timeout: 100 }).toBe(3);
        test.expect.poll(async () => {
          await new Promise(x => setTimeout(x, 50));
          return ++i;
        }).toBe(3);
        test.expect.poll(() => Promise.resolve(++i)).toBe(3);
      });
    `
  });
  expect(result.exitCode).toBe(0);
});

test('should respect timeout', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.spec.ts': `
      const { test } = pwt;
      test('should fail', async () => {
        await test.expect.poll(() => false, { timeout: 100 }).toBe(3);
      });
    `
  });
  expect(result.exitCode).toBe(1);
  expect(stripAnsi(result.output)).toContain('Timeout 100ms exceeded while waiting on the predicate');
  expect(stripAnsi(result.output)).toContain(`
  7 |         await test.expect.poll(() => false, { timeout: 100 }).
  `.trim());
});

test('should fail when passed in non-function', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.spec.ts': `
      const { test } = pwt;
      test('should fail', async () => {
        await test.expect.poll(false).toBe(3);
      });
    `
  });
  expect(result.exitCode).toBe(1);
  expect(stripAnsi(result.output)).toContain('Error: `expect.poll()` accepts only function as a first argument');
});

test('should fail when used with web-first assertion', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.spec.ts': `
      const { test } = pwt;
      test('should fail', async ({ page }) => {
        await test.expect.poll(() => page.locator('body')).toHaveText('foo');
      });
    `
  });
  expect(result.exitCode).toBe(1);
  expect(stripAnsi(result.output)).toContain('Error: `expect.poll()` does not support "toHaveText" matcher');
});

test('should time out when running infinite predicate', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.spec.ts': `
      const { test } = pwt;
      test('should fail', async ({ page }) => {
        await test.expect.poll(() => new Promise(x => {}), { timeout: 100 }).toBe(42);
      });
    `
  });
  expect(result.exitCode).toBe(1);
  expect(stripAnsi(result.output)).toContain('Timeout 100ms exceeded');
});

test('should show error that is thrown from predicate', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.spec.ts': `
      const { test } = pwt;
      test('should fail', async ({ page }) => {
        await test.expect.poll(() => { throw new Error('foo bar baz'); }, { timeout: 100 }).toBe(42);
      });
    `
  });
  expect(result.exitCode).toBe(1);
  expect(stripAnsi(result.output)).toContain('foo bar baz');
});

test('should support .not predicate', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.spec.ts': `
      const { test } = pwt;
      test('should fail', async ({ page }) => {
        let i = 0;
        await test.expect.poll(() => ++i).not.toBeLessThan(3);
        expect(i).toBe(3);
      });
    `
  });
  expect(result.exitCode).toBe(0);
});
