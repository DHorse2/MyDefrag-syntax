# Install MyDefrag Syntax

MyDefrag Syntax supports VSCodium and Visual Studio Code versions compatible
with the extension engine requirement `^1.82.0`.

## Install A VSIX

From the editor:

1. Open the Extensions view.
2. Open the view's **More Actions** menu.
3. Select **Install from VSIX**.
4. Choose the MyDefrag Syntax `.vsix` file.
5. Reload the editor when prompted.

From a terminal, use the launcher for your editor:

```text
codium --install-extension <path-to-vsix> --force
code --install-extension <path-to-vsix> --force
```

## Run From Source

1. Install a current Node.js and npm toolchain.
2. Clone or open this repository.
3. Install dependencies:

   ```text
   npm install
   ```

4. Open the repository in VSCodium or Visual Studio Code.
5. Run the **Run Extension** debug configuration, or press F5.

The Extension Development Host opens with this repository supplied as
`--extensionDevelopmentPath`.

## Verify Activation

1. Open a `.MyD` or `.MyDc` file.
2. Confirm the language mode is **MyDefrag Script**.
3. Run **MyDefrag: Open Settings**.
4. Confirm **MyDefrag Diagnostics** appears in the Explorer.
5. Run **MyDefrag: Open Preview** on a script.

If activation fails, inspect the editor's Extension Host log and the directory
selected by `mydfrg.logDir`.
