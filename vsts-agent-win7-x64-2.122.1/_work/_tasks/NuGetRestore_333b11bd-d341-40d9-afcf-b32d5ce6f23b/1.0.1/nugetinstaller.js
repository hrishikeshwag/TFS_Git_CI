"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const tl = require("vsts-task-lib/task");
// Remove once task lib 2.0.4 releases
global['_vsts_task_lib_loaded'] = true;
const path = require("path");
const auth = require("nuget-task-common/Authentication");
const locationHelpers = require("nuget-task-common/LocationHelpers");
const NuGetConfigHelper_1 = require("nuget-task-common/NuGetConfigHelper");
const nuGetGetter = require("nuget-task-common/NuGetToolGetter");
const ngToolRunner = require("nuget-task-common/NuGetToolRunner");
const nutil = require("nuget-task-common/Utility");
const vsts = require("vso-node-api/WebApi");
const peParser = require('nuget-task-common/pe-parser/index');
const NUGET_ORG_V2_URL = "https://www.nuget.org/api/v2/";
const NUGET_ORG_V3_URL = "https://api.nuget.org/v3/index.json";
class RestoreOptions {
    constructor(nuGetPath, configFile, noCache, verbosity, packagesDirectory, environment) {
        this.nuGetPath = nuGetPath;
        this.configFile = configFile;
        this.noCache = noCache;
        this.verbosity = verbosity;
        this.packagesDirectory = packagesDirectory;
        this.environment = environment;
    }
}
function main() {
    return __awaiter(this, void 0, Promise, function* () {
        let buildIdentityDisplayName = null;
        let buildIdentityAccount = null;
        try {
            tl.setResourcePath(path.join(__dirname, "task.json"));
            nutil.setConsoleCodePage();
            // Reading inputs
            let solution = tl.getPathInput("solution", true, false);
            let filesList = nutil.resolveFilterSpec(solution, tl.getVariable("System.DefaultWorkingDirectory") || process.cwd());
            filesList.forEach(solutionFile => {
                if (!tl.stats(solutionFile).isFile()) {
                    throw new Error(tl.loc("NotARegularFile", solutionFile));
                }
            });
            let noCache = tl.getBoolInput("noCache");
            let verbosity = tl.getInput("verbosity");
            let packagesDirectory = tl.getPathInput("packagesDirectory");
            if (!tl.filePathSupplied("packagesDirectory")) {
                packagesDirectory = null;
            }
            // Getting NuGet
            tl.debug('Getting NuGet');
            let nuGetPath = undefined;
            try {
                nuGetPath = process.env[nuGetGetter.NUGET_EXE_TOOL_PATH_ENV_VAR];
                if (!nuGetPath) {
                    nuGetPath = yield nuGetGetter.getNuGet("4.0.0");
                }
            }
            catch (error) {
                tl.setResult(tl.TaskResult.Failed, error.message);
                return;
            }
            const nuGetVersion = yield peParser.getFileVersionInfoAsync(nuGetPath);
            // Discovering NuGet quirks based on the version
            tl.debug('Getting NuGet quirks');
            const quirks = yield ngToolRunner.getNuGetQuirksAsync(nuGetPath);
            let credProviderPath = nutil.locateCredentialProvider();
            // Clauses ordered in this way to avoid short-circuit evaluation, so the debug info printed by the functions
            // is unconditionally displayed
            const useCredProvider = ngToolRunner.isCredentialProviderEnabled(quirks) && credProviderPath;
            const useCredConfig = ngToolRunner.isCredentialConfigEnabled(quirks) && !useCredProvider;
            // Setting up auth-related variables
            tl.debug('Setting up auth');
            let serviceUri = tl.getEndpointUrl("SYSTEMVSSCONNECTION", false);
            let urlPrefixes = yield locationHelpers.assumeNuGetUriPrefixes(serviceUri);
            tl.debug(`Discovered URL prefixes: ${urlPrefixes}`);
            ;
            // Note to readers: This variable will be going away once we have a fix for the location service for
            // customers behind proxies
            let testPrefixes = tl.getVariable("NuGetTasks.ExtraUrlPrefixesForTesting");
            if (testPrefixes) {
                urlPrefixes = urlPrefixes.concat(testPrefixes.split(";"));
                tl.debug(`All URL prefixes: ${urlPrefixes}`);
            }
            let accessToken = auth.getSystemAccessToken();
            const authInfo = new auth.NuGetAuthInfo(urlPrefixes, accessToken);
            let environmentSettings = {
                authInfo: authInfo,
                credProviderFolder: useCredProvider ? path.dirname(credProviderPath) : null,
                extensionsDisabled: true
            };
            // Setting up sources, either from provided config file or from feed selection
            tl.debug('Setting up sources');
            let nuGetConfigPath = undefined;
            let selectOrConfig = tl.getInput("selectOrConfig");
            // This IF is here in order to provide a value to nuGetConfigPath (if option selected, if user provided it)
            // and then pass it into the config helper
            if (selectOrConfig === "config") {
                nuGetConfigPath = tl.getPathInput("nugetConfigPath", false, true);
                if (!tl.filePathSupplied("nugetConfigPath")) {
                    nuGetConfigPath = undefined;
                }
            }
            // If there was no nuGetConfigPath, NuGetConfigHelper will create one
            let nuGetConfigHelper = new NuGetConfigHelper_1.NuGetConfigHelper(nuGetPath, nuGetConfigPath, authInfo, environmentSettings);
            let credCleanup = () => { return; };
            // Now that the NuGetConfigHelper was initialized with all the known information we can proceed
            // and check if the user picked the 'select' option to fill out the config file if needed
            if (selectOrConfig === "select") {
                let sources = new Array();
                let feed = tl.getInput("feed");
                if (feed) {
                    let feedUrl = yield getNuGetFeedRegistryUrl(accessToken, feed, nuGetVersion);
                    sources.push({
                        feedName: feed,
                        feedUri: feedUrl
                    });
                }
                let includeNuGetOrg = tl.getBoolInput("includeNuGetOrg", false);
                if (includeNuGetOrg) {
                    let nuGetUrl = nuGetVersion.productVersion.a < 3 ? NUGET_ORG_V2_URL : NUGET_ORG_V3_URL;
                    sources.push({
                        feedName: "NuGetOrg",
                        feedUri: nuGetUrl
                    });
                }
                // Creating NuGet.config for the user
                if (sources.length > 0) {
                    tl.debug(`Adding the following sources to the config file: ${sources.map(x => x.feedName).join(';')}`);
                    nuGetConfigHelper.setSources(sources, false);
                    credCleanup = () => tl.rmRF(nuGetConfigHelper.tempNugetConfigPath);
                    nuGetConfigPath = nuGetConfigHelper.tempNugetConfigPath;
                }
                else {
                    tl.debug('No sources were added to the temp NuGet.config file');
                }
            }
            // Setting creds in the temp NuGet.config if needed
            let configFile = nuGetConfigPath;
            if (useCredConfig) {
                tl.debug('Config credentials should be used');
                if (nuGetConfigPath) {
                    let nuGetConfigHelper = new NuGetConfigHelper_1.NuGetConfigHelper(nuGetPath, nuGetConfigPath, authInfo, environmentSettings);
                    const packageSources = yield nuGetConfigHelper.getSourcesFromConfig();
                    if (packageSources.length !== 0) {
                        nuGetConfigHelper.setSources(packageSources, true);
                        credCleanup = () => tl.rmRF(nuGetConfigHelper.tempNugetConfigPath);
                        configFile = nuGetConfigHelper.tempNugetConfigPath;
                    }
                    else {
                        tl.debug('No package sources were added');
                    }
                }
                else {
                    console.log(tl.loc("Warning_NoConfigForNoCredentialProvider"));
                }
            }
            try {
                let restoreOptions = new RestoreOptions(nuGetPath, configFile, noCache, verbosity, packagesDirectory, environmentSettings);
                for (const solutionFile of filesList) {
                    yield restorePackagesAsync(solutionFile, restoreOptions);
                }
            }
            finally {
                credCleanup();
            }
            tl.setResult(tl.TaskResult.Succeeded, tl.loc("PackagesInstalledSuccessfully"));
        }
        catch (err) {
            tl.error(err);
            if (buildIdentityDisplayName || buildIdentityAccount) {
                tl.warning(tl.loc("BuildIdentityPermissionsHint", buildIdentityDisplayName, buildIdentityAccount));
            }
            tl.setResult(tl.TaskResult.Failed, tl.loc("PackagesFailedToInstall"));
        }
    });
}
function restorePackagesAsync(solutionFile, options) {
    let nugetTool = ngToolRunner.createNuGetToolRunner(options.nuGetPath, options.environment);
    nugetTool.arg("restore");
    nugetTool.arg(solutionFile);
    if (options.packagesDirectory) {
        nugetTool.arg("-PackagesDirectory");
        nugetTool.arg(options.packagesDirectory);
    }
    if (options.noCache) {
        nugetTool.arg("-NoCache");
    }
    if (options.verbosity && options.verbosity !== "-") {
        nugetTool.arg("-Verbosity");
        nugetTool.arg(options.verbosity);
    }
    nugetTool.arg("-NonInteractive");
    if (options.configFile) {
        nugetTool.arg("-ConfigFile");
        nugetTool.arg(options.configFile);
    }
    return nugetTool.exec({ cwd: path.dirname(solutionFile) });
}
function getNuGetFeedRegistryUrl(accessToken, feedId, nuGetVersion) {
    return __awaiter(this, void 0, Promise, function* () {
        const ApiVersion = "3.0-preview.1";
        let PackagingAreaName = "nuget";
        let PackageAreaId = nuGetVersion.productVersion.a < 3 ? "5D6FC3B3-EF78-4342-9B6E-B3799C866CFA" : "9D3A4E8E-2F8F-4AE1-ABC2-B461A51CB3B3";
        let credentialHandler = vsts.getBearerHandler(accessToken);
        let collectionUrl = tl.getVariable("System.TeamFoundationCollectionUri");
        // The second element contains the transformed packaging URL
        let packagingCollectionUrl = (yield locationHelpers.assumeNuGetUriPrefixes(collectionUrl))[1];
        if (!packagingCollectionUrl) {
            packagingCollectionUrl = collectionUrl;
        }
        const overwritePackagingCollectionUrl = tl.getVariable("NuGet.OverwritePackagingCollectionUrl");
        if (overwritePackagingCollectionUrl) {
            tl.debug("Overwriting packaging collection URL");
            packagingCollectionUrl = overwritePackagingCollectionUrl;
        }
        let vssConnection = new vsts.WebApi(packagingCollectionUrl, credentialHandler);
        let coreApi = vssConnection.getCoreApi();
        let data = yield coreApi.vsoClient.getVersioningData(ApiVersion, PackagingAreaName, PackageAreaId, { feedId: feedId });
        return data.requestUrl;
    });
}
main();
