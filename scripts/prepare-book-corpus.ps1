$ErrorActionPreference='Stop'
$corpusApiKey=[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User')
if(-not $corpusApiKey){throw 'API key missing. No request sent.'}
$corpusPreviousKey=$env:OPENAI_API_KEY
try{$env:OPENAI_API_KEY=$corpusApiKey;& node (Join-Path $PSScriptRoot 'prepare-book-corpus.mjs');if($LASTEXITCODE -ne 0){throw 'Corpus generation stopped. No automatic retry.'}}
finally{$env:OPENAI_API_KEY=$corpusPreviousKey;$corpusApiKey=$null}
