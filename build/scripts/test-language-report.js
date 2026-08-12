// build/scripts/test-language-report.js
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
    createBuildTranslationSuggestions
} = require('../language/translation/deepl-translation-service');

const SOURCE_ROOT = path.resolve(__dirname, '..', '..');

function copyFixture(rootDir) {
    fs.cpSync(path.join(SOURCE_ROOT, 'language'), path.join(rootDir, 'language'), { recursive: true });
    fs.copyFileSync(path.join(SOURCE_ROOT, 'package.json'), path.join(rootDir, 'package.json'));

    const components = JSON.parse(fs.readFileSync(
        path.join(rootDir, 'language', 'canonical', 'components.json'),
        'utf8'
    ));
    for (const inventoryEntry of components.migrationInventory?.scanFiles || []) {
        const relativePath = inventoryEntry.path;
        const source = path.join(SOURCE_ROOT, relativePath);
        if (!fs.existsSync(source)) { continue; }
        const destination = path.join(rootDir, relativePath);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(source, destination);
    }
    fs.appendFileSync(path.join(rootDir, 'src', 'server', 'parser.js'), [
        '',
        'const migrationPotentialFixture = "Potential parser message";',
        'const migrationCatalogFixture = "Unexpected token \'{token}\'";',
        ''
    ].join('\n'), 'utf8');

    const scriptsDir = path.join(rootDir, 'build', 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.copyFileSync(
        path.join(SOURCE_ROOT, 'build', 'scripts', 'build-language.js'),
        path.join(scriptsDir, 'build-language.js')
    );
    fs.cpSync(
        path.join(SOURCE_ROOT, 'build', 'language', 'translation'),
        path.join(rootDir, 'build', 'language', 'translation'),
        { recursive: true }
    );
}

function registeredLocaleCount(rootDir) {
    return JSON.parse(fs.readFileSync(
        path.join(rootDir, 'language', 'locales', 'locales.json'),
        'utf8'
    )).locales.length;
}

function run(buildScript, action, rootDir, environment = {}) {
    const args = Array.isArray(action) ? action : [action];
    return spawnSync(process.execPath, [buildScript, ...args], {
        cwd: rootDir,
        encoding: 'utf8',
        env: { ...process.env, DeeplApi: '', DEEPL_API_KEY: '', ...environment },
        maxBuffer: 10 * 1024 * 1024
    });
}

function runNpm(action, rootDir, environment = {}) {
    const args = Array.isArray(action) ? action : [action];
    const executable = process.platform === 'win32' ? process.env.ComSpec : 'npm';
    const commandArgs = process.platform === 'win32'
        ? ['/d', '/s', '/c', 'npm.cmd', ...args]
        : args;
    return spawnSync(executable, commandArgs, {
        cwd: rootDir,
        encoding: 'utf8',
        env: { ...process.env, DeeplApi: '', DEEPL_API_KEY: '', ...environment },
        maxBuffer: 10 * 1024 * 1024
    });
}

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-language-report-'));
try {
    copyFixture(fixtureRoot);
    const fixtureLocaleCount = registeredLocaleCount(fixtureRoot);
    const buildScript = path.join(fixtureRoot, 'build', 'scripts', 'build-language.js');
    const englishDir = path.join(fixtureRoot, 'language', 'locales', 'en');
    const legacyOverride = path.join(englishDir, 'catalog.json');
    fs.copyFileSync(path.join(englishDir, 'catalogOverrides.json'), legacyOverride);

    let result = run(buildScript, 'validate', fixtureRoot);
    assert.notStrictEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /Legacy locale override filename found for en/);
    fs.rmSync(legacyOverride, { force: true });

    result = run(buildScript, 'validate', fixtureRoot);
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /- fr-CA: missing \(build\/language\/catalogs\/fr-CA\)/);

    const catalogsDir = path.join(fixtureRoot, 'build', 'language', 'catalogs');
    fs.mkdirSync(catalogsDir, { recursive: true });
    const invalidEnglishPath = path.join(catalogsDir, 'en');
    fs.writeFileSync(invalidEnglishPath, 'not a directory\n', 'utf8');

    result = run(buildScript, 'validate', fixtureRoot);
    assert.notStrictEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /Catalog output path for locale en is not a directory/);
    assert.strictEqual(fs.existsSync(path.join(fixtureRoot, 'build', 'language', 'reports')), false);
    fs.rmSync(invalidEnglishPath, { force: true });

    const rootSentinel = path.join(catalogsDir, 'retain-root.txt');
    const chineseDir = path.join(catalogsDir, 'zh-Hans');
    const chineseSentinel = path.join(chineseDir, 'retain-locale.txt');
    const chineseTranslation = path.join(chineseDir, 'extension.json');
    fs.writeFileSync(rootSentinel, 'retain root\n', 'utf8');
    fs.mkdirSync(chineseDir);
    fs.writeFileSync(chineseSentinel, 'retain locale\n', 'utf8');
    const preservedChineseEntry = {
        fallbackLocale: null,
        placeholders: [],
        sourceStatus: 'approved',
        status: 'reviewed',
        text: '分析师保留'
    };
    fs.writeFileSync(chineseTranslation, `${JSON.stringify({
        locale: 'zh-Hans',
        component: 'extension',
        manualTranslation: '保留',
        entries: {
            'extension.product.displayName': preservedChineseEntry
        }
    })}\n`, 'utf8');

    result = run(buildScript, 'report', fixtureRoot);
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stderr, /Translation API: DeepL is not configured in this process/);
    assert.match(result.stderr, /API translation fr-CA: DeepL API is not configured/);
    assert.match(result.stdout, /Translation API result: 0 suggestion\(s\), \d+ warning\(s\)/);
    assert.strictEqual(fs.readFileSync(rootSentinel, 'utf8'), 'retain root\n');
    assert.strictEqual(fs.readFileSync(chineseSentinel, 'utf8'), 'retain locale\n');
    const chineseCatalogAfterUpdate = JSON.parse(fs.readFileSync(chineseTranslation, 'utf8'));
    assert.equal(chineseCatalogAfterUpdate.manualTranslation, '保留');
    assert.deepStrictEqual(
        chineseCatalogAfterUpdate.entries['extension.product.displayName'],
        preservedChineseEntry
    );
    assert.ok(Object.keys(chineseCatalogAfterUpdate.entries).length > 1);
    assert.strictEqual(fs.existsSync(path.join(chineseDir, 'parser.json')), true);
    const chineseTranslationAfterUpdate = fs.readFileSync(chineseTranslation);

    const frenchCanadianCatalog = path.join(catalogsDir, 'fr-CA', 'extension.json');
    assert.strictEqual(fs.existsSync(frenchCanadianCatalog), true);
    const frenchCanadianBefore = fs.readFileSync(frenchCanadianCatalog);

    const reportPath = path.join(fixtureRoot, 'build', 'language', 'reports', 'language-report.txt');
    assert.strictEqual(fs.existsSync(reportPath), true);
    const report = fs.readFileSync(reportPath, 'utf8');
    assert.match(report, /^MYDEFRAG LANGUAGE REPORT\r?\n/);
    assert.match(report, /CATALOG GENERATION/);
    assert.match(report, /zh-Hans\s+\| updated-existing/);
    assert.match(report, /fr-CA\s+\| generated/);
    assert.match(report, /TRANSLATION COMPLETENESS/);
    assert.match(report, /Translation mode: deepl/);
    assert.match(report, /DeepL API calls: 0/);
    assert.match(report, /DeepL source characters passed: 0/);
    assert.match(report, /en\s+\| approved\s+\| \d+\/\d+ \(100\.0%\)/);
    assert.match(report, /KEYWORD COLLISIONS\r?\n-+\r?\nNone\./);
    assert.match(report, /MIGRATION CANDIDATE INVENTORY/);
    assert.match(report, /src\/server\/parser\.js \[parser\]/);
    assert.match(report, /Component: parser/);
    assert.match(report, /Non-catalog candidates: \d+/);
    assert.match(report, /Line \d+ \[(?:potential|review|rejected|code-edit|code-updated|in-catalog)\]:/);
    assert.match(report, /Found in catalog: \d+/);
    assert.match(
        report,
        /^Line \d+ \[in-catalog\]: MyDefrag Script \| Catalog: package\.contributes\.languages\.aliases$/m
    );
    assert.doesNotMatch(
        report,
        /^Line \d+ \[(?:in-catalog|code-edit|code-updated)\]:[^\r\n]*\r?\n\s+Catalog:/m
    );
    assert.strictEqual(result.stdout.includes(report), true);
    assert.match(
        result.stdout.replace(/\\/g, '/'),
        /Human-readable report written to build\/language\/reports\/language-report\.txt/
    );

    const migrationReport = JSON.parse(fs.readFileSync(
        path.join(fixtureRoot, 'build', 'language', 'reports', 'migration-report.json'),
        'utf8'
    ));
    const parserMigration = migrationReport.files.find((file) => file.file === 'src/server/parser.js');
    assert.ok(parserMigration.candidates.length > 0);
    assert.ok(parserMigration.catalogedStrings.length > 0);
    assert.equal(
        parserMigration.catalogedStrings.find((item) => item.text === "Unexpected token '{token}'")
            .catalogEntries[0].key,
        'parser.diagnostic.unexpectedToken.message'
    );
    const extensionMigration = migrationReport.files.find((file) => file.file === 'src/extension.js');
    const priorNoDocumentCandidate = extensionMigration.catalogedStrings.find(
        (item) => item.text === 'No MyDefrag document is active.' && item.historical === true
    );
    const currentNoDocumentKey = extensionMigration.catalogedStrings.find(
        (item) => item.text === 'extension.message.noActiveDocument.warning'
    );
    assert.equal(priorNoDocumentCandidate.status, 'code-updated');
    assert.equal(
        priorNoDocumentCandidate.catalogEntries[0].key,
        'extension.message.noActiveDocument.warning'
    );
    assert.equal(currentNoDocumentKey.status, 'in-catalog');
    assert.equal(currentNoDocumentKey.catalogReference.kind, 'catalog.format-key');
    assert.match(
        report,
        /Line \d+ \[code-updated\]: No MyDefrag document is active\. \| Catalog: extension\.message\.noActiveDocument\.warning/
    );
    assert.match(
        report,
        /Line \d+ \[in-catalog\]: extension\.message\.noActiveDocument\.warning \| Catalog: extension\.message\.noActiveDocument\.warning/
    );
    const parserCandidate = parserMigration.candidates[0];
    assert.equal(typeof parserCandidate.fullLine, 'string');
    assert.equal(parserCandidate.fullLine, fs.readFileSync(
        path.join(fixtureRoot, 'src', 'server', 'parser.js'),
        'utf8'
    ).split(/\r?\n/)[parserCandidate.line - 1]);

    const buildReport = JSON.parse(fs.readFileSync(
        path.join(fixtureRoot, 'build', 'language', 'reports', 'language-build-report.json'),
        'utf8'
    ));
    assert.equal(buildReport.catalogLocales.length, fixtureLocaleCount);
    assert.equal(
        buildReport.catalogLocales.find((locale) => locale.locale === 'zh-Hans').status,
        'updated-existing'
    );
    assert.equal(
        buildReport.catalogLocales.find((locale) => locale.locale === 'fr-CA').status,
        'generated'
    );

    result = run(buildScript, 'build', fixtureRoot);
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.match(
        result.stdout,
        /Translation API: not requested; no missing generated catalog entries/
    );
    assert.match(result.stdout, /Translation API result: 0 suggestion\(s\), 0 warning\(s\)/);
    assert.match(
        result.stdout,
        new RegExp(`Catalog locales: 0 generated, 0 updated existing, ${fixtureLocaleCount} unchanged existing, 0 skipped existing`)
    );
    assert.match(result.stdout, /Catalog entries added: 0/);
    assert.deepStrictEqual(fs.readFileSync(frenchCanadianCatalog), frenchCanadianBefore);
    assert.deepStrictEqual(fs.readFileSync(chineseTranslation), chineseTranslationAfterUpdate);
    assert.strictEqual(fs.readFileSync(chineseSentinel, 'utf8'), 'retain locale\n');
} finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

