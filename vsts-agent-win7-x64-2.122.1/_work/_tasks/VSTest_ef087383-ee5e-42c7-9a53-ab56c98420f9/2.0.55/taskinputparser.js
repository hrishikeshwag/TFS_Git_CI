"use strict";
const path = require('path');
const tl = require('vsts-task-lib/task');
const utils = require('./helpers');
const os = require('os');
const versionFinder = require('./versionfinder');
const uuid = require('node-uuid');
function getDistributedTestConfigurations() {
    const dtaConfiguration = {};
    initTestConfigurations(dtaConfiguration);
    if (dtaConfiguration.vsTestLocationMethod === utils.Constants.vsTestVersionString && dtaConfiguration.vsTestVersion === '12.0') {
        throw (tl.loc('vs2013NotSupportedInDta'));
    }
    if (dtaConfiguration.tiaConfig.tiaEnabled) {
        tl.warning(tl.loc('tiaNotSupportedInDta'));
        dtaConfiguration.tiaConfig.tiaEnabled = false;
    }
    if (dtaConfiguration.runTestsInIsolation) {
        tl.warning(tl.loc('runTestInIsolationNotSupported'));
    }
    if (dtaConfiguration.otherConsoleOptions) {
        tl.warning(tl.loc('otherConsoleOptionsNotSupported'));
    }
    dtaConfiguration.numberOfAgentsInPhase = 0;
    const totalJobsInPhase = parseInt(tl.getVariable('SYSTEM_TOTALJOBSINPHASE'));
    if (!isNaN(totalJobsInPhase)) {
        dtaConfiguration.numberOfAgentsInPhase = totalJobsInPhase;
    }
    tl._writeLine(tl.loc('dtaNumberOfAgents', dtaConfiguration.numberOfAgentsInPhase));
    dtaConfiguration.dtaEnvironment = initDtaEnvironment();
    return dtaConfiguration;
}
exports.getDistributedTestConfigurations = getDistributedTestConfigurations;
function getvsTestConfigurations() {
    const vsTestConfiguration = {};
    initTestConfigurations(vsTestConfiguration);
    vsTestConfiguration.publishRunAttachments = tl.getInput('publishRunAttachments');
    vsTestConfiguration.vstestDiagFile = path.join(os.tmpdir(), uuid.v1() + '.txt');
    vsTestConfiguration.ignoreVstestFailure = tl.getVariable('vstest.ignoretestfailures');
    return vsTestConfiguration;
}
exports.getvsTestConfigurations = getvsTestConfigurations;
function initDtaEnvironment() {
    const dtaEnvironment = {};
    dtaEnvironment.tfsCollectionUrl = tl.getVariable('System.TeamFoundationCollectionUri');
    dtaEnvironment.patToken = tl.getEndpointAuthorization('SystemVssConnection', true).parameters['AccessToken'];
    dtaEnvironment.agentName = tl.getVariable('Agent.MachineName') + '-' + tl.getVariable('Agent.Name') + '-' + tl.getVariable('Agent.Id');
    //TODO : Consider build scenario
    const releaseId = tl.getVariable('Release.ReleaseId');
    const phaseId = tl.getVariable('Release.DeployPhaseId');
    const projectName = tl.getVariable('System.TeamProject');
    const taskInstanceId = getDtaInstanceId();
    const parallelExecution = tl.getVariable('System.ParallelExecutionType');
    if (releaseId) {
        if (parallelExecution && parallelExecution.toLowerCase() === 'multiconfiguration') {
            const jobId = tl.getVariable('System.JobId');
            dtaEnvironment.environmentUri = 'dta://env/' + projectName + '/_apis/release/' + releaseId + '/' + phaseId + '/' + jobId + '/' + taskInstanceId;
        }
        else {
            dtaEnvironment.environmentUri = 'dta://env/' + projectName + '/_apis/release/' + releaseId + '/' + phaseId + '/' + taskInstanceId;
        }
    }
    else {
        const buildId = tl.getVariable('Build.BuildId');
        dtaEnvironment.environmentUri = 'dta://env/' + projectName + '/_apis/build/' + buildId + '/' + taskInstanceId;
    }
    dtaEnvironment.dtaHostLogFilePath = path.join(tl.getVariable('System.DefaultWorkingDirectory'), 'DTAExecutionHost.exe.log');
    return dtaEnvironment;
}
function getDtaInstanceId() {
    const taskInstanceIdString = tl.getVariable('DTA_INSTANCE_ID');
    let taskInstanceId = 1;
    if (taskInstanceIdString) {
        const instanceId = Number(taskInstanceIdString);
        if (!isNaN(instanceId)) {
            taskInstanceId = instanceId + 1;
        }
    }
    tl.setVariable('DTA_INSTANCE_ID', taskInstanceId.toString());
    return taskInstanceId;
}
function initTestConfigurations(testConfiguration) {
    testConfiguration.testSelection = tl.getInput('testSelector');
    getTestSelectorBasedInputs(testConfiguration);
    testConfiguration.testDropLocation = tl.getInput('searchFolder');
    if (!utils.Helper.isNullOrWhitespace(testConfiguration.testDropLocation)) {
        testConfiguration.testDropLocation = path.resolve(testConfiguration.testDropLocation);
    }
    tl._writeLine(tl.loc('searchFolderInput', testConfiguration.testDropLocation));
    testConfiguration.settingsFile = tl.getPathInput('runSettingsFile');
    if (!utils.Helper.isNullOrWhitespace(testConfiguration.settingsFile)) {
        testConfiguration.settingsFile = path.resolve(testConfiguration.settingsFile);
    }
    tl._writeLine(tl.loc('runSettingsFileInput', testConfiguration.settingsFile));
    testConfiguration.overrideTestrunParameters = tl.getInput('overrideTestrunParameters');
    testConfiguration.runInParallel = tl.getBoolInput('runInParallel');
    tl._writeLine(tl.loc('runInParallelInput', testConfiguration.runInParallel));
    testConfiguration.runTestsInIsolation = tl.getBoolInput('runTestsInIsolation');
    tl._writeLine(tl.loc('runInIsolationInput', testConfiguration.runTestsInIsolation));
    testConfiguration.tiaConfig = getTiaConfiguration();
    testConfiguration.pathtoCustomTestAdapters = tl.getInput('pathtoCustomTestAdapters');
    if (!utils.Helper.isNullOrWhitespace(testConfiguration.pathtoCustomTestAdapters)) {
        testConfiguration.pathtoCustomTestAdapters = path.resolve(testConfiguration.pathtoCustomTestAdapters);
    }
    if (testConfiguration.pathtoCustomTestAdapters &&
        !utils.Helper.pathExistsAsDirectory(testConfiguration.pathtoCustomTestAdapters)) {
        throw new Error(tl.loc('pathToCustomAdaptersInvalid', testConfiguration.pathtoCustomTestAdapters));
    }
    tl._writeLine(tl.loc('pathToCustomAdaptersInput', testConfiguration.pathtoCustomTestAdapters));
    testConfiguration.otherConsoleOptions = tl.getInput('otherConsoleOptions');
    tl._writeLine(tl.loc('otherConsoleOptionsInput', testConfiguration.otherConsoleOptions));
    testConfiguration.codeCoverageEnabled = tl.getBoolInput('codeCoverageEnabled');
    tl._writeLine(tl.loc('codeCoverageInput', testConfiguration.codeCoverageEnabled));
    testConfiguration.buildConfig = tl.getInput('configuration');
    testConfiguration.buildPlatform = tl.getInput('platform');
    testConfiguration.testRunTitle = tl.getInput('testRunTitle');
    testConfiguration.vsTestLocationMethod = tl.getInput('vstestLocationMethod');
    if (testConfiguration.vsTestLocationMethod === utils.Constants.vsTestVersionString) {
        testConfiguration.vsTestVersion = tl.getInput('vsTestVersion');
        if (utils.Helper.isNullEmptyOrUndefined(testConfiguration.vsTestVersion)) {
            tl._writeLine('vsTestVersion is null or empty');
            throw new Error('vsTestVersion is null or empty');
        }
        if ((testConfiguration.vsTestVersion !== '15.0') && (testConfiguration.vsTestVersion !== '14.0')
            && (testConfiguration.vsTestVersion.toLowerCase() !== 'latest')) {
            throw new Error(tl.loc('vstestVersionInvalid', testConfiguration.vsTestVersion));
        }
        tl._writeLine(tl.loc('vsVersionSelected', testConfiguration.vsTestVersion));
    }
    else {
        testConfiguration.vsTestLocation = tl.getInput('vsTestLocation');
        tl._writeLine(tl.loc('vstestLocationSpecified', 'vstest.console.exe', testConfiguration.vsTestLocation));
    }
    if (tl.getBoolInput('uiTests') && testConfiguration.runInParallel) {
        tl.warning(tl.loc('uitestsparallel'));
    }
    // only to facilitate the writing of unit tests 
    testConfiguration.vs15HelperPath = tl.getVariable('vs15Helper');
    if (!testConfiguration.vs15HelperPath) {
        testConfiguration.vs15HelperPath = path.join(__dirname, 'vs15Helper.ps1');
    }
    versionFinder.getVsTestRunnerDetails(testConfiguration);
}
function getTestSelectorBasedInputs(testConfiguration) {
    const testSelection = testConfiguration.testSelection.toLowerCase();
    switch (testSelection) {
        case 'testplan':
            tl._writeLine(tl.loc('testSelectorInput', tl.loc('testPlanSelector')));
            testConfiguration.testplan = parseInt(tl.getInput('testPlan'));
            tl._writeLine(tl.loc('testPlanInput', testConfiguration.testplan));
            testConfiguration.testPlanConfigId = parseInt(tl.getInput('testConfiguration'));
            tl._writeLine(tl.loc('testplanConfigInput', testConfiguration.testPlanConfigId));
            const testSuiteStrings = tl.getDelimitedInput('testSuite', ',', true);
            testConfiguration.testSuites = new Array();
            testSuiteStrings.forEach(element => {
                const testSuiteId = parseInt(element);
                tl._writeLine(tl.loc('testSuiteSelected', testSuiteId));
                testConfiguration.testSuites.push(testSuiteId);
            });
            break;
        case 'testassemblies':
            tl._writeLine(tl.loc('testSelectorInput', tl.loc('testAssembliesSelector')));
            testConfiguration.sourceFilter = tl.getDelimitedInput('testAssemblyVer2', '\n', true);
            tl._writeLine(tl.loc('testAssemblyFilterInput', testConfiguration.sourceFilter));
            testConfiguration.testcaseFilter = tl.getInput('testFiltercriteria');
            tl._writeLine(tl.loc('testFilterCriteriaInput', testConfiguration.testcaseFilter));
            break;
        case 'testrun':
            tl._writeLine(tl.loc('testSelectorInput', tl.loc('testRunSelector')));
            testConfiguration.onDemandTestRunId = tl.getInput('tcmTestRun');
            if (parseInt(testConfiguration.onDemandTestRunId) <= 0) {
                throw new Error(tl.loc('testRunIdInvalid', testConfiguration.onDemandTestRunId));
            }
            tl._writeLine(tl.loc('testRunIdInput', testConfiguration.onDemandTestRunId));
            break;
    }
}
function getTiaConfiguration() {
    const tiaConfiguration = {};
    tiaConfiguration.tiaEnabled = tl.getBoolInput('runOnlyImpactedTests');
    tiaConfiguration.tiaRebaseLimit = tl.getInput('runAllTestsAfterXBuilds');
    tiaConfiguration.fileLevel = tl.getVariable('tia.filelevel');
    tiaConfiguration.sourcesDir = tl.getVariable('build.sourcesdirectory');
    tiaConfiguration.tiaFilterPaths = tl.getVariable('TIA_IncludePathFilters');
    tiaConfiguration.runIdFile = path.join(os.tmpdir(), uuid.v1() + '.txt');
    tiaConfiguration.baseLineBuildIdFile = path.join(os.tmpdir(), uuid.v1() + '.txt');
    tiaConfiguration.useNewCollector = false;
    const useNewCollector = tl.getVariable('tia.useNewCollector');
    if (useNewCollector && useNewCollector.toUpperCase() === 'TRUE') {
        tiaConfiguration.useNewCollector = true;
    }
    var buildReason = tl.getVariable('Build.Reason');
    // https://www.visualstudio.com/en-us/docs/build/define/variables
    if (buildReason && buildReason === "PullRequest") {
        tiaConfiguration.isPrFlow = "true";
    }
    else {
        tiaConfiguration.isPrFlow = tl.getVariable('tia.isPrFlow');
    }
    tiaConfiguration.useTestCaseFilterInResponseFile = tl.getVariable('tia.useTestCaseFilterInResponseFile');
    const releaseuri = tl.getVariable('release.releaseUri');
    tiaConfiguration.context = 'CI';
    if (releaseuri) {
        tiaConfiguration.context = 'CD';
    }
    return tiaConfiguration;
}
