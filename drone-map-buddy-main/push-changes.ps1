$env:GIT_PAGER = ""
$env:PAGER = ""
$env:EDITOR = ""

cd $PSScriptRoot

git config core.pager ""
Write-Host "Fetching from remote..."
git fetch origin main

Write-Host "Rebasing on origin/main..."
git rebase origin/main

Write-Host "Pushing to origin/main..."
git push origin main

Write-Host "Done!"