const invalidOutputFixtureRoot = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'mydefrag-language-invalid-output-'
));
try {
    copyFixture(invalidOutputFixtureRoot);
    const buildScript = path.join(
        invalidOutputFixtureRoot,
        'build',
        'scripts',
        'build-language.js'
    );
    const chineseDir = path.join(
        invalidOutputFixtureRoot,
        'build',
        'language',
        'catalogs',
        'zh-Hans'
    );
    fs.mkdirSync(chineseDir, { recursive: true });
    const preservedPath = path.join(chineseDir, 'extension.json');
    const invalidPath = path.join(chineseDir, 'parser.json');
    fs.writeFileSync(preservedPath, '{"entries":{"analyst.key":{"text":"keep"}}}\n', 'utf8');
    fs.writeFileSync(invalidPath, '{ invalid json\n', 'utf8');
    const preservedBefore = fs.readFileSync(preservedPath);

    let result = run(buildScript, 'validate', invalidOutputFixtureRoot);
    assert.notStrictEqual(result.status, 0);
    assert.match(
        `${result.stdout}${result.stderr}`,
        /Cannot update existing catalog zh-Hans\/parser/
    );

    result = run(buildScript, 'build', invalidOutputFixtureRoot);
    assert.notStrictEqual(result.status, 0);
    assert.match(
        `${result.stdout}${result.stderr}`,
        /Cannot update existing catalog zh-Hans\/parser/
    );
    assert.deepStrictEqual(fs.readFileSync(preservedPath), preservedBefore);
    assert.strictEqual(
        fs.existsSync(path.join(invalidOutputFixtureRoot, 'build', 'language', 'reports')),
        false
    );
} finally {
    fs.rmSync(invalidOutputFixtureRoot, { recursive: true, force: true });
}

