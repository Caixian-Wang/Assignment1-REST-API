import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

// Create a DynamoDBClient and build a DocumentClient on top of it
const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[GET EVENT]", JSON.stringify(event));

    //Optional:Get the query string parameter to filter the data
    const filter = event.queryStringParameters?.filter;

    // Construct the ScanCommand parameter
    let params: any = {
      TableName: process.env.TABLE_NAME,
    };

    // If a filter is passed, add a FilterExpression (e.g. filter the name field with a filter value)
    if (filter) {
      params.FilterExpression = "contains(#name, :filterVal)";
      params.ExpressionAttributeNames = { "#name": "name" };
      params.ExpressionAttributeValues = { ":filterVal": filter };
    }

    // Perform a scan operation
    const commandOutput = await ddbDocClient.send(new ScanCommand(params));

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: commandOutput.Items }),
    };
  } catch (error: any) {
    console.error("Error in GET:", error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};