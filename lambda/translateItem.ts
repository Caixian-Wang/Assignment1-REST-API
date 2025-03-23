import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const translateClient = new TranslateClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // 1. 参数验证：确保路径参数和查询参数存在
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
    if (typeof getResult.Item.description !== "string") {
      return respond(400, "Item description is not a valid string");
    }

    // 3. 检查记录中是否已有该语言的翻译
    if (getResult.Item.translations && typeof getResult.Item.translations === "object" && getResult.Item.translations[language]) {
      return respond(200, { translatedText: getResult.Item.translations[language] });
    }

    // 4. 调用 Amazon Translate 进行翻译
    const translateCommand = new TranslateTextCommand({
      Text: getResult.Item.description,
      SourceLanguageCode: "auto",
      TargetLanguageCode: language,
    });
    const translateResult = await translateClient.send(translateCommand);
    const translatedText = translateResult.TranslatedText;

    // 5. 构造新的 translations 对象：如果已有则合并，否则创建新的对象
    let newTranslations: any = {};
    if (getResult.Item.translations && typeof getResult.Item.translations === "object") {
      newTranslations = { ...getResult.Item.translations };
    }
    newTranslations[language] = translatedText;

    // 6. 更新 DynamoDB，直接更新整个 translations 属性
    const updateResult = await ddbDocClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME!,
      Key: { pk, sk },
      UpdateExpression: "SET translations = :emptyMap",
      ExpressionAttributeValues: {
       ":emptyMap": {} 
      },
      ReturnValues: "ALL_NEW" as const,
    }));

    return respond(200, {
      message: "Translation cached successfully",
      translatedText,
      updatedAttributes: updateResult.Attributes,
    });
  } catch (error: any) {
    console.error("Error in translateItem:", error);
    return respond(500, {
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
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