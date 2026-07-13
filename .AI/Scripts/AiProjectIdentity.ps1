# AiProjectIdentity.ps1

function ConvertTo-AiFullPath {
    param(
        [Parameter(Mandatory)]
        [string]$PathValue,

        [string]$BasePath = (Get-Location).ProviderPath
    )

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return [System.IO.Path]::GetFullPath($PathValue)
    }

    return [System.IO.Path]::GetFullPath((Join-Path -Path $BasePath -ChildPath $PathValue))
}

function ConvertTo-AiComparablePath {
    param(
        [Parameter(Mandatory)]
        [string]$PathValue
    )

    $fullPath = [System.IO.Path]::GetFullPath($PathValue).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    )
    return $fullPath.ToUpperInvariant()
}

function Test-AiProjectId {
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$ProjectId
    )

    return $ProjectId -match '^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$'
}

function Read-AiProjectIdentity {
    param(
        [Parameter(Mandatory)]
        [string]$ProjectRoot
    )

    $resolvedProjectRoot = ConvertTo-AiFullPath -PathValue $ProjectRoot
    $identityPath = Join-Path -Path $resolvedProjectRoot -ChildPath '.vscode\ai-project.json'

    if (-not (Test-Path -LiteralPath $identityPath -PathType Leaf)) {
        throw "Fatal project identity error: missing $identityPath. Create .vscode\ai-project.json with schemaVersion, projectId, projectName, and projectRoot."
    }

    try {
        $identity = Get-Content -LiteralPath $identityPath -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        throw "Fatal project identity error: cannot read or parse $identityPath. $($_.Exception.Message)"
    }

    if (-not $identity.PSObject.Properties.Name.Contains('schemaVersion') -or [string]::IsNullOrWhiteSpace([string]$identity.schemaVersion)) {
        throw "Fatal project identity error: schemaVersion is missing in $identityPath."
    }

    if ([string]$identity.schemaVersion -ne '1.0') {
        throw "Fatal project identity error: unsupported schemaVersion '$($identity.schemaVersion)' in $identityPath."
    }

    if (-not $identity.PSObject.Properties.Name.Contains('projectId') -or [string]::IsNullOrWhiteSpace([string]$identity.projectId)) {
        throw "Fatal project identity error: projectId is missing in $identityPath."
    }

    if (-not (Test-AiProjectId -ProjectId ([string]$identity.projectId))) {
        throw "Fatal project identity error: invalid projectId '$($identity.projectId)' in $identityPath."
    }

    if (-not $identity.PSObject.Properties.Name.Contains('projectRoot') -or [string]::IsNullOrWhiteSpace([string]$identity.projectRoot)) {
        throw "Fatal project identity error: projectRoot is missing in $identityPath."
    }

    $identityProjectRoot = ConvertTo-AiFullPath -PathValue ([string]$identity.projectRoot)
    if ((ConvertTo-AiComparablePath -PathValue $identityProjectRoot) -ne (ConvertTo-AiComparablePath -PathValue $resolvedProjectRoot)) {
        throw "Fatal project identity error: projectRoot '$($identity.projectRoot)' does not match resolved project root '$resolvedProjectRoot'."
    }

    return [pscustomobject]@{
        SchemaVersion = [string]$identity.schemaVersion
        ProjectId = [string]$identity.projectId
        ProjectName = if ($identity.PSObject.Properties.Name.Contains('projectName')) { [string]$identity.projectName } else { '' }
        ProjectRoot = $resolvedProjectRoot
        IdentityPath = $identityPath
    }
}

function Find-AiProjectIdentityRoot {
    param(
        [Parameter(Mandatory)]
        [string]$StartPath
    )

    if (-not (Test-Path -LiteralPath $StartPath)) {
        return $null
    }

    $current = (Resolve-Path -LiteralPath $StartPath).ProviderPath
    if (Test-Path -LiteralPath $current -PathType Leaf) {
        $current = Split-Path -Path $current -Parent
    }

    while ($true) {
        $identityPath = Join-Path -Path $current -ChildPath '.vscode\ai-project.json'
        if (Test-Path -LiteralPath $identityPath -PathType Leaf) {
            return $current
        }

        $parent = Split-Path -Path $current -Parent
        if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $current) {
            return $null
        }

        $current = $parent
    }
}

function Resolve-AiProjectContext {
    param(
        [string]$ProjectRoot,

        [string]$ProjectId,

        [AllowEmptyCollection()]
        [string[]]$StartPaths = @()
    )

    if (-not [string]::IsNullOrWhiteSpace($ProjectRoot)) {
        $identity = Read-AiProjectIdentity -ProjectRoot $ProjectRoot
        if (-not [string]::IsNullOrWhiteSpace($ProjectId) -and $identity.ProjectId -ne $ProjectId) {
            throw "Fatal project identity error: supplied ProjectId '$ProjectId' does not match $($identity.IdentityPath) projectId '$($identity.ProjectId)'."
        }

        return $identity
    }

    if ([string]::IsNullOrWhiteSpace($ProjectId)) {
        throw "Fatal project identity error: ProjectId is required when ProjectRoot is not supplied."
    }

    if (-not (Test-AiProjectId -ProjectId $ProjectId)) {
        throw "Fatal project identity error: invalid supplied ProjectId '$ProjectId'."
    }

    $candidateRoots = New-Object System.Collections.Generic.List[string]
    foreach ($startPath in $StartPaths) {
        if ([string]::IsNullOrWhiteSpace($startPath)) {
            continue
        }

        $candidateRoot = Find-AiProjectIdentityRoot -StartPath $startPath
        if (-not [string]::IsNullOrWhiteSpace($candidateRoot)) {
            $candidateRoots.Add((ConvertTo-AiFullPath -PathValue $candidateRoot)) | Out-Null
        }
    }

    $matchingIdentities = @()
    foreach ($candidateRoot in ($candidateRoots | Select-Object -Unique)) {
        $identity = Read-AiProjectIdentity -ProjectRoot $candidateRoot
        if ($identity.ProjectId -eq $ProjectId) {
            $matchingIdentities += $identity
        }
    }

    if ($matchingIdentities.Count -eq 0) {
        throw "Fatal project identity error: ProjectId '$ProjectId' could not be resolved from the supplied paths. Supply -ProjectRoot."
    }

    if ($matchingIdentities.Count -gt 1) {
        $paths = @($matchingIdentities | ForEach-Object { $_.IdentityPath }) -join ', '
        throw "Fatal project identity error: ProjectId '$ProjectId' is ambiguous across identities: $paths."
    }

    return $matchingIdentities[0]
}

