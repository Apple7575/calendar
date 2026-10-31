param([ValidateRange(1,2000)][int]$MaxNew=5)
$ErrorActionPreference='Stop'
$repairKey=[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User')
if(-not $repairKey){throw 'API key missing. No request sent.'}
$repairPrevious=$env:OPENAI_API_KEY
try{$env:OPENAI_API_KEY=$repairKey;& node (Join-Path $PSScriptRoot 'repair-corpus-audio.mjs') "--max-new=$MaxNew";if($LASTEXITCODE -ne 0){throw 'Audio repair stopped.'}}
finally{$env:OPENAI_API_KEY=$repairPrevious;$repairKey=$null}
