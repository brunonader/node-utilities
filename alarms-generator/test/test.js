'use strict';

const { startProcessing } = require('../serviceAlarmsGenerator');

startProcessing({
    directory: '/Users/nader_b/Development/Subway/Menu',
    projectName: 'Menu',
    branch: 'developing/1.2.1',
    installDependencies: false,
    debugFlag: true
});