const normalizedFixtureRoot = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'mydefrag-language-normalized-'
));
try {
    copyFixture(normalizedFixtureRoot);
    const normalizedFixtureLocaleCount = registeredLocaleCount(normalizedFixtureRoot);
    const buildScript = path.join(
        normalizedFixtureRoot,
        'build',
        'scripts',
        'build-language.js'
    );
    const result = run(
        buildScript,
        ['build', '--UseNormalized'],
        normalizedFixtureRoot,
        {
            DeeplApi: 'must-not-be-used',
            DEEPL_API_URL: 'http://127.0.0.1:1'
        }
    );
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.match(
        result.stdout,
        /Normalized English: Translation API bypassed; generating normalized draft values/
    );
    assert.match(result.stdout, /Normalized English result: \d+ value\(s\), 0 warning\(s\)/);
    assert.doesNotMatch(result.stdout, /Translation API: DeepL configured/);
    assert.doesNotMatch(result.stderr, /API translation|DeepL/);

    const extensionCatalogPath = path.join(
        normalizedFixtureRoot,
        'build',
        'language',
        'catalogs',
        'fr-CA',
        'extension.json'
    );
    const extensionCatalog = JSON.parse(fs.readFileSync(extensionCatalogPath, 'utf8'));
    assert.deepStrictEqual(extensionCatalog.entries['extension.product.displayName'], {
        fallbackLocale: 'en',
        placeholders: [],
        sourceStatus: 'approved',
        status: 'draft',
        text: 'My Defragmenter Script (.MyDc / .MyD)'
    });
    const diagnosticCatalog = JSON.parse(fs.readFileSync(path.join(
        normalizedFixtureRoot,
        'build',
        'language',
        'catalogs',
        'fr-CA',
        'diagnosticExplorer.json'
    ), 'utf8'));
    assert.equal(
        diagnosticCatalog.entries['diagnosticExplorer.status.hasDiagnostics.text'].text,
        '$(warning) My Defragmenter {index}/{total}'
    );

    const completeness = JSON.parse(fs.readFileSync(path.join(
        normalizedFixtureRoot,
        'build',
        'language',
        'reports',
        'translation-completeness.json'
    ), 'utf8'));
    const frenchCanadian = completeness.locales.find((locale) => locale.locale === 'fr-CA');
    assert.equal(frenchCanadian.entries.machineGenerated, 0);
    assert.equal(frenchCanadian.entries.translated, 0);
    assert.equal(frenchCanadian.entries.fallback, frenchCanadian.entries.total);

    const preservedKey = 'extension.product.displayName';
    const missingKey = Object.keys(extensionCatalog.entries)
        .find((key) => key !== preservedKey);
    assert.ok(missingKey);
    const analystEntry = {
        ...extensionCatalog.entries[preservedKey],
        fallbackLocale: null,
        status: 'reviewed',
        text: 'Analyst approved display name'
    };
    extensionCatalog.entries[preservedKey] = analystEntry;
    delete extensionCatalog.entries[missingKey];
    fs.writeFileSync(extensionCatalogPath, `${JSON.stringify(extensionCatalog, null, 2)}\n`, 'utf8');

    const secondResult = run(
        buildScript,
        ['build', '--UseNormalized'],
        normalizedFixtureRoot,
        { DeeplApi: 'must-not-be-used' }
    );
    assert.strictEqual(secondResult.status, 0, secondResult.stderr || secondResult.stdout);
    assert.match(
        secondResult.stdout,
        /Normalized English: Translation API bypassed; generating normalized draft values for 1 locale\(s\) with missing entries: fr-CA/
    );
    assert.match(secondResult.stdout, /Normalized English result: 1 value\(s\), 0 warning\(s\)/);
    assert.match(
        secondResult.stdout,
        new RegExp(`Catalog locales: 0 generated, 1 updated existing, ${normalizedFixtureLocaleCount - 1} unchanged existing, 0 skipped existing`)
    );
    assert.match(secondResult.stdout, /Catalog entries added: 1/);
    const extensionCatalogAfterUpdate = JSON.parse(fs.readFileSync(extensionCatalogPath, 'utf8'));
    assert.deepStrictEqual(extensionCatalogAfterUpdate.entries[preservedKey], analystEntry);
    assert.ok(extensionCatalogAfterUpdate.entries[missingKey]);
    const extensionAfterUpdateBytes = fs.readFileSync(extensionCatalogPath);
    const normalizedBuildReport = JSON.parse(fs.readFileSync(path.join(
        normalizedFixtureRoot,
        'build',
        'language',
        'reports',
        'language-build-report.json'
    ), 'utf8'));
    assert.deepStrictEqual(normalizedBuildReport.translation, {
        mode: 'normalized',
        deepLApiCalls: 0,
        deepLCharactersPassed: 0
    });
    assert.equal(
        normalizedBuildReport.catalogLocales.find((locale) => locale.locale === 'fr-CA').status,
        'updated-existing'
    );
    assert.equal(
        normalizedBuildReport.catalogLocales.find((locale) => locale.locale === 'fr-CA').entriesAdded,
        1
    );

    const thirdResult = run(
        buildScript,
        ['build', '--UseNormalized'],
        normalizedFixtureRoot,
        { DeeplApi: 'must-not-be-used' }
    );
    assert.strictEqual(thirdResult.status, 0, thirdResult.stderr || thirdResult.stdout);
    assert.match(
        thirdResult.stdout,
        /Normalized English: not generated; no missing generated catalog entries/
    );
    assert.match(
        thirdResult.stdout,
        new RegExp(`Catalog locales: 0 generated, 0 updated existing, ${normalizedFixtureLocaleCount} unchanged existing, 0 skipped existing`)
    );
    assert.match(thirdResult.stdout, /Catalog entries added: 0/);
    assert.deepStrictEqual(fs.readFileSync(extensionCatalogPath), extensionAfterUpdateBytes);
} finally {
    fs.rmSync(normalizedFixtureRoot, { recursive: true, force: true });
}

