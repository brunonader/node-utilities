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
        let resource;
        if (servicesArray.length === 1) {
            resource = getSingleResource(errorName, servicesArray[0]);
        } else {
            resource = getMetricsResource(errorName, servicesArray);
        }

        allAlarmResources.push(resource);
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

const getMetricsResource = (errorName, servicesArray) => {
    let metricsString = getMetricStringForServices(errorName, servicesArray);
    let metricResource = `
        "${errorName}": {
                "Type": "AWS::CloudWatch::Alarm",
                "Properties": {
                    "AlarmName": "${errorName}_#{Subway_API_Env}_#{Subway_API_Version}",
                    "AlarmDescription": "${errorName} #{Subway_API_Env} #{Subway_API_Version}",
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
                    "Metrics": [
                        {
                            "Expression": "SUM([${servicesArray.join(',')}])",
                            "Id": "${errorName} SUM Expression",
                            "Label": "Total${errorName}s"
                        },
                        ${metricsString}
                    ]
                }
            }`;
    return metricResource;
};

const getMetricStringForServices = (errorName, servicesArray) => {
    let metricsStrings = [];
    servicesArray.forEach(service => {
        let metric = `{
                        "Id": "${service}",
                        "MetricStat": {
                            "Metric": {
                                "Dimensions": [
                                    {
                                        "Name": "Function",
                                        "Value": "${service}"
                                    },
                                    {
                                        "Name": "Type",
                                        "Value": "${errorName}"
                                    },
                                    {
                                        "Name": "Environment",
                                        "Value": "#{Subway_API_Env}#{Subway_API_Version}"
                                    }
                                ],
                                "MetricName": "Error",
                                "Namespace": "SubwayAPI/Lambda"
                            },
                            "Period": 3600,
                            "Stat": "SampleCount"
                        },
                        "ReturnData": false
                    }`;
        metricsStrings.push(metric);
    });

    return metricsStrings.toString();
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
