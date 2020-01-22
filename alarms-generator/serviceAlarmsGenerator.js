'use strict';

require('dotenv').config({
    path: './excluded-files.env'
});
const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const alarmsTemplate = require('./alarmsTemplate');
let args = {};
let excludedFiles = [];

const getDirectories = (source) => {
    let directories = [];
    let files = fs.readdirSync(source);
    for (let i in files) {
        let name = source + '/' + files[i];
        if (fs.statSync(name).isDirectory()) {
            directories.push(name);
        }
    }
    return directories;
};

const changeDirectory = (path = args.directory) => {
    try {
        process.chdir(path);
    } catch (err) {
        printDebugMessage(`Invalid directory: ${err}`);
    }
};

const runShellCommand = gitCommand => {
    return new Promise((resolve, reject) => {
        printDebugMessage('Running the following shell command: ' + gitCommand);
        exec(gitCommand, (err, stdout, stdoutError) => {
            if (err) {
                reject(err);
            } else {
                resolve(stdout);
            }
        });
    });
};

const read = dir => {
    let allFiles = [];
    allFiles.push(
        fs
            .readdirSync(dir)
            .reduce(
                (files, file) =>
                    fs.statSync(path.join(dir, file)).isDirectory()
                        ? files.concat(read(path.join(dir, file)))
                        : files.concat(path.join(dir, file)),
                []
            )
    );
    return allFiles;
};

const getFiles = (dir, files_) => {
    files_ = files_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files) {
        let fileName = files[i];
        var name = dir + '/' + fileName;
        if (isCodeFile(fileName)) {
            if (fs.statSync(name).isDirectory()) {
                getFiles(name, files_);
            } else {
                files_.push(name);
            }
        } else {
            printDebugMessage(`File ${name} is not valid.`);
        }
    }
    return files_;
};

const getNodeModulesFiles = (dir, files_) => {
    files_ = files_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files) {
        let fileName = files[i];
        var name = dir + '/' + fileName;
        if (fileName !== 'node_modules') {
            if (fs.statSync(name).isDirectory()) {
                getNodeModulesFiles(name, files_);
            } else {
                files_.push(name);
            }
        }
    }
    return files_;
};

const getAlarmsCloudFormationFile = allFiles => {
    // let alarms = [];
    let alarmsMap = new Map();

    return new Promise((resolve, reject) => {
        printDebugMessage(allFiles);

        let filesToRead = allFiles;
        let promises = [];
        excludedFiles = getExcludedFilesFromEnvFile();

        filesToRead.forEach(file => {
            promises.push(
                new Promise((resolve, reject) => {
                    if (isCodeFile(file) && !isNonCodeFiles(file)) {
                        if (fs.existsSync(file)) {
                            printDebugMessage(`Reading data for ${file}`);
                            fs.readFile(
                                file, {
                                    encoding: 'utf-8'
                                },
                                (err, data) => {
                                    if (err) {
                                        reject(err);
                                    }

                                    if (data) {
                                        printDebugMessage(`trying to find errors on file: ${file}`);
                                        let errors = isError(data);
                                        if (!isExcludedFile(file) && errors !== null) {
                                            errors.forEach(e => {
                                                let alarmName = getErrorName(e);
                                                let serviceName = getServiceName(file);
                                                if (alarmName !== '' && serviceName !== '') {
                                                    // alarms.push({
                                                    //     alarmName,
                                                    //     serviceName
                                                    // });
                                                    if (alarmsMap.has(alarmName)) {
                                                        let serviceArray = alarmsMap.get(alarmName);
                                                        const found = serviceArray.find(name => name === serviceName);
                                                        if (!found) {
                                                            serviceArray.push(serviceName);
                                                            alarmsMap.set(alarmName,
                                                                serviceArray
                                                            );
                                                        }
                                                    } else {
                                                        alarmsMap.set(alarmName, [serviceName]);
                                                    }
                                                } else {
                                                    printDebugMessage(`Error getting alarm name or service name for file: ${file}, alarm: ${alarmName}, serviceName: ${serviceName}`);
                                                }
                                            });
                                        }
                                        resolve();
                                    } else {
                                        printDebugMessage(
                                            'Not a valid file: ' + file
                                        );
                                        reject(Error(`Can not read file ${file}`));
                                    }
                                }
                            );
                        } else {
                            printDebugMessage(`File is not valid ${file}`);
                            resolve();
                        }
                    } else {
                        printDebugMessage(
                            'Not a valid file. Skipping it: ' + file
                        );
                        resolve();
                    }
                })
            );
        });

        Promise.all(promises)
            .then(() => {
                // printDebugMessage(`There are ${alarms.length} CloudWatch Alarms`);
                // printDebugMessage('Alarms/Service Name Pairs: ' + JSON.stringify(alarms));
                printDebugMessage('Total Count for Alarms Map: ' + alarmsMap.size);
                printDebugMessage('Maps JSON: ' + JSON.stringify(alarmsMap.entries()));

                let i, j;
                let chunk = 200;
                let fileId = 0;
                let alarmsData = [];
                let alarmsArray = Array.from(alarmsMap);

                for (i = 0, j = alarmsArray.length; i < j; i += chunk) {
                    let tempArray = alarmsArray.slice(i, i + chunk);
                    alarmsData.push({
                        fileIndex: fileId,
                        alarms: alarmsTemplate.getAlarmFile(tempArray, args.projectName)
                    });
                    fileId++;
                }
                resolve(alarmsData);
            })
            .catch(error => {
                printDebugMessage('Failed to read a file: ' + error);
                reject(error);
            });
    });
};

