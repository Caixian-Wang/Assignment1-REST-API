import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const translateClient = new TranslateClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // 1. 输入验证
    const { pk, sk } = event.pathParameters ?? {};
    const language = event.queryStringParameters?.language?.toLowerCase();

    if (!pk || !sk || !language) {
      return respond(400, "Missing pk, sk or language parameter");
    }
    if (!/^[a-z]{2}(-[a-z]{2})?$/.test(language)) {
      return respond(400, "Invalid language code format. Use ISO 639-1 (e.g. 'es', 'zh-CN')");
    }

    // 2. 从 DynamoDB 获取记录
    const getResult = await ddbDocClient.send(new GetCommand({
      TableName: process.env.TABLE_NAME!,
      Key: { pk, sk },
    }));

    if (!getResult.Item) return respond(404, "Item not found");
    if (typeof getResult.Item.description !== 'string') {
      return respond(400, "Item description is not a valid string");
    }

    // 3. 检查是否已有翻译
    const existingTranslation = getResult.Item.translations?.[language];
    if (existingTranslation) {
      return respond(200, { translatedText: existingTranslation });
    }

    // 4. 调用 Amazon Translate 进行翻译
    const translateResult = await translateClient.send(new TranslateTextCommand({
      Text: getResult.Item.description,
      SourceLanguageCode: "auto",
      TargetLanguageCode: language,
    }));

    // 5. 更新 DynamoDB：先初始化 translations 属性再更新目标语言
    // UPDATED: 修改 UpdateExpression，先用 if_not_exists 初始化 translations 属性
    await ddbDocClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME!,
      Key: { pk, sk },
      UpdateExpression: "SET #translations = if_not_exists(#translations, :emptyMap), #translations.#lang = :text",
      ExpressionAttributeNames: {
        "#translations": "translations",
        "#lang": language
      },
      ExpressionAttributeValues: {
        ":emptyMap": {},
        ":text": translateResult.TranslatedText
      },
      ReturnValues: "ALL_NEW" as const,
    }));

    return respond(200, {
      message: "Translation cached successfully",
      translatedText: translateResult.TranslatedText
    });

  } catch (error) {
    console.error("Translation Error:", error);
    return respond(500, {
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

// Helper function for responses
const respond = (status: number, body: any) => ({
  statusCode: status,
  headers: { 
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});