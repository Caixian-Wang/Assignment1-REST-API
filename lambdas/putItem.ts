import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[PUT EVENT]", JSON.stringify(event));
    const body = event.body ? JSON.parse(event.body) : undefined;
    if (!body) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing request body" }),
      };
    }

    // 从请求体中解析出主键 (pk, sk) 及需要更新的字段
    const { pk, sk, ...updateFields } = body;
    if (!pk || !sk) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing primary key attributes (pk or sk)" }),
      };
    }

    // 构造 UpdateExpression 动态生成更新表达式
    let updateExpression = "set";
    const ExpressionAttributeNames: { [key: string]: string } = {};
    const ExpressionAttributeValues: { [key: string]: any } = {};
    let prefix = " ";

    for (const key in updateFields) {
      updateExpression += `${prefix}#${key} = :${key}`;
      ExpressionAttributeNames[`#${key}`] = key;
      ExpressionAttributeValues[`:${key}`] = updateFields[key];
      prefix = ", ";
    }

    const params = {
      TableName: process.env.TABLE_NAME!,
      Key: { pk, sk },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: "ALL_NEW" as const,
    };

    const commandOutput = await ddbDocClient.send(new UpdateCommand(params));

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "Item updated successfully",
        attributes: commandOutput.Attributes,
      }),
    };
  } catch (error: any) {
    console.error("Error in PUT:", error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        error: error.message || "Internal Server Error",
      }),
    };
  }
};