const printDebugMessage = message => {
    if (args.debugFlag) {
        console.log(message);
    }
};

const isExcludedFile = (fileName) => {
    let found = excludedFiles.find(f => fileName.endsWith(f));
    if (found) {
        console.log('found a file that was excluded: ', fileName);
    }
    return found;
};

const isError = (data) => {
    let regexp = /.prototype.name.*'(.*)'.*|.*new\sError\(\s*['|`](.*)['|`]\s*\)| .*new\s([a-zA-Z]*Error).*|.*returnError\('(.*)',.*|.*log.error\('(.*)'.*\)/gmi;
    return data.match(regexp);
};

const isCodeFile = (name) => {
    let regexp = /.*\.js$/gm;
    let matchesArray = name.match(regexp);
    return matchesArray !== null;
};

const isNonCodeFiles = (name) => {
    let regexp = /.*\/test\/.*|.*Test.*.js|.*json|.*.eslintrc.js/gmi;
    let matchesArray = name.match(regexp);
    return matchesArray !== null;
};

const getServiceName = name => {
    let regexp = /\/.*\/Services\/([a-zA-Z-]*)/gmi;
    let groups = regexp.exec(name);
    return groups[1];
};

const getErrorName = name => {
    let prototypeError = getPrototypeError(name);
    if (prototypeError !== null) {
        return prototypeError;
    }

    let newErrors = getNewErrors(name);
    if (newErrors !== null) {
        return newErrors;
    }

    let modulesError = getErrorFromModules(name);
    if (modulesError !== null) {
        return modulesError;
    }

    let returnErrors = getReturnErrors(name);
    if (returnErrors !== null) {
        return returnErrors;
    }

    let logErrors = getLogErrors(name);
    if (logErrors !== null) {
        return logErrors;
    }

    throw new Error('ErrorNotMatched');
};

const getPrototypeError = name => {
    let regexp = /.prototype.name.*'(.*)'.*/gmi;
    let groups = regexp.exec(name);

    return groups !== null ? groups[1] : null;
};

const getErrorFromModules = name => {
    let regexp = /.*new\s([a-zA-Z]*Error).*/gmi;
    let groups = regexp.exec(name);

    return groups !== null ? groups[1] : null;
};

const getReturnErrors = name => {
    let regexp = /.*returnError\('(.*)',.*/gmi;
    let groups = regexp.exec(name);

    return groups !== null ? groups[1] : null;
};

const getNewErrors = name => {
    let regexp = /.*new\sError\(\s*['|`](.*)['|`]\s*\)/gmi;
    let groups = regexp.exec(name);

    return groups !== null ? groups[1] : null;
};

const getLogErrors = name => {
    let regexp = /.*log.error\('(.*)'.*\)/gmi;
    let groups = regexp.exec(name);

    return groups !== null ? groups[1] : null;
};

const writeFile = (fileName, cloudFormationScript) => {
    fs.writeFile(fileName, JSON.stringify(cloudFormationScript), function (err) {
        if (err) {
            printDebugMessage(`Error writing file (${fileName}): ${err}`);
        } else {
            printDebugMessage(`Success writing file: ${fileName}`);
        }
    });
};

const checkoutCode = async (branch) => {
    return new Promise((resolve, reject) => {
        runShellCommand(`git checkout ${branch}`)
            .then(() => {
                resolve();
            })
            .catch(error => {
                reject(error);
            });
    });
};

const npmInstallDependencies = (services) => {
    return new Promise((resolve, reject) => {
        let npmInstallPromises = [];
        services.forEach(service => {
            npmInstallPromises.push(
                new Promise((resolve, reject) => {
                    changeDirectory(service);
                    if (args.installDependencies) {
                        printDebugMessage(`running npm i for ${service}`);
                        runShellCommand(`npm i`)
                            .then(() => {
                                printDebugMessage(`finished installing dependencies for ${service}`);
                                resolve();
                            })
                            .catch(error => {
                                printDebugMessage(`SERVICE: ${service} - ERROR: ${error}`);
                                reject(error);
                            });
                    } else {
                        printDebugMessage(`skipping npm i for ${service}`);
                        resolve();
                    }
                })
            );
        });
        Promise.all(npmInstallPromises)
            .then(() => {
                resolve(services);
            })
            .catch(error => {
                printDebugMessage(`Error on NPM installing dependencies for at least one service ${error}`);
                reject(error);
            });
    });
};

const getExcludedFilesFromEnvFile = () => {
    let excludedFilesList = process.env.excluded;
    if (excludedFilesList !== undefined) {
        return excludedFilesList.split(',');
    } else {
        return [];
    }
};

const startProcessing = (params) => {
    args = params;
    changeDirectory();
    let filesToParse = [];
    checkoutCode(args.branch)
        .then(() => {
            let services = getDirectories(args.directory + '/Services');
            npmInstallDependencies(services)
                .then(services => {
                    services.forEach(service => {
                        printDebugMessage(`Getting files to fetch for: ${service}`);
                        filesToParse = filesToParse.concat(getFiles(service));
                        filesToParse = filesToParse.concat(getNodeModulesFiles(service + '/node_modules/@subwayapi'));
                    });
                    printDebugMessage(`Total number of files to read and parse looking for errors: ${filesToParse.length}`);
                    printDebugMessage(`List of all files to be read and parsed: ${JSON.stringify(filesToParse)}`);
                    getAlarmsCloudFormationFile(filesToParse)
                        .then(alarmDataArray => {
                            alarmDataArray.forEach(alarmFileObj => {
                                let { fileIndex, alarms } = alarmFileObj;
                                let obj = JSON.parse(alarms);
                                writeFile(`${args.directory}/Deployment/${args.projectName.replace(/ /g, '')}_Alarms_${fileIndex}.json`, obj);
                            });
                        })
                        .catch(getAlarmsFileError => {
                            printDebugMessage(
                                `Error getting all alarms file: ${getAlarmsFileError}`
                            );
                        });
                })
                .catch(error => {
                    printDebugMessage(`NPM install failed. Please try running it again. Error: ${error}`);
                });
        })
        .catch(error => {
            printDebugMessage(`Error checking out branch: ${error}`);
        });
};

module.exports = {
    startProcessing
};