const npmNormalizedFixtureRoot = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'mydefrag-language-npm-normalized-'
));
try {
    copyFixture(npmNormalizedFixtureRoot);
    const result = runNpm(
        ['run', 'language:build', '--UseNormalized'],
        npmNormalizedFixtureRoot,
        {
            DeeplApi: 'must-not-be-used',
            DEEPL_API_URL: 'http://127.0.0.1:1'
        }
    );
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.match(
        result.stdout,
        /Normalized English: Translation API bypassed; generating normalized draft values/
    );
    assert.match(result.stdout, /Normalized English result: \d+ value\(s\), 0 warning\(s\)/);
    assert.doesNotMatch(result.stdout, /Translation API: DeepL configured/);
    assert.doesNotMatch(result.stderr, /API translation|DeepL request/);
    assert.match(result.stdout, /DeepL API usage: 0 call\(s\), 0 source character\(s\) passed/);

    const catalog = JSON.parse(fs.readFileSync(path.join(
        npmNormalizedFixtureRoot,
        'build',
        'language',
        'catalogs',
        'fr-CA',
        'extension.json'
    ), 'utf8'));
    assert.equal(
        catalog.entries['extension.product.displayName'].text,
        'My Defragmenter Script (.MyDc / .MyD)'
    );
    assert.equal(catalog.entries['extension.product.displayName'].status, 'draft');
    assert.equal(catalog.entries['extension.product.displayName'].fallbackLocale, 'en');
    const npmBuildReport = JSON.parse(fs.readFileSync(path.join(
        npmNormalizedFixtureRoot,
        'build',
        'language',
        'reports',
        'language-build-report.json'
    ), 'utf8'));
    assert.deepStrictEqual(npmBuildReport.translation, {
        mode: 'normalized',
        deepLApiCalls: 0,
        deepLCharactersPassed: 0
    });
} finally {
    fs.rmSync(npmNormalizedFixtureRoot, { recursive: true, force: true });
}

