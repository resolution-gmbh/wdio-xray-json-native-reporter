const events = require('events');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const uuid = require('uuid');
const moment = require('moment');
const request = require('sync-request');
const { projectId } = require('../package.json');

/**
 * Initialize a new `Json` test reporter.
 *
 * @param {Runner} runner
 * @api public
 */
class JsonReporter extends events.EventEmitter {
    constructor (baseReporter, config, options) {
        super();

        this.baseReporter = baseReporter;
        this.config = config;
        this.options = options || {};

        this.inputFormatStr = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
        this.outputFormatStr = 'YYYY-MM-DDTHH:mm:ssZ';

        this.suitesUIDMap = {};
        this.suites = [];

        this.on('suite:start', this.onSuiteStart.bind(this));

        this.on('test:pass', this.onTestPass.bind(this));

        this.on('test:fail', this.onTestFailOrPending.bind(this));

        this.on('test:pending', this.onTestFailOrPending.bind(this));

        this.on('end', this.onEnd.bind(this));
    }

    onSuiteStart (event) {
        let xrayId;
        if (event.tags && event.tags.length > 0 && event.parent !== null) {
            // Skip first tag if it's on the first line
            xrayId = event.tags.reduce((acc, tag) => {
                const pId = tag.name.substr(1, tag.name.search('-') - 1);
                if (!acc && tag.line !== 1 && tag.name.substr(1, pId === projectId)) return tag.name.substring(1);
                else return acc;
            }, null);
        } else {
            xrayId = event.file.slice(event.file.lastIndexOf(path.sep) + 1).replace('.feature', '');
        }

        if (xrayId) {
            let data = this.suitesUIDMap[event.uid];
            if (typeof (data) === 'undefined' || data === null) {
                data = {
                    xrayId: xrayId
                };

                if (event.parent === null) {
                    // This is the feature
                    let ids = this.suites.map(s => s.xrayId);
                    if (ids.indexOf(xrayId) < 0) {
                        data.scenarios = [];
                        this.suites.push(data);
                    }
                } else {
                    // This is a scenario in a feature
                    data.steps = {};

                    let parent = this.suitesUIDMap[event.parent];
                    if (parent) {
                        parent.scenarios.push(data);
                    }
                }

                this.suitesUIDMap[event.uid] = data;
            }
        }
    }

    onTestPass (event) {
        let suite = this.suitesUIDMap[event.parent];
        let envSteps = suite.steps[event.cid];
        if (typeof (envSteps) === 'undefined' || envSteps === null) {
            envSteps = [];
            suite.steps[event.cid] = envSteps;
        }

        envSteps.push({
            status: 'PASS',
            comment: event.title

            // TODO
            // evidences: []
        });
    }

    onTestFailOrPending (event) {
        let suite = this.suitesUIDMap[event.parent];

        let comment = event.title;
        comment += '\r\n';
        if (event.err.message) {
            comment += event.err.message;
            comment += '\r\n';
        }
        if (event.err.stack) {
            comment += event.err.stack;
            comment += '\r\n';
        }

        let envSteps = suite.steps[event.cid];
        if (typeof (envSteps) === 'undefined' || envSteps === null) {
            envSteps = [];
            suite.steps[event.cid] = envSteps;
        }

        envSteps.push({
            status: 'FAIL',
            comment: comment

            // TODO
            // evidences: []
        });
    }

