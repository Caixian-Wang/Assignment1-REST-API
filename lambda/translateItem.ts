import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const translateClient = new TranslateClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const { pk, sk } = event.pathParameters ?? {};
    const language = event.queryStringParameters?.language;
    if (!pk || !sk || !language) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Missing required parameters (pk, sk, language)" }),
      };
    }
    
    const getParams = {
      TableName: process.env.TABLE_NAME!,
      Key: { pk, sk },
    };
    const getResult = await ddbDocClient.send(new GetCommand(getParams));
    if (!getResult.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Item not found" }),
      };
    }
    
    const originalText = getResult.Item.description;
    if (getResult.Item.translations && getResult.Item.translations[language]) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ translatedText: getResult.Item.translations[language] }),
      };
    }
    
    const translateCommand = new TranslateTextCommand({
      Text: originalText,
      SourceLanguageCode: "auto",
      TargetLanguageCode: language,
    });
    const translateResult = await translateClient.send(translateCommand);
    const translatedText = translateResult.TranslatedText;
    
    const updateParams = {
      TableName: process.env.TABLE_NAME!,
      Key: { pk, sk },
      UpdateExpression: "SET translations = if_not_exists(translations, :emptyMap), translations.#lang = :translatedText",
      ExpressionAttributeNames: { "#lang": language },
      ExpressionAttributeValues: {
        ":translatedText": translatedText,
        ":emptyMap": {}
      },
      ReturnValues: "ALL_NEW" as const,
    };
    
    const updateResult = await ddbDocClient.send(new UpdateCommand(updateParams));
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Translation updated successfully",
        translatedText,
        updatedAttributes: updateResult.Attributes,
      }),
    };
  } catch (error: any) {
    console.error("Error in translateItem:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};