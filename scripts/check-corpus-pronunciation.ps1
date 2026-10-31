param([ValidateRange(1,2000)][int]$MaxNew=100)
$ErrorActionPreference='Stop'
$pronunciationKey=[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User')
if(-not $pronunciationKey){throw 'API key missing. No request sent.'}
$pronunciationPrevious=$env:OPENAI_API_KEY
try{$env:OPENAI_API_KEY=$pronunciationKey;& node (Join-Path $PSScriptRoot 'check-corpus-pronunciation.mjs') "--max-new=$MaxNew";if($LASTEXITCODE -ne 0){throw 'Pronunciation check stopped.'}}
finally{$env:OPENAI_API_KEY=$pronunciationPrevious;$pronunciationKey=$null}
