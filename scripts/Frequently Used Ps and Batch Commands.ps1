
exit 0
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser


Unblock-File .\MyDefragUpdateLive.ps1

Get-ChildItem *.ps1 | Unblock-File

Set-Location d:\Script\MyDefrag-syntax
npm install -g @vscode/vsce
vsce package
Get-ChildItem *.vsix

codium --install-extension mydefrag-syntax-0.1.0.vsix

# You can check what VSCodium thinks is installed:
# Extensions View (Ctrl+Shift+X)
# Search for:
# @installed mydfrg
# or
# @installed local

"C:\Users\david\.vscode-oss\extensions\extensions.json"