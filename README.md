## Serverless REST Assignment - Distributed Systems.

__Name:__ Caixian Wang

__Demo:__ https://youtu.be/5YGBk4-9ETY

### Context.

Context: Messages

Table item attributes:
+ pk - number  (Partition key)
+ sk - number  (Sort Key)
+ name - string
+ description - string

### App API endpoints.

+ POST /items - Add a new 'items'.
+ GET /items - Get all the 'items' .
+ PUT/items- Change 'items'.
+ TRANSLATE/things/pk/sk/translation?language={}

**GET API**

```nginx
https://6wxz9lohx5.execute-api.eu-west-1.amazonaws.com/dev/items
```

**POST API**

```nginx
https://6wxz9lohx5.execute-api.eu-west-1.amazonaws.com/dev/items
```

```json
{
  "pk": "123",
  "sk": "001",
  "name": "Testing Data",
  "description": "This is a testing record."
}
```

**PUT API**

```nginx
https://6wxz9lohx5.execute-api.eu-west-1.amazonaws.com/dev/items
```

```json
{
  "pk": "123",
  "sk": "001",
  "description": "Update Information"
}
```

**TRANSLATE API**

```nginx
https://6wxz9lohx5.execute-api.eu-west-1.amazonaws.com/dev/things/123/001/translation?language=fr
```



### Features.

#### Translation persistence 

+ pk - number  (Partition key)
+ sk - number  (Sort Key)
+ name - string
+ description - string
+ Translations - ?

#### API Keys.

~~~ts
const api = new apigateway.RestApi(this, "Assignment1Api", {
      description: "Serverless REST API for Assignment1: supports CRUD operations and text translation caching",
      deployOptions: {
        stageName: "dev",
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
~~~
