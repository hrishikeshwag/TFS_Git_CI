"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const path = require("path");
const tl = require("vsts-task-lib/task");
const auth = require("nuget-task-common/Authentication");
const locationHelpers = require("nuget-task-common/LocationHelpers");
const NuGetConfigHelper_1 = require("nuget-task-common/NuGetConfigHelper");
const ngToolRunner = require("nuget-task-common/NuGetToolRunner");
const nutil = require("nuget-task-common/Utility");
class RestoreOptions {
    constructor(restoreMode, nuGetPath, configFile, noCache, verbosity, extraArgs, environment) {
        this.restoreMode = restoreMode;
        this.nuGetPath = nuGetPath;
        this.configFile = configFile;
        this.noCache = noCache;
        this.verbosity = verbosity;
        this.extraArgs = extraArgs;
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
            // read inputs
            let solution = tl.getPathInput("solution", true, false);
            let filesList = nutil.resolveFilterSpec(solution, tl.getVariable("System.DefaultWorkingDirectory") || process.cwd());
            filesList.forEach(solutionFile => {
                if (!tl.stats(solutionFile).isFile()) {
                    throw new Error(tl.loc("NotARegularFile", solutionFile));
                }
            });
            let noCache = tl.getBoolInput("noCache");
            let nuGetRestoreArgs = tl.getInput("nuGetRestoreArgs");
            let verbosity = tl.getInput("verbosity");
            let restoreMode = tl.getInput("restoreMode") || "Restore";
            // normalize the restore mode for display purposes, and ensure it's a known one
            let normalizedRestoreMode = ["restore", "install"].find(x => restoreMode.toUpperCase() === x.toUpperCase());
            if (!normalizedRestoreMode) {
                throw new Error(tl.loc("UnknownRestoreMode", restoreMode));
            }
            restoreMode = normalizedRestoreMode;
            let nugetConfigPath = tl.getPathInput("nugetConfigPath", false, true);
            if (!tl.filePathSupplied("nugetConfigPath")) {
                nugetConfigPath = null;
            }
            let nugetUxOption = tl.getInput('nuGetVersion');
            // due to a bug where we accidentally allowed nuGetPath to be surrounded by quotes before,
            // locateNuGetExe() will strip them and check for existence there.
            let nuGetPath = tl.getPathInput("nuGetPath", false, false);
            let userNuGetProvided = false;
            if (nuGetPath !== null && tl.filePathSupplied("nuGetPath")) {
                nuGetPath = nutil.stripLeadingAndTrailingQuotes(nuGetPath);
                // True if the user provided their own version of NuGet
                userNuGetProvided = true;
                if (nugetUxOption !== "custom") {
                    // For back compat, if a path has already been specificed then use it.
                    // However warn the user in the build of this behavior
                    tl.warning(tl.loc("Warning_ConflictingNuGetPreference"));
                }
            }
            else {
                if (nugetUxOption === "custom") {
                    throw new Error(tl.loc("NoNuGetSpecified"));
                }
                // Pull the pre-installed path for NuGet.
                nuGetPath = nutil.getBundledNuGetLocation(nugetUxOption);
            }
            let serviceUri = tl.getEndpointUrl("SYSTEMVSSCONNECTION", false);
            //find nuget location to use
            let credProviderPath = nutil.locateCredentialProvider();
            const quirks = yield ngToolRunner.getNuGetQuirksAsync(nuGetPath);
            // clauses ordered in this way to avoid short-circuit evaluation, so the debug info printed by the functions
            // is unconditionally displayed
            const useCredProvider = ngToolRunner.isCredentialProviderEnabled(quirks) && credProviderPath;
            const useCredConfig = ngToolRunner.isCredentialConfigEnabled(quirks) && !useCredProvider;
            let accessToken = auth.getSystemAccessToken();
            let urlPrefixes = yield locationHelpers.assumeNuGetUriPrefixes(serviceUri);
            tl.debug(`discovered URL prefixes: ${urlPrefixes}`);
            // Note to readers: This variable will be going away once we have a fix for the location service for
            // customers behind proxies
            let testPrefixes = tl.getVariable("NuGetTasks.ExtraUrlPrefixesForTesting");
            if (testPrefixes) {
                urlPrefixes = urlPrefixes.concat(testPrefixes.split(";"));
                tl.debug(`all URL prefixes: ${urlPrefixes}`);
            }
            const authInfo = new auth.NuGetAuthInfo(urlPrefixes, accessToken);
            let environmentSettings = {
                authInfo: authInfo,
                credProviderFolder: useCredProvider ? path.dirname(credProviderPath) : null,
                extensionsDisabled: !userNuGetProvided
            };
            let configFile = nugetConfigPath;
            let credCleanup = () => { return; };
            if (useCredConfig) {
                if (nugetConfigPath) {
                    let nuGetConfigHelper = new NuGetConfigHelper_1.NuGetConfigHelper(nuGetPath, nugetConfigPath, authInfo, environmentSettings);
                    const packageSources = yield nuGetConfigHelper.getSourcesFromConfig();
                    if (packageSources.length !== 0) {
                        nuGetConfigHelper.setSources(packageSources);
                        credCleanup = () => tl.rmRF(nuGetConfigHelper.tempNugetConfigPath, true);
                        configFile = nuGetConfigHelper.tempNugetConfigPath;
                    }
                }
                else {
                    tl._writeLine(tl.loc("Warning_NoConfigForNoCredentialProvider"));
                }
            }
            try {
                let restoreOptions = new RestoreOptions(restoreMode, nuGetPath, configFile, noCache, verbosity, nuGetRestoreArgs, environmentSettings);
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
main();
function restorePackagesAsync(solutionFile, options) {
    let nugetTool = ngToolRunner.createNuGetToolRunner(options.nuGetPath, options.environment);
    nugetTool.arg(options.restoreMode);
    nugetTool.arg("-NonInteractive");
    nugetTool.arg(solutionFile);
    if (options.configFile) {
        nugetTool.arg("-ConfigFile");
        nugetTool.arg(options.configFile);
    }
    if (options.noCache) {
        nugetTool.arg("-NoCache");
    }
    if (options.verbosity && options.verbosity !== "-") {
        nugetTool.arg("-Verbosity");
        nugetTool.arg(options.verbosity);
    }
    if (options.extraArgs) {
        nugetTool.line(options.extraArgs);
    }
    return nugetTool.exec({ cwd: path.dirname(solutionFile) });
}
