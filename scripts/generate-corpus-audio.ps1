param([ValidateRange(1,5000)][int]$MaxNew=40,[switch]$Generate)
$ErrorActionPreference='Stop'
$corpusVoiceKey=[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User')
if($Generate -and -not $corpusVoiceKey){throw 'API key missing. No request sent.'}
$corpusVoicePrevious=$env:OPENAI_API_KEY
try{$env:OPENAI_API_KEY=$corpusVoiceKey;$corpusVoiceArgs=@((Join-Path $PSScriptRoot 'generate-corpus-audio.mjs'),"--max-new=$MaxNew");if($Generate){$corpusVoiceArgs+='--generate'};& node @corpusVoiceArgs;if($LASTEXITCODE -ne 0){throw 'Corpus audio generation stopped. No automatic retry.'}}
finally{$env:OPENAI_API_KEY=$corpusVoicePrevious;$corpusVoiceKey=$null}
