'use strict';
import * as path from 'path';
import * as vscode from 'vscode';
const vscode = require('vscode');
const path = require('path');

// Search all .MyDc / .MyD files in the workspace for a regex pattern.
// Returns an array of vscode.Location objects.
async function searchWorkspace(pattern) {
    const locations = [];

    // Find every MyDefrag script file on disk
    const uris = await vscode.workspace.findFiles('**/*.{MyDc,MyD}', '**/node_modules/**');

    for (const uri of uris) {
        const doc = await vscode.workspace.openTextDocument(uri);
        const text = doc.getText();
        let match;

        // Reset lastIndex each call since we reuse the regex
        pattern.lastIndex = 0;

        while ((match = pattern.exec(text)) !== null) {
            const pos = doc.positionAt(match.index);
            // Highlight just the variable name, not the whole match
            const nameIndex = match.index + match[0].indexOf(match[1]);
            const start = doc.positionAt(nameIndex);
            const end = doc.positionAt(nameIndex + match[1].length);
            locations.push(new vscode.Location(uri, new vscode.Range(start, end)));
        }
    }

    return locations;
}

function activate(context) {

    const log = vscode.window.createOutputChannel('MyDefrag Preview');

    // ── Go to Definition ────────────────────────────────────────────────────
    // Triggered by F12 or right-click → Go to Definition.
    // Finds the SetVariable(VarName, ...) declaration for the word under cursor.
    const definitionProvider = vscode.languages.registerDefinitionProvider(
        { language: 'mydc' },
        {
            async provideDefinition(document, position) {
                const range = document.getWordRangeAtPosition(position, /\w+/);
                if (!range) return;
                const word = document.getText(range);

                // Match: SetVariable(VarName  — capture group 1 = VarName
                const pattern = new RegExp(
                    `SetVariable\\s*\\(\\s*(${escapeRegex(word)})\\s*,`,
                    'g'
                );

                const locations = await searchWorkspace(pattern);
                return locations;   // single result jumps directly; multiple shows a picker
            }
        }
    );

    // ── Find All References ─────────────────────────────────────────────────
    // Triggered by Shift+F12 or right-click → Find All References.
    // Finds every place VarName appears: in SetVariable() and anywhere else it's used.
    const referenceProvider = vscode.languages.registerReferenceProvider(
        { language: 'mydc' },
        {
            async provideReferences(document, position, context) {
                const range = document.getWordRangeAtPosition(position, /\w+/);
                if (!range) return;
                const word = document.getText(range);

                // Match any standalone occurrence of the word (as a whole word)
                const pattern = new RegExp(`\\b(${escapeRegex(word)})\\b`, 'g');

                const locations = await searchWorkspace(pattern);
                return locations;
            }
        }
    );

    // ── Document Links (Ctrl+Click on includes) ─────────────────────────────
    // Triggered by Ctrl+Click or hovering the path in an !include "..."! line.
    // Resolves the relative path to an absolute URI so VSCodium can open it.
    const linkProvider = vscode.languages.registerDocumentLinkProvider(
        { language: 'mydc' },
        {

            provideDocumentLinks(document) {
                const links = [];

                const pattern = /!include\\s+\"[^\"]*\"!/
                // const pattern = /!include\s*"([^"]+)"!/gi;
                // const pattern = /!include\s+"([^"]+)"!/g;
                const text = document.getText();
                let match;

                const currentDir = path.dirname(document.uri.fsPath);

                while ((match = pattern.exec(text)) !== null) {
                    const includePath = match[1];

                    const quoteStart = match.index + match[0].indexOf('"') + 1;
                    const start = document.positionAt(quoteStart);
                    const end = document.positionAt(quoteStart + includePath.length);
                    const range = new vscode.Range(start, end);

                    // normalize slashes
                    const normalised = includePath.replace(/\\/g, path.sep);

                    // resolve relative OR absolute
                    const absolutePath = path.isAbsolute(normalised)
                        ? normalised
                        : path.join(currentDir, normalised);

                    const targetUri = vscode.Uri.file(absolutePath);

                    links.push(new vscode.DocumentLink(range, targetUri));
                }

                return links;
            }
        }
    );

    // ── Open Preview ───────────────────────────────────────────────────────
    const openPreviewCommand = vscode.commands.registerCommand(
        'mydc.openPreview',
        async (uri) => {
            log.show(true); // true = don't steal focus
            log.appendLine('--- openPreview triggered ---');

            const editor = vscode.window.activeTextEditor;
            const sourceUri = uri || (editor && editor.document.uri);
            log.appendLine(`sourceUri: ${sourceUri}`);

            if (!sourceUri) {
                log.appendLine('ERROR: no active document');
                vscode.window.showWarningMessage('No MyDefrag document is active.');
                return;
            }

            const sourcePath = sourceUri.fsPath;
            const ext = sourcePath.match(/\.(MyD|MyDc|myd|mydc)$/i)?.[1] ?? 'MyDc';
            const previewPath = sourcePath.replace(/\.(MyD|MyDc|myd|mydc)$/i, `.merged.${ext}`);
            log.appendLine(`sourcePath:  "${sourcePath}"`);
            log.appendLine(`previewPath: "${previewPath}"`);

            const preprocessScript = vscode.Uri.joinPath(
                context.extensionUri, 'mydefrag-preprocess.js'
            ).fsPath;
            log.appendLine(`preprocessScript: "${preprocessScript}"`);

            const result = await new Promise((resolve) => {
                const cp = require('child_process');
                const fs = require('fs');

                cp.execFile(
                    process.execPath,
                    [preprocessScript, sourcePath, previewPath],
                    { cwd: require('path').dirname(sourcePath) },
                    (err, stdout, stderr) => {
                        const hasOutput = fs.existsSync(previewPath);

                        if (err && !hasOutput) {
                            // Hard failure: no preview file was created
                            log.appendLine(`PREPROCESS ERROR: ${err.message}`);
                            log.appendLine(`stderr: ${stderr}`);
                            vscode.window.showErrorMessage(`Preprocess failed: ${stderr || err.message}`);
                            resolve(false);
                            return;
                        }

                        // Soft failure: process complained, but preview file exists
                        if (err && hasOutput) {
                            log.appendLine(`PREPROCESS WARNING (non-fatal): ${err.message}`);
                        }

                        log.appendLine('Preprocess OK (preview file present)');
                        log.appendLine(`stdout: ${stdout}`);
                        if (stderr) log.appendLine(`stderr (warnings?): ${stderr}`);
                        resolve(true);
                    }
                );
            });

            if (!result) return;
            const previewUri = vscode.Uri.file(previewPath);
            try {
                await vscode.workspace.fs.stat(previewUri);
                log.appendLine('Preview file exists, opening...');
                const doc = await vscode.workspace.openTextDocument(previewUri);
                await vscode.window.showTextDocument(doc, vscode.ViewColumn.Active);
                log.appendLine('Done.');
            } catch (e) {
                log.appendLine(`ERROR stating/opening preview file: ${e.message}`);
                vscode.window.showWarningMessage(`Preview file not found: ${previewPath}`);
            }
        }
    );

    context.subscriptions.push(definitionProvider, referenceProvider, linkProvider, openPreviewCommand);
}

function deactivate() { }

// Escape special regex characters in a variable name
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { activate, deactivate };
