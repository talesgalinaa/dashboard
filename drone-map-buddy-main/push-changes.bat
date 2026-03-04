@echo off
setlocal enabledelayedexpansion

set GIT_PAGER=
set PAGER=
set EDITOR=

cd /d "%~dp0"

echo Configuring git...
git config core.pager ""

echo Fetching from remote...
git fetch origin main

echo Rebasing on origin/main...
git rebase origin/main

echo Pushing to origin/main...
git push origin main

echo.
echo Done!
pause