function Resolve-AiActiveRoot {
    param(
        [Parameter(Mandatory)]
        [string]$ProjectRoot,

        [string]$ExplicitAiRoot
    )

    $resolvedProjectRoot = ConvertTo-AiFullPath -PathValue $ProjectRoot
    $projectAiRoot = Join-Path -Path $resolvedProjectRoot -ChildPath '.AI'
    $selectedAiRoot = if (Test-Path -LiteralPath $projectAiRoot -PathType Container) {
        [System.IO.Path]::GetFullPath($projectAiRoot)
    } else {
        'D:\AI\.AI'
    }

    if (-not [string]::IsNullOrWhiteSpace($ExplicitAiRoot)) {
        $resolvedExplicitRoot = ConvertTo-AiFullPath -PathValue $ExplicitAiRoot -BasePath $resolvedProjectRoot
        if ((ConvertTo-AiComparablePath -PathValue $resolvedExplicitRoot) -ne (ConvertTo-AiComparablePath -PathValue $selectedAiRoot)) {
            throw "Fatal AI root error: explicit AiRoot '$resolvedExplicitRoot' does not match selected active AI root '$selectedAiRoot'. Project-local .AI is a complete replacement, not an overlay."
        }
    }

    return $selectedAiRoot
}

function Read-AiFrontMatter {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "File does not exist: $Path"
    }

    $content = @(Get-Content -LiteralPath $Path -Encoding UTF8)
    $metadata = [ordered]@{}

    if ($content.Count -lt 3 -or $content[0] -ne '---') {
        return [pscustomobject]@{
            HasMetadata = $false
            Metadata = $metadata
            Body = $content
        }
    }

    $endIndex = -1
    for ($index = 1; $index -lt $content.Count; $index++) {
        if ($content[$index] -eq '---') {
            $endIndex = $index
            break
        }
    }

    if ($endIndex -lt 0) {
        throw "Front matter is not closed in $Path."
    }

    for ($index = 1; $index -lt $endIndex; $index++) {
        if ($content[$index] -match '^\s*([^:#]+)\s*:\s*(.*)\s*$') {
            $metadata[$Matches[1].Trim()] = $Matches[2].Trim()
        }
    }

    $body = if (($endIndex + 1) -lt $content.Count) {
        @($content[($endIndex + 1)..($content.Count - 1)])
    } else {
        @()
    }

    return [pscustomobject]@{
        HasMetadata = $true
        Metadata = $metadata
        Body = $body
    }
}

function Test-AiPromptProjectMetadata {
    param(
        [Parameter(Mandatory)]
        [string]$PromptPath,

        [Parameter(Mandatory)]
        [pscustomobject]$Identity,

        [switch]$RequireTaskId
    )

    $resolvedPromptPath = ConvertTo-AiFullPath -PathValue $PromptPath -BasePath $Identity.ProjectRoot
    $frontMatter = Read-AiFrontMatter -Path $resolvedPromptPath
    if (-not $frontMatter.HasMetadata) {
        throw "Fatal task validation error: prompt metadata is missing in $resolvedPromptPath."
    }

    foreach ($requiredKey in @('projectId', 'projectRoot')) {
        if (-not $frontMatter.Metadata.Contains($requiredKey) -or [string]::IsNullOrWhiteSpace([string]$frontMatter.Metadata[$requiredKey])) {
            throw "Fatal task validation error: prompt metadata field '$requiredKey' is missing in $resolvedPromptPath."
        }
    }

    if ($RequireTaskId -and (-not $frontMatter.Metadata.Contains('taskId') -or [string]::IsNullOrWhiteSpace([string]$frontMatter.Metadata['taskId']))) {
        throw "Fatal task validation error: prompt metadata field 'taskId' is missing in $resolvedPromptPath."
    }

    if ([string]$frontMatter.Metadata['projectId'] -ne $Identity.ProjectId) {
        throw "Fatal task validation error: prompt projectId '$($frontMatter.Metadata['projectId'])' does not match active project '$($Identity.ProjectId)'."
    }

    $promptProjectRoot = ConvertTo-AiFullPath -PathValue ([string]$frontMatter.Metadata['projectRoot']) -BasePath $Identity.ProjectRoot
    if ((ConvertTo-AiComparablePath -PathValue $promptProjectRoot) -ne (ConvertTo-AiComparablePath -PathValue $Identity.ProjectRoot)) {
        throw "Fatal task validation error: prompt projectRoot '$($frontMatter.Metadata['projectRoot'])' does not match active project root '$($Identity.ProjectRoot)'."
    }

    return [pscustomobject]@{
        PromptPath = $resolvedPromptPath
        Metadata = $frontMatter.Metadata
        Body = $frontMatter.Body
    }
}
