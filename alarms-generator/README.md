# Description

A utility (cli) program written in node.js to generate a CF CloudWatch Alarms file a given subway project

## Usage example

```javascript
node alarmsGenerator.js run -p /Users/nader_b/Development/Menu/ -n Menu -d true -b 'developing/1.2.0' -i true
```

## For help, enter

```javascript
node alarmsGenerator.js run -h
```

## Flags

* -p = Full Path for project repository
* -n = Project Name
* -d = Flag to debug application and generate more logs
* -b = Branch to where the program should use to generate the CloudWatch Alarms
* -i = Flag to determine if NPM dependencies are to be installed for each Service within the project