async function verifyDeepLKeyScope() {
    const requests = [];
    const translator = {
        info: () => ({ configured: true, provider: 'DeepL' }),
        translateTexts: async (request) => {
            requests.push(request);
            return {
                results: request.items.map(() => ({
                    ok: true,
                    provider: 'DeepL',
                    text: 'Nouvelle clé'
                }))
            };
        }
    };
    const state = {
        catalog: {
            entries: [
                { key: 'parser.existing', component: 'parser', text: 'Existing key', placeholders: [] },
                { key: 'parser.new', component: 'parser', text: 'New key', placeholders: [] }
            ]
        },
        locales: { locales: [{ id: 'en' }, { id: 'fr-CA' }] },
        localeCatalogs: { 'fr-CA': { entries: [] } },
        normalizedWords: []
    };

    const translation = await createBuildTranslationSuggestions(state, {
        translator,
        localeIds: ['fr-CA'],
        entryKeysByLocale: { 'fr-CA': ['parser.new'] }
    });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].items.length, 1);
    assert.equal(requests[0].items[0].text, 'New key');
    assert.deepStrictEqual(Object.keys(translation.suggestions['fr-CA']), ['parser.new']);
}

void verifyDeepLKeyScope().then(() => {
    console.log('Language report, additive catalog update, and scoped translation tests passed');
}).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
