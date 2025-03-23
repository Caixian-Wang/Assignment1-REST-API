import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class Assignment1Stack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

     // Create a DynamoDB table: using a composite primary key (pk, sk)
     this.table = new dynamodb.Table(this, 'ItemsTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
    });

        // Define the GET Lambda function
        const getFunction = new lambda.Function(this, 'GetFunction', {
          runtime: lambda.Runtime.NODEJS_18_X,
          handler: 'getItem.handler',
          code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
          environment: {
            TABLE_NAME: this.table.tableName,
          },
        });
        this.table.grantReadData(getFunction);

        // Define the POST Lambda function
    const postFunction = new lambda.Function(this, 'PostFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'postItem.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        TABLE_NAME: this.table.tableName,
      },
    });
    this.table.grantWriteData(postFunction);

        // Define the PUT Lambda function
    const putFunction = new lambda.Function(this, 'PutFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'putItem.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        TABLE_NAME: this.table.tableName,
      },
    });
    this.table.grantWriteData(putFunction);

    // Defining a Translation Lambda Function (Integrating Amazon Translate with Caching)
    const translateFunction = new lambda.Function(this, 'TranslateFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'translateItem.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        TABLE_NAME: this.table.tableName,
      },
    });
    this.table.grantReadWriteData(translateFunction);

    const api = new apigateway.RestApi(this, "Assignment1Api", {
      description: "Serverless REST API for Assignment1: supports CRUD operations and text translation caching",
      deployOptions: {
        stageName: "dev",
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date", "Authorization", "x-api-key"],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    const apiKey = api.addApiKey('ApiKey');
    const usagePlan = api.addUsagePlan('UsagePlan', {
      throttle: {
        rateLimit: 100,
        burstLimit: 200, 
      },
    });
    usagePlan.addApiKey(apiKey);
  

    const itemsResource = api.root.addResource('items');
    itemsResource.addMethod('GET', new apigateway.LambdaIntegration(getFunction));
    itemsResource.addMethod('POST', new apigateway.LambdaIntegration(postFunction), {
      apiKeyRequired: true,
    });
    itemsResource.addMethod('PUT', new apigateway.LambdaIntegration(putFunction), {
      apiKeyRequired: true,
    });

    const thingsResource = api.root.addResource('things');
    const pkResource = thingsResource.addResource('{pk}');
    const skResource = pkResource.addResource('{sk}');
    const translationResource = skResource.addResource('translation');
    translationResource.addMethod('GET', new apigateway.LambdaIntegration(translateFunction));
  }
}