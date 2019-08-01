#
# Module for 'Microsoft.TeamFoundation.DistributedTask.Task.CodeCoverage'
#

Import-Module '$PSScriptRoot\..\Microsoft.TeamFoundation.DistributedTask.Task.LegacySDK.dll'

Export-ModuleMember -Cmdlet @(
        'Enable-CodeCoverage',
        'Publish-CodeCoverage'
    )
