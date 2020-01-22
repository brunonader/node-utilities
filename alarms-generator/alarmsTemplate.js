'use strict';

const getAlarmFile = (alarms, projectName) => {
    return `{
    "AWSTemplateFormatVersion": "2010-09-09",
    "Description": "SubwayAPI CloudWatch Metric Alarms Template For ${projectName} Apis",
        "Resources":{
            ${buildAllAlarmResources(alarms)}
        }
    }`;
};

const buildAllAlarmResources = (alarms) => {
    let allAlarmResources = [];

    alarms.forEach(alarm => {
        let errorName = alarm[0];
        let servicesArray = alarm[1];
        if (servicesArray.length() === 1) {
            getSingleResource(errorName, servicesArray[0]);
        } else {
            getMetricsResource(errorName, servicesArray[0]);
        }

        let singleAlarmResource = `
            "${getCapitalizedServiceName(alarm.serviceName)}${alarm.alarmName}": {
            "Type": "AWS::CloudWatch::Alarm",
            "Properties": {
                "AlarmName": "${alarm.serviceName}_${alarm.alarmName}_#{Subway_API_Env}_#{Subway_API_Version}",
                "AlarmDescription": "${alarm.serviceName} ${alarm.alarmName} #{Subway_API_Env} #{Subway_API_Version}",
                "AlarmActions": [
                    {
                        "Fn::Sub": "arn:aws:sns:\${AWS::Region}:\${AWS::AccountId}:OpsGenie"
                    }
                ],
                "OKActions": [
                    {
                        "Fn::Sub": "arn:aws:sns:\${AWS::Region}:\${AWS::AccountId}:OpsGenie"
                    }
                ],
                "InsufficientDataActions": [
                    {
                        "Fn::Sub": "arn:aws:sns:\${AWS::Region}:\${AWS::AccountId}:OpsGenie"
                    }
                ],
                "MetricName": "Error",
                "Namespace": "SubwayAPI/Lambda",
                "Statistic": "SampleCount",
                "Period": "3600",
                "EvaluationPeriods": "1",
                "Threshold": "#{CF_AlarmThreshold}",
                "ComparisonOperator": "GreaterThanThreshold",
                "TreatMissingData": "notBreaching",
                "Dimensions": [
                    {
                        "Name": "Function",
                        "Value": "${alarm.serviceName}"
                    },
                    {
                        "Name": "Type",
                        "Value": "${alarm.alarmName}"
                    },
                    {
                        "Name": "Environment",
                        "Value": "#{Subway_API_Env}#{Subway_API_Version}"
                    }
                ]
            }
        }`;

        allAlarmResources.push(singleAlarmResource);
    });

    return allAlarmResources.join(',');
};

const getCapitalizedServiceName = (serviceName) => {
    let serviceNamePhrase = serviceName.replace(/-/g, ' ');
    let capitalizedServiceName = serviceNamePhrase.replace(/(?:^|\s)\S/g, function (a) {
        return a.toUpperCase();
    });
    return capitalizedServiceName.replace(/ /g, '');
};

const getSingleResource = (errorName, serviceName) => {
    return `
            "${getCapitalizedServiceName(serviceName)}${errorName}": {
            "Type": "AWS::CloudWatch::Alarm",
            "Properties": {
                "AlarmName": "${serviceName}_${errorName}_#{Subway_API_Env}_#{Subway_API_Version}",
                "AlarmDescription": "${serviceName} ${errorName} #{Subway_API_Env} #{Subway_API_Version}",
                "AlarmActions": [
                    {
                        "Fn::Sub": "arn:aws:sns:\${AWS::Region}:\${AWS::AccountId}:OpsGenie"
                    }
                ],
                "OKActions": [
                    {
                        "Fn::Sub": "arn:aws:sns:\${AWS::Region}:\${AWS::AccountId}:OpsGenie"
                    }
                ],
                "InsufficientDataActions": [
                    {
                        "Fn::Sub": "arn:aws:sns:\${AWS::Region}:\${AWS::AccountId}:OpsGenie"
                    }
                ],
                "MetricName": "Error",
                "Namespace": "SubwayAPI/Lambda",
                "Statistic": "SampleCount",
                "Period": "3600",
                "EvaluationPeriods": "1",
                "Threshold": "#{CF_AlarmThreshold}",
                "ComparisonOperator": "GreaterThanThreshold",
                "TreatMissingData": "notBreaching",
                "Dimensions": [
                    {
                        "Name": "Function",
                        "Value": "${serviceName}"
                    },
                    {
                        "Name": "Type",
                        "Value": "${errorName}"
                    },
                    {
                        "Name": "Environment",
                        "Value": "#{Subway_API_Env}#{Subway_API_Version}"
                    }
                ]
            }
        }`;
};

module.exports = {
    getAlarmFile
};
