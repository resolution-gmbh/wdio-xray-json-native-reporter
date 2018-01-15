const events = require('events')
const path = require('path')
const fs = require('fs')
const mkdirp = require('mkdirp')
const uuid = require('uuid')
const moment = require('moment')

/**
 * Initialize a new `Json` test reporter.
 *
 * @param {Runner} runner
 * @api public
 */
class JsonReporter extends events.EventEmitter {
    constructor (baseReporter, config, options) {
        super()

        this.baseReporter = baseReporter
        this.config = config
        this.options = options || {}

        const inputFormatStr = 'YYYY-MM-DDTHH:mm:ss.SSSZ'
        const outputFormatStr = 'YYYY-MM-DDTHH:mm:ssZ'

        let suitesUIDMap = {}
        let suites = []

        this.on('suite:start', (event) => {
            let xrayId = event.file.slice(event.file.lastIndexOf('\\') + 1).replace('.feature', '')

            if (xrayId) {
                let data = suitesUIDMap[event.uid]
                if (typeof (data) === 'undefined' || data === null) {
                    data = {
                        xrayId: xrayId
                    }

                    if (event.parent === null) {
                        // This is the feature
                        let ids = suites.map(s => s.xrayId)
                        if (ids.indexOf(xrayId) < 0) {
                            data.scenarios = []
                            suites.push(data)
                        }
                    } else {
                        // This is a scenario in a feature
                        data.steps = {}

                        let parent = suitesUIDMap[event.parent]
                        if (parent) {
                            parent.scenarios.push(data)
                        }
                    }

                    suitesUIDMap[event.uid] = data
                }
            }
        })

        this.on('test:pass', (event) => {
            let suite = suitesUIDMap[event.parent]
            let envSteps = suite.steps[event.cid]
            if (typeof (envSteps) === 'undefined' || envSteps === null) {
                envSteps = []
                suite.steps[event.cid] = envSteps
            }

            envSteps.push({
                status: 'PASS',
                comment: event.title

                // TODO
                // evidences: []
            })
        })

        this.on('test:fail', (event) => {
            let suite = suitesUIDMap[event.parent]

            let comment = event.title
            comment += '\r\n'
            if (event.err.message) {
                comment += event.err.message
                comment += '\r\n'
            }
            if (event.err.stack) {
                comment += event.err.stack
                comment += '\r\n'
            }

            let envSteps = suite.steps[event.cid]
            if (typeof (envSteps) === 'undefined' || envSteps === null) {
                envSteps = []
                suite.steps[event.cid] = envSteps
            }

            envSteps.push({
                status: 'FAIL',
                comment: comment

                // TODO
                // evidences: []
            })
        })

        this.on('test:pending', (event) => {
            let suite = suitesUIDMap[event.parent]

            let comment = event.title
            comment += '\r\n'
            if (event.err.message) {
                comment += event.err.message
                comment += '\r\n'
            }
            if (event.err.stack) {
                comment += event.err.stack
                comment += '\r\n'
            }

            let envSteps = suite.steps[event.cid]
            if (typeof (envSteps) === 'undefined' || envSteps === null) {
                envSteps = []
                suite.steps[event.cid] = envSteps
            }

            envSteps.push({
                status: 'FAIL',
                comment: comment

                // TODO
                // evidences: []
            })
        })

        this.on('end', () => {
            const start = moment(this.baseReporter.stats.start, inputFormatStr)
            const end = moment(this.baseReporter.stats.end, inputFormatStr)
            const envToBrowserMap = {}
            const browserToEnvMap = {}

            Object.keys(this.baseReporter.stats.runners)
                .forEach(key => {
                    let browser = this.baseReporter.stats.runners[key].sanitizedCapabilities
                    envToBrowserMap[key] = browser
                    let envs = browserToEnvMap[browser]
                    if (typeof (envs) === 'undefined' || envs === null) {
                        envs = []
                        browserToEnvMap[browser] = envs
                    }
                    envs.push(key)
                })

            let results = Object.keys(browserToEnvMap)
                .map(browser => {
                    let tests = suites.reduce((allTests, suite) => {
                        let tests = suite.scenarios.reduce((result, current) => {
                            let steps = browserToEnvMap[browser]
                                .reduce((steps, env) => {
                                    if (current.steps[env]) {
                                        return steps.concat(current.steps[env])
                                    }
                                    return steps
                                }, [])

                            let status = steps.reduce((resultStatus, currentStep) => {
                                if (resultStatus === 'FAIL') {
                                    return resultStatus
                                }

                                if (currentStep.status === 'FAIL') {
                                    return 'FAIL'
                                }

                                return resultStatus
                            }, 'PASS')

                            // This sucks, but Xray isn't displaying step info
                            // for automated tests yet, I have opened an issue
                            // to add this feature, until then we add all the info
                            // to the suites comment so that we can still debug
                            // failing test steps
                            let comment = steps.reduce((comment, currentStep) => {
                                if (currentStep.status === 'FAIL') {
                                    comment += currentStep.comment
                                    comment += '\r\n'
                                }

                                return comment
                            }, '')

                            return result.concat({
                                testKey: current.xrayId,
                                start: start.format(outputFormatStr),
                                finish: end.format(outputFormatStr),
                                status: status,
                                steps: steps,
                                examples: [status],
                                comment: comment

                                // TODO
                                // evidences: []
                                // results: []
                            })
                        }, [])

                        return allTests.concat(tests)
                    }, [])

                    let dedupedTestIds = {}
                    let dedupedTests = []
                    tests.forEach(test => {
                        if (dedupedTestIds[test.testKey]) {
                            // This test was duplicated, this means it
                            // was the result of an examples table
                            let existing = dedupedTestIds[test.testKey]
                            // Add the current tests result to the existing examples
                            existing.examples.push(test.status)
                            // Add the current tests comment to the existing comment
                            if (test.comment.length > 0) {
                                existing.comment += '\r\n'
                                existing.comment += test.comment
                            }

                            return
                        }

                        dedupedTestIds[test.testKey] = test
                        dedupedTests.push(test)
                    })

                    let result = {
                        info: {
                            summary: `Execution of test plan: ${this.options.testPlanKey} Browser: ${browser}`,
                            startDate: start.format(outputFormatStr),
                            finishDate: end.format(outputFormatStr),
                            testPlanKey: this.options.testPlanKey,
                            testEnvironments: [browser]
                        },
                        tests: dedupedTests
                    }

                    if (this.options.revision) {
                        result.info.revision = this.options.revision
                    }

                    if (this.options.version) {
                        result.info.version = this.options.version
                    }

                    if (this.options.user) {
                        result.info.user = this.options.user
                    }

                    if (this.options.project) {
                        result.info.project = this.options.project
                    }

                    return result
                })

            this.write(results)
        })
    }

    write (json) {
        if (!this.options || typeof this.options.outputDir !== 'string') {
            return console.log(`Cannot write json report: empty or invalid 'outputDir'.`)
        }

        try {
            const dir = path.resolve(this.options.outputDir)
            const filename = `WDIO.xray.json.${uuid.v1()}.json`
            const filepath = path.join(dir, filename)
            mkdirp.sync(dir)
            fs.writeFileSync(filepath, JSON.stringify(json))
            console.log(`Wrote json report to [${this.options.outputDir}].`)
        } catch (e) {
            console.log(`Failed to write json report to [${this.options.outputDir}]. Error: ${e}`)
        }
    }

    format (val) {
        return JSON.stringify(this.baseReporter.limit(val))
    }
}

module.exports = JsonReporter
