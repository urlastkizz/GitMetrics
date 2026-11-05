import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import manifest from '../../package.json';

const stages = ['typecheck', 'lint', 'test'];

function runNpm(args: string[], cwd = process.cwd()) {
  // npm supplies its CLI path, avoiding platform-specific npm.cmd execution.
  const npmCli = z.string().min(1).parse(process.env.npm_execpath);
  return spawnSync(process.execPath, [npmCli, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 30_000,
    env: { ...process.env, npm_config_offline: 'true' },
  });
}

function runPublicationChecks(failingStage?: string) {
  const directory = mkdtempSync(join(tmpdir(), 'gitmetrics-publish-'));
  try {
    const { scripts } = z
      .object({ scripts: z.object({ prepublishOnly: z.string() }) })
      .parse(manifest);
    writeFileSync(
      join(directory, 'package.json'),
      JSON.stringify({
        private: true,
        scripts: {
          prepublishOnly: scripts.prepublishOnly,
          ...Object.fromEntries(
            stages.map((stage) => [stage, `node check.cjs ${stage}`]),
          ),
        },
      }),
    );
    writeFileSync(
      join(directory, 'check.cjs'),
      `const { appendFileSync } = require('node:fs');
const stage = process.argv[2];
appendFileSync('stages.txt', stage + '\\n');
if (stage === ${JSON.stringify(failingStage ?? '')}) process.exit(1);
`,
    );

    const result = runNpm(['run', 'prepublishOnly'], directory);
    const executed = readFileSync(join(directory, 'stages.txt'), 'utf8')
      .trim()
      .split('\n');
    return { result, executed };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function withCleanPackage(check: (directory: string) => void) {
  const directory = mkdtempSync(join(tmpdir(), 'gitmetrics-clean-package-'));
  try {
    for (const path of ['src', 'tsup.config.ts', 'README.md', 'LICENSE']) {
      cpSync(path, join(directory, path), { recursive: true });
    }
    symlinkSync(
      resolve('node_modules'),
      join(directory, 'node_modules'),
      'junction',
    );
    writeFileSync(
      join(directory, 'package.json'),
      JSON.stringify({
        ...manifest,
        scripts: {
          ...manifest.scripts,
          // Exercise npm's lifecycle without recursively running this suite.
          ...Object.fromEntries(
            stages.map((stage) => [stage, 'node --version']),
          ),
        },
      }),
    );
    expect(existsSync(join(directory, 'dist'))).toBe(false);
    check(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('npm package contract', () => {
  it('defines the public package metadata and distributable allowlist', () => {
    expect(manifest).toMatchObject({
      name: '@urlastkizz/gitmetrics',
      publishConfig: { access: 'public' },
      description: expect.any(String),
      keywords: expect.arrayContaining(['github', 'cli']),
      license: 'MIT',
      repository: {
        type: 'git',
        url: 'git+https://github.com/urlastkizz/GitMetrics.git',
      },
      bugs: { url: 'https://github.com/urlastkizz/GitMetrics/issues' },
      homepage: 'https://github.com/urlastkizz/GitMetrics#readme',
      bin: { gitmetrics: 'dist/index.js' },
      engines: { node: '>=22.13.0' },
      files: ['dist', 'README.md', 'LICENSE'],
    });
  });

  it('runs all publication checks in order', () => {
    const { result, executed } = runPublicationChecks();
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(executed).toEqual(stages);
  }, 30_000);

  it.each(stages)(
    'aborts publication checks when %s fails',
    (stage) => {
      const { result, executed } = runPublicationChecks(stage);
      expect(result.error).toBeUndefined();
      expect(result.status).not.toBeNull();
      expect(result.status).not.toBe(0);
      expect(executed).toEqual(stages.slice(0, stages.indexOf(stage) + 1));
    },
    30_000,
  );
});

describe('npm production artifact', () => {
  it.each(['publish', 'pack'])(
    '%s builds a clean checkout before collecting package contents',
    (command) => {
      withCleanPackage((directory) => {
        // Avoid consulting registry state for this already-published version.
        const args =
          command === 'publish'
            ? ['publish', '--dry-run', '--force']
            : ['pack', '--dry-run'];
        const result = runNpm(args, directory);
        expect(result.error).toBeUndefined();
        expect(result.status, result.stderr).toBe(0);
        expect(result.stdout + result.stderr).toContain('dist/index.js');
        // npm 11 checks bin existence before lifecycle scripts can build it.
        expect(result.stderr).not.toMatch(
          /bin\[gitmetrics\].*invalid and removed/i,
        );
        expect(result.stderr).not.toContain('npm auto-corrected');
        expect(readFileSync(join(directory, 'dist/index.js'), 'utf8')).toMatch(
          /^#!\/usr\/bin\/env node/,
        );
        expect((result.stdout.match(/> tsup/g) ?? []).length).toBe(1);
      });
    },
    30_000,
  );

  it('installs a tarball built from a clean checkout with a working CLI bin', () => {
    withCleanPackage((directory) => {
      const packed = runNpm(['pack', '--silent'], directory);
      expect(packed.error).toBeUndefined();
      expect(packed.status, packed.stderr).toBe(0);
      const filename = z
        .string()
        .regex(/\.tgz$/)
        .parse(packed.stdout.trim().split(/\r?\n/).at(-1));
      expect(filename).toMatch(/\.tgz$/);
      const installation = mkdtempSync(join(tmpdir(), 'gitmetrics-install-'));
      try {
        writeFileSync(
          join(installation, 'package.json'),
          JSON.stringify({
            private: true,
            // Reuse npm ci's dependencies without registry metadata or cache.
            overrides: Object.fromEntries(
              Object.keys(manifest.dependencies).map((dependency) => [
                dependency,
                `file:${relative(installation, resolve('node_modules', dependency)).split(sep).join('/')}`,
              ]),
            ),
          }),
        );
        const installed = runNpm(
          [
            'install',
            '--ignore-scripts',
            '--no-audit',
            '--no-fund',
            '--cache',
            join(installation, 'npm-cache'),
            join(directory, filename),
          ],
          installation,
        );
        expect(installed.error).toBeUndefined();
        expect(installed.status, installed.stderr).toBe(0);
        const installedManifest: unknown = JSON.parse(
          readFileSync(
            join(
              installation,
              'node_modules/@urlastkizz/gitmetrics/package.json',
            ),
            'utf8',
          ),
        );
        expect(installedManifest).toMatchObject({
          bin: { gitmetrics: 'dist/index.js' },
          dependencies: manifest.dependencies,
        });
        const version = runNpm(
          ['exec', '--', 'gitmetrics', '--version'],
          installation,
        );
        expect(version.error).toBeUndefined();
        expect(version.status, version.stderr).toBe(0);
        expect(version.stdout.trim()).toBe(manifest.version);
      } finally {
        rmSync(installation, { recursive: true, force: true });
      }
    });
  }, 30_000);

  beforeAll(() => {
    const result = runNpm(['run', 'build']);
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
  }, 30_000);

  it('preserves the executable shebang in the production build', () => {
    const executable = readFileSync('dist/index.js', 'utf8');
    expect(executable.split(/\r?\n/)[0]).toBe('#!/usr/bin/env node');
  });

  it('packs only runtime artifacts and public documentation', () => {
    const result = runNpm(['pack', '--dry-run', '--json', '--ignore-scripts']);
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    const packages = z
      .array(
        z.object({
          version: z.string(),
          files: z.array(z.object({ path: z.string() })),
        }),
      )
      .parse(JSON.parse(result.stdout));
    expect(packages).toHaveLength(1);
    expect(packages[0]?.version).toBe(manifest.version);
    const paths = packages.flatMap((packed) =>
      packed.files.map((file) => file.path),
    );
    expect(paths).toEqual(
      expect.arrayContaining([
        'package.json',
        'README.md',
        'LICENSE',
        'dist/index.js',
      ]),
    );
    for (const path of paths) {
      expect(path).toMatch(/^(package\.json|README\.md|LICENSE|dist\/.+)$/);
      expect(path).not.toMatch(
        /(^|\/)(tests?|\.env[^/]*|\.codex|\.github|agents)(\/|$)|\.test\./i,
      );
    }
  }, 30_000);
});
