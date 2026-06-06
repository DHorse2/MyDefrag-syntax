
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser


Unblock-File .\MyDefragUpdateLive.ps1

Get-ChildItem *.ps1 | Unblock-File

Set-Location d:\Script\MyDefrag-syntax
npm install -g @vscode/vsce
vsce package
Get-ChildItem *.vsix

codium --install-extension mydefrag-syntax-0.1.0.vsix

