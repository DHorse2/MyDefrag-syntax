@echo off
setlocal

rem Add-AiTodoPrompt.bat
rem Wrapper for Add-AiTodoPrompt.ps1.

set "SCRIPT_DIR=%~dp0"
set "PS1=%SCRIPT_DIR%Add-AiTodoPrompt.ps1"
set "AI_TODO_PROMPT_WRAPPER_PS1=%PS1%"

powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "& $env:AI_TODO_PROMPT_WRAPPER_PS1 @args" %*

exit /b %ERRORLEVEL%
