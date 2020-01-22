#!/usr/bin/env node

const program = require('commander');

const { startProcessing } = require('./serviceAlarmsGenerator');

program
    .version('0.0.1', '-v, --version')
    .usage('node alarmsCloudFormationFileGenerator.js [command]')
    .description(
        'command line utility to generate alarms CloudFormation file for a given subway project'
    );

program
    .command('run')
    .description('Generate a Alarms CloudFormation file for a given subway project')
    .option(
        '-p, --path <path>',
        'The absolute path for the Git repo (required).'
    )
    .option(
        '-n, --name <name>',
        'The Project Name in quotes if contains spaces (required).'
    )
    .option(
        '-b, --branch <branch>',
        'The branch to checkout (optional. default: develop).'
    )
    .option(
        '-d, --debug <debug>',
        'The flag to print out debug statements (optional).'
    )
    .option(
        '-i, --install <install> NPM dependencies <required>',
        'This flags is to install npm dependencies for each service.'
    )
    .action(function (opts) {
        if (!opts.path) {
            console.log('specify an absolute path of the git repo');
            process.exit(1);
        }
        if (!opts.name) {
            console.log('specify a name for the project');
            process.exit(1);
        }

        let branch = opts.branch === undefined ? 'develop' : opts.branch;
        let debugFlag = opts.debug === undefined ? false : opts.debug;
        let installDependenciesFlag = opts.install === undefined ? true : opts.install;

        let args = {
            directory: opts.path,
            projectName: opts.name,
            branch: branch,
            debugFlag: debugFlag,
            installDependencies: installDependenciesFlag
        };

        console.log('Running program with these arguments: ', JSON.stringify(args));

        startProcessing(args);
    });

program.parse(process.argv);
