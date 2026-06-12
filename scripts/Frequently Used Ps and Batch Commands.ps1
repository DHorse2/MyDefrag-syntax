
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

# The STRING is the filename of the script.
# The interpreter will look for the STRING in the following directories. If not found then it will try again with ".MyD" appended, and then with "Scripts\" prepended.
#     As a full path.
#     In the current folder.
#     In the same directory as the main script.
#     In the same directory as the executable (MyDefrag.exe, MyDefragScreenSaver.exe).
#     In the installation directory (default is "c:\Program Files\MyDefrag v4.3.1\").
#     In the "!ProgramFiles!\MyDefrag v4.3.1" directory.
#     In the "!ProgramW6432!\MyDefrag v4.3.1" directory.
#     In the "!ProgramFiles(x86)!\MyDefrag v4.3.1" directory.
#     In the PATH environment (this usually includes the current directory).
#     In the "!SystemRoot!" directory. 
# The extension ".MyD" is optional and not required unless the script has a different extension such as "*.txt". 

# Command	            Effect
# npm run deploy:local	Executes build-and-deploy.ps1. Presumably copies your extension into a local VS Code/VSCodium extensions folder.
# npm run clean	        Deletes dist, out, and .vscodeignore using rimraf.
# npm run build	        Just prints a message. No actual build occurs.
# npm run prepare	    Runs npm run build. This is also automatically run by npm before packaging/publishing in some situations.
# npm run pack:vsix	    Generates .vscodeignore, creates an artifacts folder, and builds a .vsix package.
# npm run ci:artifact	Runs build and then packages the VSIX.
npm run clean
npm run build
npm run prepare
npm run pack:vsix
npm run ci:artifact
npm run deploy:local
# To see all scripts in a project:
npm run
