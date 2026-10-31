$ErrorActionPreference='Stop'
$judgeKey=[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User')
if(-not $judgeKey){throw 'API key missing.'}
$judgePrevious=$env:OPENAI_API_KEY
try{$env:OPENAI_API_KEY=$judgeKey;& node (Join-Path $PSScriptRoot 'judge-corpus-transcripts.mjs');if($LASTEXITCODE -ne 0){throw 'Judgment stopped.'}}
finally{$env:OPENAI_API_KEY=$judgePrevious;$judgeKey=$null}
