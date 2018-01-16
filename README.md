WDIO Xray JSON Reporter
===================

> A WebdriverIO plugin. Report results in Xray json format.

This project was derived from the 'wdio-json-reporter' found [here](https://github.com/fijijavis/wdio-json-reporter)


## Installation

The easiest way is to keep `wdio-xray-json-native-reporter` as a dependency in your `package.json`.

```json
{
  "dependencies": {
    "wdio-xray-json-native-reporter": "~1.0.0"
  }
}
```

You can simply do it by:

```bash
npm install https://github.com/resolution-gmbh/wdio-xray-json-native-reporter.git --save
```

Instructions on how to install `WebdriverIO` can be found [here](http://webdriver.io/guide/getstarted/install.html).

## Configuration

Following code shows the default wdio test runner configuration. Just add `'xray-json-native'` as reporter
to the array. To get some output during the test you can run the [WDIO Dot Reporter](https://github.com/webdriverio/wdio-dot-reporter) and the WDIO JSON Reporter at the same time:

```js
// wdio.conf.js
module.exports = {
  // ...
  reporters: ['dot', 'xray-json-native'],
  reporterOptions: {
    outputDir: './'
  },
  // ...
};
```

It's also possible to combine all the resulting jsons into one.

```js
// wdio.conf.js
module.exports = {
  // ...
  reporters: ['dot', 'xray-json-native'],
  reporterOptions: {
    outputDir: './',
    combined: true
  },
  // ...
};
```

Another option is to configure the resulting filename of the JSON, if combined is set to false or not set a number is added after the file name: wdio-results-0-1.json etc.


```js
// wdio.conf.js
module.exports = {
  // ...
  reporters: ['dot', 'xray-json-native'],
  reporterOptions: {
    outputDir: './',
    filename: 'wdio-results'
  },
  // ...
};
```

### Xray and Jira specific information:

If you don't define a `test{,Set,Plan}Key`, the feature file names must match the following format to ensure the test ids match in the output match the ids in Jira.

```
ABC-123.feature -> Maps to Jira test issue ABC-123
```

If you do define one of these options, this is not a requirement.

Xray and Jira specific options:

```js
reporterOptions: {
    version: '1.0', // Project version in Jira
    revision: '123',
    user: 'bob', // Jira username
    project: 'bobs project', // Jira project
    testPlanKey: 'ABC-XXX' // Jira test plan id
}
```

Instead of `testPlanKey`, you can also define `testKey` or `testSetKey` but never more than one of these.

If you additionally define a couple of optionals about your Jira host running XRay, you can have it uploaded automatically:

```js
reporterOptions: {
    testKey: 'ABC-XXX', // Jira test id
    upload: true,
    xrayHost: 'https://jira.example.com',
    xrayUser: 'jiraUser', // This user must have issue creation permission on your XRay project
    xrayPass: 'jiraUsersPassword' 
}
```

When the upload is done, a link to the newly created test execution. Notice that for every browser, a separate execution issue will be generated. 

## Sample Output
```
[
    {
        "info": {
            "summary": "Execution of test plan: ABC-XXX Browser: chrome",
            "startDate": "2017-08-30T11:36:58-04:00",
            "finishDate": "2017-08-30T11:37:31-04:00",
            "testPlanKey": "ABC-XXX",
            "testEnvironments": [
                "chrome"
            ],
            "user": "XXXXX"
        },
        "tests": [
            {
                "testKey": "ABC-XXX",
                "start": "2017-08-30T11:36:58-04:00",
                "finish": "2017-08-30T11:37:31-04:00",
                "status": "FAIL",
                "steps": [
                    {
                        "status": "PASS",
                        "comment": "I am on the login page"
                    },
                    {
                        "status": "FAIL",
                        "comment": "I log in with user \"admin\"\r\nStep \"I log in with user \"admin\"\" is not defined. You can ignore this error by setting\n                              cucumberOpts.ignoreUndefinedDefinitions as true.\r\ntemp\\features\\ABC-XXX.feature:13\r\n"
                    },
                    {
                        "status": "FAIL",
                        "comment": "a password \"password\"\r\nStep \"a password \"password\"\" is not defined. You can ignore this error by setting\n                              cucumberOpts.ignoreUndefinedDefinitions as true.\r\ntemp\\features\\ABC-XXX.feature:14\r\n"
                    },
                    {
                        "status": "FAIL",
                        "comment": "the import dialog is visible\r\n"
                    }
                ],
                "examples": []
            },
            {
                "testKey": "ABC-XXX",
                "start": "2017-08-30T11:36:58-04:00",
                "finish": "2017-08-30T11:37:31-04:00",
                "status": "FAIL",
                "steps": [
                    {
                        "status": "PASS",
                        "comment": "I am on the login page"
                    },
                    {
                        "status": "FAIL",
                        "comment": "I log in with user \"admin\"\r\nStep \"I log in with user \"admin\"\" is not defined. You can ignore this error by setting\n                              cucumberOpts.ignoreUndefinedDefinitions as true.\r\ntemp\\features\\ABC-XXX.feature:13\r\n"
                    },
                    {
                        "status": "FAIL",
                        "comment": "a password \"password123\"\r\nStep \"a password \"password123\"\" is not defined. You can ignore this error by setting\n                              cucumberOpts.ignoreUndefinedDefinitions as true.\r\ntemp\\features\\ABC-XXX.feature:14\r\n"
                    },
                    {
                        "status": "FAIL",
                        "comment": "the login page displays error \"Incorrect username or password\"\r\n"
                    }
                ],
                "examples": [
                    "FAIL",
                    "FAIL"
                ]
            }
        ]
    },
    {
        "info": {
            "summary": "Execution of test plan: ABC-XXX Browser: edge",
            "startDate": "2017-08-30T11:36:58-04:00",
            "finishDate": "2017-08-30T11:37:31-04:00",
            "testPlanKey": "ABC-XXX",
            "testEnvironments": [
                "edge"
            ],
            "user": "XXX"
        },
        "tests": [
            {
                "testKey": "ABC-XXX",
                "start": "2017-08-30T11:36:58-04:00",
                "finish": "2017-08-30T11:37:31-04:00",
                "status": "FAIL",
                "steps": [
                    {
                        "status": "PASS",
                        "comment": "I am on the login page"
                    },
                    {
                        "status": "FAIL",
                        "comment": "I log in with user \"admin\"\r\nStep \"I log in with user \"admin\"\" is not defined. You can ignore this error by setting\n                              cucumberOpts.ignoreUndefinedDefinitions as true.\r\ntemp\\features\\ABC-XXX.feature:13\r\n"
                    },
                    {
                        "status": "FAIL",
                        "comment": "a password \"password\"\r\nStep \"a password \"password\"\" is not defined. You can ignore this error by setting\n                              cucumberOpts.ignoreUndefinedDefinitions as true.\r\ntemp\\features\\ABC-XXX.feature:14\r\n"
                    },
                    {
                        "status": "FAIL",
                        "comment": "the import dialog is visible\r\n"
                    }
                ],
                "examples": []
            },
            {
                "testKey": "ABC-XXX",
                "start": "2017-08-30T11:36:58-04:00",
                "finish": "2017-08-30T11:37:31-04:00",
                "status": "FAIL",
                "steps": [
                    {
                        "status": "PASS",
                        "comment": "I am on the login page"
                    },
                    {
                        "status": "FAIL",
                        "comment": "I log in with user \"admin\"\r\nStep \"I log in with user \"admin\"\" is not defined. You can ignore this error by setting\n                              cucumberOpts.ignoreUndefinedDefinitions as true.\r\ntemp\\features\\ABC-XXX.feature:13\r\n"
                    },
                    {
                        "status": "FAIL",
                        "comment": "a password \"password123\"\r\nStep \"a password \"password123\"\" is not defined. You can ignore this error by setting\n                              cucumberOpts.ignoreUndefinedDefinitions as true.\r\ntemp\\features\\ABC-XXX.feature:14\r\n"
                    },
                    {
                        "status": "FAIL",
                        "comment": "the login page displays error \"Incorrect username or password\"\r\n"
                    }
                ],
                "examples": [
                    "FAIL",
                    "FAIL"
                ]
            }
        ]
    },
    {
        "info": {
            "summary": "Execution of test plan: ABC-XXX Browser: firefox",
            "startDate": "2017-08-30T11:36:58-04:00",
            "finishDate": "2017-08-30T11:37:31-04:00",
            "testPlanKey": "ABC-XXX",
            "testEnvironments": [
                "firefox"
            ],
            "user": "XXX"
        },
        "tests": [
            {
                "testKey": "ABC-XXX",
                "start": "2017-08-30T11:36:58-04:00",
                "finish": "2017-08-30T11:37:31-04:00",
                "status": "FAIL",
                "steps": [
                    {
                        "status": "PASS",
                        "comment": "I am on the login page"
                    },
                    {
                        "status": "FAIL",
                        "comment": "I log in with user \"admin\"\r\nStep \"I log in with user \"admin\"\" is not defined. You can ignore this error by setting\n                              cucumberOpts.ignoreUndefinedDefinitions as true.\r\ntemp\\features\\ABC-XXX.feature:13\r\n"
                    },
                    {
                        "status": "FAIL",
                        "comment": "a password \"password\"\r\nStep \"a password \"password\"\" is not defined. You can ignore this error by setting\n                              cucumberOpts.ignoreUndefinedDefinitions as true.\r\ntemp\\features\\ABC-XXX.feature:14\r\n"
                    },
                    {
                        "status": "FAIL",
                        "comment": "the import dialog is visible\r\n"
                    }
                ],
                "examples": []
            },
            {
                "testKey": "ABC-XXX",
                "start": "2017-08-30T11:36:58-04:00",
                "finish": "2017-08-30T11:37:31-04:00",
                "status": "FAIL",
                "steps": [
                    {
                        "status": "PASS",
                        "comment": "I am on the login page"
                    },
                    {
                        "status": "FAIL",
                        "comment": "I log in with user \"admin\"\r\nStep \"I log in with user \"admin\"\" is not defined. You can ignore this error by setting\n                              cucumberOpts.ignoreUndefinedDefinitions as true.\r\ntemp\\features\\ABC-XXX.feature:13\r\n"
                    },
                    {
                        "status": "FAIL",
                        "comment": "a password \"password123\"\r\nStep \"a password \"password123\"\" is not defined. You can ignore this error by setting\n                              cucumberOpts.ignoreUndefinedDefinitions as true.\r\ntemp\\features\\ABC-XXX.feature:14\r\n"
                    },
                    {
                        "status": "FAIL",
                        "comment": "the login page displays error \"Incorrect username or password\"\r\n"
                    }
                ],
                "examples": [
                    "FAIL",
                    "FAIL"
                ]
            }
        ]
    }
]
```

----

For more information on WebdriverIO see the [homepage](http://webdriver.io).
