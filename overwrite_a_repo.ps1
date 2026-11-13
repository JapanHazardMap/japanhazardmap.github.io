# .\overwrite_a_repo.ps1
# まずはこのファイルをWorkspace/publicReposディレクトリ内にある各リポジトリのルートディレクトリにコピーする。
# First, copy this file to the root directory of each repository located within the `Workspace/publicRepos` directory.
# カレントディレクトリをこのスクリプトの所在地に変更する。
cd $PSScriptRoot
# Git push for overwrite.
git add .
git commit -m "Overwrite for update"
git push --force origin HEAD

