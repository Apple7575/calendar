param([ValidateRange(1,500)][int]$Max=10)
$ErrorActionPreference='Stop'
$wordReviewKey=[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User')
if(-not $wordReviewKey){throw 'API key missing. No request sent.'}
$wordReviewPrevious=$env:OPENAI_API_KEY
try{$env:OPENAI_API_KEY=$wordReviewKey;& node (Join-Path $PSScriptRoot 'review-long-word-audio.mjs') "--max=$Max";if($LASTEXITCODE -ne 0){throw 'Word review stopped.'}}
finally{$env:OPENAI_API_KEY=$wordReviewPrevious;$wordReviewKey=$null}
