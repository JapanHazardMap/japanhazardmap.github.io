# Workspace/your_open_repos/ViewerServer/activate_ViewerServer.ps1
# 新しいターミナルでのサーバー起動を推奨する。
# サーバー起動中は同一ターミナルでの他のファイルを実行できなくなる。
# カレントディレクトリをこのスクリプトの所在地に変更する。
# cd E:/MyProjects/gitManaged/TopoProject/Workspace/your_open_repos/ViewerServer に同じ。
cd $PSScriptRoot
# server.jsを実行して起動させる。
node bin/server.js

