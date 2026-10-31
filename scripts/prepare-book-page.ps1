param([ValidateRange(6,43)][int]$Page=6)
$ErrorActionPreference='Stop'
$bookPageKey=[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User')
if(-not $bookPageKey){$bookPageKey=[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','Process')}
if(-not $bookPageKey){throw 'API key is missing. No request sent.'}
$bookOldKey=$env:OPENAI_API_KEY
try{$env:OPENAI_API_KEY=$bookPageKey;& node (Join-Path $PSScriptRoot 'prepare-book-page.mjs') "--page=$Page";if($LASTEXITCODE -ne 0){throw 'Page generation stopped. See sanitized status above.'}}
finally{$env:OPENAI_API_KEY=$bookOldKey;$bookPageKey=$null}
