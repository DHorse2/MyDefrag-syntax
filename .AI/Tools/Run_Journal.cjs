// .AI/Tools/Run_Journal.cjs
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const DOMAIN_NAMES = [
  'Configuration',
  'State',
  'Journal',
  'Prompt',
  'Cache',
  'Logs',
  'Temp'
];

/**
 * Gets the current machine name using Node's operating-system API.
 *
 * @returns {string} Normalized computer name.
 */
function getComputerName() {
  return os.hostname() || process.env.COMPUTERNAME || process.env.HOSTNAME || 'UNKNOWN-COMPUTER';
}

/**
 * Gets the current user name without requiring shell-specific environment variables.
 *
 * @returns {string} User name when available.
 */
function getUserName() {
  try {
    const info = os.userInfo();
    return info && info.username ? info.username : 'unknown';
  } catch (_error) {
    return process.env.USERNAME || process.env.USER || 'unknown';
  }
}

/**
 * Generates the globally unique execution identifier used across run artifacts.
 *
 * @returns {string} UUID value.
 */
function generateExecutionId() {
  return generateShortExecutionId();
}

/**
 * Generates a short collision-resistant execution identifier for run folders.
 *
 * @returns {string} Eight hexadecimal characters.
 */
function generateShortExecutionId() {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Formats a date for the portable run archive folder name.
 *
 * @param {Date} date Date to format.
 * @returns {string} Local timestamp in YYYYMMDD-HHMM format.
 */
function formatRunFolderTimestamp(date = new Date()) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}-${hour}${minute}`;
}

/**
 * Formats a date for the portable run archive date partition.
 *
 * @param {Date} date Date to format.
 * @returns {string} Local date in YYYY-MM-DD format.
 */
function formatRunDate(date = new Date()) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Sanitizes a human-readable execution label for use in a folder name.
 *
 * @param {unknown} value Raw label value.
 * @returns {string} Safe folder-name label.
 */
function sanitizeExecutionLabel(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 80);
}

/**
 * Gets the optional human-readable execution label.
 *
 * @param {object} context Execution context.
 * @param {object} options Archive options.
 * @returns {string} Safe execution label.
 */
function getExecutionFolderLabel(context, options = {}) {
  const taskLabels = parseListOption(options.tasks, context.tasks);
  const label = options.executionLabel || options.label || taskLabels[0] || context.executionLabel;

  return sanitizeExecutionLabel(label);
}

/**
 * Resolves the AI root used for computer-scoped local execution data.
 *
 * @param {object} options Resolution options.
 * @param {string} [options.aiRoot] Explicit AI root.
 * @param {string} [options.projectRoot] Project root that may contain .AI.
 * @returns {string} Absolute AI root path.
 */
function resolveAiRoot(options = {}) {
  if (options.aiRoot) {
    return path.resolve(options.aiRoot);
  }

  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  const localAiRoot = path.join(projectRoot, '.AI');

  if (fs.existsSync(localAiRoot)) {
    return localAiRoot;
  }

  return path.resolve('D:\\AI\\.AI');
}

/**
 * Creates the computer-scoped local domain folders without changing shared domains.
 *
 * @param {string} aiRoot AI workspace root.
 * @param {string} computerName Current computer name.
 * @returns {object} Domain path map.
 */
function ensureComputerFolders(aiRoot, computerName = getComputerName()) {
  const computerRoot = path.join(aiRoot, 'Computers', computerName);
  const paths = {
    computerRoot
  };

  for (const domainName of DOMAIN_NAMES) {
    const domainPath = path.join(computerRoot, domainName);
    fs.mkdirSync(domainPath, { recursive: true });
    paths[domainName] = domainPath;
  }

  return paths;
}

/**
 * Creates a run context with a unique execution identity and computer-local paths.
 *
 * @param {object} options Context options.
 * @param {string} [options.aiRoot] Explicit AI root.
 * @param {string} [options.projectRoot] Project root.
 * @param {string} [options.workingDirectory] Working directory.
 * @param {string} [options.parentExecutionId] Optional parent execution ID.
 * @param {string} [options.agent] Agent name.
 * @param {string[]} [options.projectIds] Associated project IDs.
 * @param {string[]} [options.todoIds] Associated TODO IDs.
 * @param {string[]} [options.requirementIds] Associated requirement IDs.
 * @param {string[]} [options.procedureIds] Associated procedure IDs.
 * @returns {object} Execution context.
 */
function createExecutionContext(options = {}) {
  const aiRoot = resolveAiRoot(options);
  const computerName = options.computerName || getComputerName();
  const paths = ensureComputerFolders(aiRoot, computerName);
  const startedAt = options.startedAt || new Date().toISOString();

  return {
    executionId: options.executionId || generateExecutionId(),
    parentExecutionId: options.parentExecutionId || null,
    childExecutionIds: options.childExecutionIds || [],
    startedAt,
    finishedAt: options.finishedAt || null,
    status: options.status || 'running',
    executionLabel: options.executionLabel || options.label || null,
    computerName,
    userName: options.userName || getUserName(),
    agent: options.agent || options.initiatingAgent || 'codex',
    initiatingAgent: options.initiatingAgent || options.agent || 'codex',
    agents: options.agents || [options.agent || options.initiatingAgent || 'codex'],
    projects: options.projects || [],
    tasks: options.tasks || [],
    promptPaths: options.promptPaths || [],
    outputs: options.outputs || [],
    artifacts: options.artifacts || [],
    projectIds: options.projectIds || options.projects || [],
    todoIds: options.todoIds || [],
    requirementIds: options.requirementIds || [],
    procedureIds: options.procedureIds || [],
    projectRoot: path.resolve(options.projectRoot || process.cwd()),
    workingDirectory: path.resolve(options.workingDirectory || process.cwd()),
    aiRoot,
    paths
  };
}

/**
 * Ensures a value is represented as an array.
 *
 * @param {unknown} value Value to normalize.
 * @returns {unknown[]} Array value.
 */
function asArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

/**
 * Creates the portable run archive folder for an execution.
 *
 * @param {object} context Execution context.
 * @param {object} [options] Archive options.
 * @param {string} [options.runsRoot] Explicit runs root.
 * @param {Date} [options.startedAtDate] Date used for folder naming.
 * @returns {object} Portable run archive path information.
 */
function ensurePortableRunFolder(context, options = {}) {
  if (options.runFolder) {
    const runFolder = path.isAbsolute(options.runFolder)
      ? path.resolve(options.runFolder)
      : path.resolve(context.projectRoot, options.runFolder);

    fs.mkdirSync(runFolder, { recursive: true });

    context.runArchive = {
      runsRoot: path.dirname(path.dirname(runFolder)),
      dateFolder: path.basename(path.dirname(runFolder)),
      folderName: path.basename(runFolder),
      runFolder,
      manifestPath: path.join(runFolder, 'execution.json'),
      journalPath: path.join(runFolder, 'journal.jsonl'),
      summaryPath: path.join(runFolder, 'execution-record.md')
    };

    return context.runArchive;
  }

  const startedAtDate = options.startedAtDate || new Date(context.startedAt);
  const runsRoot = path.resolve(options.runsRoot || path.join(context.projectRoot, 'runs'));
  const dateFolder = formatRunDate(startedAtDate);
  const executionLabel = getExecutionFolderLabel(context, options);
  const folderName = executionLabel
    ? `${formatRunFolderTimestamp(startedAtDate)}_${context.executionId}_${executionLabel}`
    : `${formatRunFolderTimestamp(startedAtDate)}_${context.executionId}`;
  const runFolder = path.join(runsRoot, dateFolder, folderName);

  fs.mkdirSync(runFolder, { recursive: true });

  context.runArchive = {
    runsRoot,
    dateFolder,
    folderName,
    runFolder,
    manifestPath: path.join(runFolder, 'execution.json'),
    journalPath: path.join(runFolder, 'journal.jsonl'),
    summaryPath: path.join(runFolder, 'execution-record.md')
  };

  return context.runArchive;
}

/**
 * Creates the authoritative portable execution manifest.
 *
 * @param {object} context Execution context.
 * @param {object} [fields] Manifest overrides.
 * @returns {object} Execution manifest.
 */
function createExecutionManifest(context, fields = {}) {
  return {
    schemaVersion: '1.0',
    executionId: context.executionId,
    startedAt: context.startedAt,
    finishedAt: fields.finishedAt === undefined ? context.finishedAt : fields.finishedAt,
    status: fields.status || context.status || 'running',
    computerName: context.computerName,
    initiatingAgent: context.initiatingAgent || context.agent,
    agents: asArray(fields.agents || context.agents),
    projects: asArray(fields.projects || context.projects),
    tasks: asArray(fields.tasks || context.tasks),
    promptPaths: asArray(fields.promptPaths || context.promptPaths),
    outputs: asArray(fields.outputs || context.outputs),
    artifacts: asArray(fields.artifacts || context.artifacts),
    parentExecutionId: context.parentExecutionId,
    childExecutionIds: asArray(fields.childExecutionIds || context.childExecutionIds),
    journalPath: 'journal.jsonl',
    summaryPath: 'execution-record.md'
  };
}

/**
 * Writes the portable execution manifest.
 *
 * @param {object} context Execution context.
 * @param {object} [fields] Manifest overrides.
 * @returns {object} Written manifest and path.
 */
function writeExecutionManifest(context, fields = {}) {
  const runArchive = context.runArchive || ensurePortableRunFolder(context, fields);
  const existingManifest = fs.existsSync(runArchive.manifestPath)
    ? JSON.parse(fs.readFileSync(runArchive.manifestPath, 'utf8'))
    : null;
  const manifest = createExecutionManifest(context, fields);

  if (existingManifest) {
    for (const key of ['startedAt', 'projects', 'tasks', 'promptPaths', 'outputs', 'artifacts', 'childExecutionIds']) {
      if (fields[key] === undefined && existingManifest[key] !== undefined) {
        manifest[key] = existingManifest[key];
      }
    }
  }

  fs.writeFileSync(runArchive.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return {
    path: runArchive.manifestPath,
    manifest
  };
}

/**
 * Gets the next journal sequence number for the portable timeline.
 *
 * @param {string} journalPath Journal JSONL path.
 * @returns {number} Next sequence number.
 */
function getNextJournalSequence(journalPath) {
  if (!fs.existsSync(journalPath)) {
    return 1;
  }

  const content = fs.readFileSync(journalPath, 'utf8').trim();

  if (!content) {
    return 1;
  }

  const lines = content.split(/\r?\n/);
  const lastLine = lines[lines.length - 1];

  try {
    const lastRecord = JSON.parse(lastLine);
    return Number.isInteger(lastRecord.sequence) ? lastRecord.sequence + 1 : lines.length + 1;
  } catch (_error) {
    return lines.length + 1;
  }
}

/**
 * Builds one portable journal timeline entry.
 *
 * @param {object} context Execution context.
 * @param {object} record Event fields.
 * @returns {object} Portable journal entry.
 */
function createPortableJournalEntry(context, record = {}) {
  const runArchive = context.runArchive || ensurePortableRunFolder(context);

  return {
    sequence: record.sequence || getNextJournalSequence(runArchive.journalPath),
    timestamp: record.timestamp || new Date().toISOString(),
    executionId: context.executionId,
    agent: record.agent || context.agent,
    actorType: record.actorType || 'ai_agent',
    eventType: record.eventType || record.action || 'observation',
    message: record.message || record.summary || '',
    command: record.command === undefined ? null : record.command,
    input: record.input === undefined ? null : record.input,
    output: record.output === undefined ? null : record.output,
    filesRead: asArray(record.filesRead),
    filesWritten: asArray(record.filesWritten),
    artifacts: asArray(record.artifacts),
    diagnostics: asArray(record.diagnostics),
    status: record.status === undefined ? null : record.status
  };
}

/**
 * Appends one JSON object per line to the portable run journal.
 *
 * @param {object} context Execution context.
 * @param {object} record Event fields.
 * @returns {object} Written journal entry and path.
 */
function appendPortableJournalEntry(context, record = {}) {
  const runArchive = context.runArchive || ensurePortableRunFolder(context);
  const journalEntry = createPortableJournalEntry(context, record);

  fs.appendFileSync(runArchive.journalPath, `${JSON.stringify(journalEntry)}\n`, 'utf8');

  return {
    path: runArchive.journalPath,
    record: journalEntry
  };
}

/**
 * Reads a portable execution package while preserving support for old folders.
 *
 * @param {string} runFolder Portable run folder path.
 * @param {object} [options] Read options.
 * @param {string} [options.projectRoot] Base path for relative run folders.
 * @returns {object} Package metadata and compatibility status.
 */
function readExecutionPackage(runFolder, options = {}) {
  const resolvedRunFolder = path.isAbsolute(runFolder)
    ? path.resolve(runFolder)
    : path.resolve(options.projectRoot || process.cwd(), runFolder);
  const manifestPath = path.join(resolvedRunFolder, 'execution.json');
  const journalPath = path.join(resolvedRunFolder, 'journal.jsonl');
  const summaryPath = path.join(resolvedRunFolder, 'execution-record.md');
  const hasManifest = fs.existsSync(manifestPath);
  const hasJournal = fs.existsSync(journalPath);
  const hasSummary = fs.existsSync(summaryPath);
  const manifest = hasManifest
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : null;

  return {
    runFolder: resolvedRunFolder,
    schemaVersion: manifest ? manifest.schemaVersion : null,
    executionId: manifest ? manifest.executionId : path.basename(resolvedRunFolder),
    manifest,
    paths: {
      manifestPath: hasManifest ? manifestPath : null,
      journalPath: hasJournal ? journalPath : null,
      summaryPath: hasSummary ? summaryPath : null
    },
    compatibilityMode: !hasManifest && hasSummary ? 'legacy-summary-only' : 'portable-run-archive'
  };
}

/**
 * Builds the minimum immutable journal record shape for the current execution.
 *
 * @param {object} context Execution context.
 * @param {object} record Journal record fields.
 * @returns {object} Complete journal record.
 */
function createJournalRecord(context, record = {}) {
  return {
    executionId: context.executionId,
    parentExecutionId: context.parentExecutionId,
    timestamp: record.timestamp || new Date().toISOString(),
    computerName: context.computerName,
    userName: context.userName,
    agent: context.agent,
    action: record.action || 'observation',
    projectIds: record.projectIds || context.projectIds,
    todoIds: record.todoIds || context.todoIds,
    requirementIds: record.requirementIds || context.requirementIds,
    procedureIds: record.procedureIds || context.procedureIds,
    projectRoot: context.projectRoot,
    workingDirectory: context.workingDirectory,
    summary: record.summary || '',
    details: record.details || {}
  };
}

/**
 * Appends one immutable journal record to the computer-scoped Journal domain.
 *
 * @param {object} context Execution context.
 * @param {object} record Journal record fields.
 * @returns {object} Written journal record and path.
 */
function appendJournalRecord(context, record = {}) {
  const journalRecord = createJournalRecord(context, record);
  const journalPath = path.join(context.paths.Journal, `${context.executionId}.jsonl`);

  fs.appendFileSync(journalPath, `${JSON.stringify(journalRecord)}\n`, 'utf8');

  return {
    path: journalPath,
    record: journalRecord
  };
}

/**
 * Writes mutable current execution state to the computer-scoped State domain.
 *
 * @param {object} context Execution context.
 * @param {object} state State fields.
 * @returns {string} State file path.
 */
function writeCurrentState(context, state = {}) {
  const statePath = path.join(context.paths.State, 'current-execution.json');
  const stateDocument = {
    executionId: context.executionId,
    parentExecutionId: context.parentExecutionId,
    timestamp: new Date().toISOString(),
    computerName: context.computerName,
    agent: context.agent,
    projectRoot: context.projectRoot,
    workingDirectory: context.workingDirectory,
    state
  };

  fs.writeFileSync(statePath, `${JSON.stringify(stateDocument, null, 2)}\n`, 'utf8');

  return statePath;
}

/**
 * Copies a prompt snapshot into the computer-scoped Prompt domain.
 *
 * @param {object} context Execution context.
 * @param {string} promptPath Source prompt path.
 * @returns {string} Snapshot path.
 */
function snapshotPrompt(context, promptPath) {
  if (!promptPath) {
    throw new Error('promptPath is required.');
  }

  const sourcePath = path.resolve(promptPath);
  const extension = path.extname(sourcePath) || '.md';
  const targetPath = path.join(context.paths.Prompt, `${context.executionId}${extension}`);

  fs.copyFileSync(sourcePath, targetPath);

  appendJournalRecord(context, {
    action: 'prompt_snapshot',
    summary: 'Captured prompt snapshot.',
    details: {
      sourcePath,
      targetPath
    }
  });

  return targetPath;
}

function parseArguments(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      continue;
    }

    const key = arg.slice(2);
    const value = argv[index + 1] && !argv[index + 1].startsWith('--')
      ? argv[index + 1]
      : true;

    options[key] = value;

    if (value !== true) {
      index += 1;
    }
  }

  return options;
}

/**
 * Parses a JSON command-line option with a fallback for quote-hostile shells.
 *
 * @param {string|boolean|undefined} value Raw option value.
 * @param {unknown} fallback Fallback value.
 * @returns {unknown} Parsed JSON value or scalar fallback.
 */
function parseJsonOption(value, fallback) {
  if (value === undefined || value === true) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
}

/**
 * Parses a list command-line option with a scalar fallback.
 *
 * @param {string|boolean|undefined} value Raw option value.
 * @param {unknown[]} fallback Fallback value.
 * @returns {unknown[]} Parsed array.
 */
function parseListOption(value, fallback = []) {
  return asArray(parseJsonOption(value, fallback));
}

function runCli() {
  const command = process.argv[2] || 'init';
  const options = parseArguments(process.argv.slice(3));
  const context = createExecutionContext({
    aiRoot: options.aiRoot,
    projectRoot: options.projectRoot,
    workingDirectory: options.workingDirectory,
    parentExecutionId: options.parentExecutionId,
    agent: options.agent,
    executionId: options.executionId,
    executionLabel: options.executionLabel || options.label
  });

  if (command === 'init') {
    ensurePortableRunFolder(context, options);
    writeExecutionManifest(context, {
      projects: parseListOption(options.projects, context.projects),
      tasks: parseListOption(options.tasks, context.tasks),
      promptPaths: parseListOption(options.promptPaths, context.promptPaths),
      outputs: parseListOption(options.outputs, context.outputs),
      artifacts: parseListOption(options.artifacts, context.artifacts)
    });
    appendPortableJournalEntry(context, {
      eventType: 'execution_initialized',
      message: 'Initialized portable run archive.',
      status: 'running'
    });
    writeCurrentState(context, { status: 'initialized' });
    appendJournalRecord(context, {
      action: 'execution_initialized',
      summary: 'Initialized computer-scoped execution context.',
      details: {
        aiRoot: context.aiRoot,
        runFolder: context.runArchive.runFolder,
        computerRoot: context.paths.computerRoot
      }
    });
  } else if (command === 'snapshot-prompt') {
    snapshotPrompt(context, options.promptPath);
  } else if (command === 'record') {
    appendJournalRecord(context, {
      action: options.action || 'observation',
      summary: options.summary || '',
      details: options.details ? JSON.parse(options.details) : {}
    });
  } else if (command === 'record-run') {
    ensurePortableRunFolder(context, options);
    appendPortableJournalEntry(context, {
      eventType: options.eventType || options.action || 'observation',
      message: options.message || options.summary || '',
      command: parseJsonOption(options.command, null),
      input: parseJsonOption(options.input, null),
      output: parseJsonOption(options.output, null),
      filesRead: parseListOption(options.filesRead),
      filesWritten: parseListOption(options.filesWritten),
      artifacts: parseListOption(options.artifacts),
      diagnostics: parseListOption(options.diagnostics),
      status: options.status || null
    });
  } else if (command === 'finish-run') {
    ensurePortableRunFolder(context, options);
    context.status = options.status || 'completed';
    context.finishedAt = options.finishedAt || new Date().toISOString();
    writeExecutionManifest(context, {
      status: context.status,
      finishedAt: context.finishedAt,
      outputs: parseListOption(options.outputs, context.outputs),
      artifacts: parseListOption(options.artifacts, context.artifacts)
    });
    appendPortableJournalEntry(context, {
      eventType: 'execution_finished',
      message: options.message || 'Finished portable run archive.',
      status: context.status
    });
  } else if (command === 'read-package') {
    process.stdout.write(`${JSON.stringify(readExecutionPackage(options.runFolder, options), null, 2)}\n`);
    return;
  } else if (command === 'state') {
    writeCurrentState(context, options.details ? JSON.parse(options.details) : {});
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  process.stdout.write(`${JSON.stringify({
    executionId: context.executionId,
    computerName: context.computerName,
    computerRoot: context.paths.computerRoot,
    runFolder: context.runArchive ? context.runArchive.runFolder : null
  }, null, 2)}\n`);
}

module.exports = {
  DOMAIN_NAMES,
  appendJournalRecord,
  appendPortableJournalEntry,
  createExecutionContext,
  createExecutionManifest,
  createJournalRecord,
  createPortableJournalEntry,
  ensureComputerFolders,
  ensurePortableRunFolder,
  formatRunDate,
  formatRunFolderTimestamp,
  generateExecutionId,
  generateShortExecutionId,
  getExecutionFolderLabel,
  getComputerName,
  getNextJournalSequence,
  getUserName,
  readExecutionPackage,
  resolveAiRoot,
  sanitizeExecutionLabel,
  snapshotPrompt,
  writeExecutionManifest,
  writeCurrentState
};

if (require.main === module) {
  runCli();
}
