"use strict";
const tl = require('vsts-task-lib/task');
const taskInputParser = require('./taskinputparser');
const localTest = require('./vstest');
const path = require('path');
const distributedTest = require('./distributedtest');
try {
    tl.setResourcePath(path.join(__dirname, 'task.json'));
    const parallelExecution = tl.getVariable('System.ParallelExecutionType');
    tl.debug('Value of ParallelExecutionType :' + parallelExecution);
    const testType = tl.getInput('testSelector');
    tl.debug('Value of Test Selector :' + testType);
    if ((parallelExecution && parallelExecution.toLowerCase() === 'multimachine')
        || testType.toLowerCase() === 'testplan' || testType.toLowerCase() === 'testrun') {
        tl._writeLine(tl.loc('distributedTestWorkflow'));
        tl._writeLine('======================================================');
        const dtaTestConfig = taskInputParser.getDistributedTestConfigurations();
        tl._writeLine('======================================================');
        const test = new distributedTest.DistributedTest(dtaTestConfig);
        test.runDistributedTest();
    }
    else {
        localTest.startTest();
    }
}
catch (error) {
    tl.setResult(tl.TaskResult.Failed, error);
}
