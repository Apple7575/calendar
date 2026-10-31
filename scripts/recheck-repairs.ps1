$ErrorActionPreference='Stop'
$recheckKey=[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User')
if(-not $recheckKey){throw 'API key missing.'}
$recheckPrevious=$env:OPENAI_API_KEY
try{$env:OPENAI_API_KEY=$recheckKey;& node (Join-Path $PSScriptRoot 'recheck-repairs.mjs');if($LASTEXITCODE -ne 0){throw 'Recheck stopped.'}}
finally{$env:OPENAI_API_KEY=$recheckPrevious;$recheckKey=$null}