    onEnd () {
        const start = moment(this.baseReporter.stats.start, this.inputFormatStr);
        const end = moment(this.baseReporter.stats.end, this.inputFormatStr);
        const envToBrowserMap = {};
        const browserToEnvMap = {};

        Object.keys(this.baseReporter.stats.runners)
            .forEach(key => {
                let browser = this.baseReporter.stats.runners[key].sanitizedCapabilities;
                envToBrowserMap[key] = browser;
                let envs = browserToEnvMap[browser];
                if (typeof (envs) === 'undefined' || envs === null) {
                    envs = [];
                    browserToEnvMap[browser] = envs;
                }
                envs.push(key);
            });

        let results = Object.keys(browserToEnvMap)
            .map(browser => {
                let tests = this.suites.reduce((allTests, suite) => {
                    let tests = suite.scenarios.reduce((result, current) => {
                        let steps = browserToEnvMap[browser]
                            .reduce((steps, env) => {
                                if (current.steps[env]) {
                                    return steps.concat(current.steps[env]);
                                }
                                return steps;
                            }, []);

                        let status = steps.reduce((resultStatus, currentStep) => {
                            if (resultStatus === 'FAIL') {
                                return resultStatus;
                            }

                            if (currentStep.status === 'FAIL') {
                                return 'FAIL';
                            }

                            return resultStatus;
                        }, 'PASS');

                        // This sucks, but Xray isn't displaying step info
                        // for automated tests yet, I have opened an issue
                        // to add this feature, until then we add all the info
                        // to the suites comment so that we can still debug
                        // failing test steps
                        let comment = steps.reduce((comment, currentStep) => {
                            if (currentStep.status === 'FAIL') {
                                comment += currentStep.comment;
                                comment += '\r\n';
                            }

                            return comment;
                        }, '');

                        return result.concat({
                            testKey: current.xrayId,
                            start: start.format(this.outputFormatStr),
                            finish: end.format(this.outputFormatStr),
                            status: status,
                            steps: steps,
                            examples: [status],
                            comment: comment

                            // TODO
                            // evidences: []
                            // results: []
                        });
                    }, []);

                    return allTests.concat(tests);
                }, []);

                let dedupedTestIds = {};
                let dedupedTests = [];
                tests.forEach(test => {
                    if (dedupedTestIds[test.testKey]) {
                        // This test was duplicated, this means it
                        // was the result of an examples table
                        let existing = dedupedTestIds[test.testKey];
                        // Add the current tests result to the existing examples
                        existing.examples.push(test.status);
                        // Add the current tests comment to the existing comment
                        if (test.comment.length > 0) {
                            existing.comment += '\r\n';
                            existing.comment += test.comment;
                        }

                        return;
                    }

                    dedupedTestIds[test.testKey] = test;
                    dedupedTests.push(test);
                });

                let result = {
                    info: {
                        startDate: start.format(this.outputFormatStr),
                        finishDate: end.format(this.outputFormatStr),
                        testEnvironments: [browser]
                    },
                    tests: dedupedTests
                };

                if (this.options.additionalEnvironmentData) {
                    if (Array.isArray(this.options.additionalEnvironmentData)) {
                        result.info.testEnvironments.push(...this.options.additionalEnvironmentData);
                    } else {
                        result.info.testEnvironments.push(this.options.additionalEnvironmentData);
                    }
                }

                if (this.options.testKey) {
                    result.info.summary = `Execution of test ${this.options.testKey} in environment ${result.info.testEnvironments.join(', ')}`;
                } else if (this.options.testSetKey) {
                    result.info.summary = `Execution of test set ${this.options.testSetKey} in environment ${result.info.testEnvironments.join(', ')}`;
                } else if (this.options.testPlanKey) {
                    result.info.summary = `Execution of test plan ${this.options.testPlanKey} in environment ${result.info.testEnvironments.join(', ')}`;
                    result.info.testPlanKey = this.options.testPlanKey;
                } else if (this.options.testExecutionKey) {
                    result.info.summary = `Execution of test execution ${this.options.testExecutionKey} in environment ${result.info.testEnvironments.join(', ')}`;
                } else {
                    result.info.summary = `Execution of test undefined in environment ${result.info.testEnvironments.join(', ')}`;
                }

                if (this.options.testExecutionKey) {
                    result.testExecutionKey = this.options.testExecutionKey;
                }

                if (this.options.revision) {
                    result.info.revision = this.options.revision;
                }

                if (this.options.version) {
                    result.info.version = this.options.version;
                }

                if (this.options.user) {
                    result.info.user = this.options.user;
                }

                if (this.options.project) {
                    result.info.project = this.options.project;
                }

                return result;
            });

        this.write(results);
        if (this.options.upload && this.options.xrayHost) {
            this.upload(results);
        }
        if (this.options.upload && this.options.slackWebhookUrl) {
            this.reportToSlack();
        }
    }

    write (json) {
        if (!this.options || typeof this.options.outputDir !== 'string') {
            return console.log('Cannot write json report: empty or invalid \'outputDir\'.');
        }

        try {
            const dir = path.resolve(this.options.outputDir);
            const filename = `WDIO.xray.json.${uuid.v1()}.json`;
            const filepath = path.join(dir, filename);
            mkdirp.sync(dir);
            fs.writeFileSync(filepath, JSON.stringify(json));
            console.log(`Wrote json report to [${this.options.outputDir}].`);
        } catch (e) {
            console.log(`Failed to write json report to [${this.options.outputDir}]. Error: ${e}`);
        }
    }

    upload (json) {
        json.forEach(entry => {
            try {
                const options = {
                    json: entry
                };
                if (this.options.xrayUser && this.options.xrayPass) {
                    options.headers = {
                        authorization: 'Basic ' + new Buffer(this.options.xrayUser + ':' + this.options.xrayPass, 'ascii').toString('base64')
                    };
                }
                const res = request('POST', `${this.options.xrayHost}/rest/raven/1.0/import/execution`, options);
                const resBody = res.getBody('utf-8');
                if (res.statusCode >= 300) {
                    console.error(`Error uploading results to XRay: ${resBody}`);
                } else {
                    const body = JSON.parse(resBody);
                    console.log(`Sucessfully uploaded test execution as ${body.testExecIssue.key}. You can access it via ${this.options.xrayHost}/browse/${body.testExecIssue.key}.`);
                }
            } catch (err) {
                console.error(`Error uploading results to XRay host: ${err}`);
            }
        });
    }

    reportToSlack () {
        // TODO
    }

    format (val) {
        return JSON.stringify(this.baseReporter.limit(val));
    }
}

module.exports = JsonReporter;
