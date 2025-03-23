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
    
  }
}