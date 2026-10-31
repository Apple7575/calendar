param([switch]$Generate, [switch]$Smoke, [switch]$FullCedar, [switch]$SingleWordFix, [string]$OnlyWord, [ValidateRange(1,194)][int]$MaxNew = 120)
$ErrorActionPreference = 'Stop'
$ttsSavedKey = [Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'User')
if (-not $ttsSavedKey) { $ttsSavedKey = [Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'Process') }
if ($Generate -and -not $ttsSavedKey) { throw 'OPENAI_API_KEY is missing. No API request was sent.' }
$ttsPreviousKey = $env:OPENAI_API_KEY
try {
    if ($ttsSavedKey) { $env:OPENAI_API_KEY = $ttsSavedKey }
    $ttsArguments = @((Join-Path $PSScriptRoot 'generate-tts-samples.mjs'), "--max-new=$MaxNew")
    if ($Generate) { $ttsArguments += '--generate' }
    if ($Smoke) { $ttsArguments += '--smoke' }
    if ($FullCedar) { $ttsArguments += '--cedar-decks' }
    if ($SingleWordFix) { $ttsArguments += '--single-word-v2' }
    if ($OnlyWord) { $ttsArguments += "--only-word=$OnlyWord" }
    & node @ttsArguments
    if ($LASTEXITCODE -ne 0) { throw 'Sample generation stopped. See the sanitized error above; no automatic retry was made.' }
} finally {
    $env:OPENAI_API_KEY = $ttsPreviousKey
    $ttsSavedKey = $null
}
