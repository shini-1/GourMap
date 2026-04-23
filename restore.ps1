$src = "C:\Users\Shini\Desktop\GourmapGitStuff\GourMap"
$dst = "c:\Users\Shini\CascadeProjects\GourMap"

Get-ChildItem -Path $src -Exclude node_modules,.expo,dist,build -Recurse | ForEach-Object {
    $target = $_.FullName.Replace($src, $dst)
    if ($_.PSIsContainer) {
        New-Item -ItemType Directory -Path $target -Force | Out-Null
    } else {
        Copy-Item -Path $_.FullName -Destination $target -Force
    }
}

Write-Host "Restoration complete!"
