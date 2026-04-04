# Generations API Reference

The Generations API is the core interface for creating, managing, and monitoring podcast generation tasks. Use this API to submit content, configure voice and script parameters, and retrieve generated podcast audio.

**Base Path:** `/api/podcast/generations`  
**API Version:** `2026-01-01-preview`

## Operations

| Operation | HTTP Method | Path | Description |
|-----------|-------------|------|-------------|
| [Create Generation](#create-podcast-generation) | PUT | `/generations/{generationId}` | Create a new podcast generation |
| [List Generations](#list-generations) | GET | `/generations` | Get a paginated list of generations |
| [Get Generation](#get-generation) | GET | `/generations/{generationId}` | Get details of a specific generation |
| [Delete Generation](#delete-generation) | DELETE | `/generations/{generationId}` | Delete a generation |

---

## Create Podcast Generation

Create a new podcast generation task. This operation is asynchronous - use the returned `Operation-Location` header to poll for completion status.

**Operation ID:** `PodcastOperations_CreateGeneration`

### Request

```http
PUT /api/podcast/generations/{generationId} HTTP/1.1
Host: {region}.api.cognitive.microsoft.com
Ocp-Apim-Subscription-Key: {subscription-key}
Operation-Id: {operation-id}
Content-Type: application/json

{
  "locale": "en-US",
  "host": "OneHost",
  "content": {
    "tempFileId": "my-temp-file-123",
    "fileFormat": "PlainText"
  },
  "tts": {
    "voiceName": "en-US-JennyNeural"
  },
  "scriptGeneration": {
    "length": "Medium",
    "style": "Default"
  }
}
```

### Parameters

#### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `generationId` | string | Yes | User-provided unique identifier for the generation. Must be a valid resource ID. |

#### Header Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `Ocp-Apim-Subscription-Key` | string | Yes | Azure Cognitive Services subscription key |
| `Operation-Id` | string | No | Optional operation ID for idempotent requests. Recommended for preventing duplicate creations. |

#### Request Body

**Content-Type:** `application/json`

```json
{
  "locale": "string",
  "host": "OneHost | TwoHosts",
  "content": {
    "tempFileId": "string",
    "fileFormat": "PlainText | Markdown | HTML",
    "text": "string",
    "base64Text": "string",
    "url": "string"
  },
  "tts": {
    "voiceName": "string",
    "genderPreference": "Male | Female",
    "multiTalkerVoiceSpeakerNames": "string"
  },
  "scriptGeneration": {
    "additionalInstructions": "string",
    "template": "string",
    "length": "VeryShort | Short | Medium | Long | VeryLong",
    "style": "Default | Professional | Casual"
  },
  "advancedConfig": {
    "keepIntermediateZipFile": true
  }
}
```

##### Request Body Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `locale` | string | Yes | Language locale (e.g., `en-US`, `zh-CN`) |
| `host` | enum | Yes | Podcast host format: `OneHost` (single narrator) or `TwoHosts` (conversational dialog) |
| **Content** | | | |
| `content.tempFileId` | string | * | Temporary file ID from TempFiles API |
| `content.fileFormat` | enum | * | File format: `PlainText`, `Markdown`, `HTML` |
| `content.text` | string | * | Inline text content |
| `content.base64Text` | string | * | Base64-encoded text content | 
| `content.url` | string | * | URL to content file |
| **TTS Configuration** | | | |
| `tts.voiceName` | string | ** | Specific voice name (e.g., `en-US-JennyNeural`) |
| `tts.genderPreference` | enum | ** | Gender preference for voice selection: `Male`, `Female` |
| `tts.multiTalkerVoiceSpeakerNames` | string | *** | For TwoHosts: comma-separated speaker names |
| **Script Generation** | | | |
| `scriptGeneration.additionalInstructions` | string | No | Custom instructions for script generation |
| `scriptGeneration.template` | string | No | Script template |
| `scriptGeneration.length` | enum | No | Podcast length: `VeryShort`, `Short`, `Medium`, `Long`, `VeryLong` |
| `scriptGeneration.style` | enum | No | Podcast style: `Default`, `Professional`, `Casual` |
| **Advanced** | | | |
| `advancedConfig.keepIntermediateZipFile` | boolean | No | Keep intermediate processing files (default: false) |

\* One content source is required: `tempFileId`, `text`, `base64Text`, or `url`  
\** Either `voiceName` or `genderPreference` can be specified  
\*** Required when `host` is `TwoHosts`

### Response

#### 201 Created

The generation was successfully created and processing has started.

**Response Headers:**
- `Location` - URL to the created generation resource
- `Operation-Location` - URL to query the operation status (use this for polling)

**Response Body:**

```json
{
  "id": "my-generation-456",
  "status": "NotStarted",
  "locale": "en-US",
  "host": "OneHost",
  "createdDateTime": "2026-03-27T10:00:00Z",
  "lastActionDateTime": "2026-03-27T10:00:00Z",
  "content": {
    "tempFileId": "my-temp-file-123",
    "fileFormat": "PlainText"
  },
  "tts": {
    "voiceName": "en-US-JennyNeural"
  },
  "scriptGeneration": {
    "length": "Medium",
    "style": "Default"
  }
}
```

#### 200 OK (Idempotent Request)

If the same request is repeated with the same `Operation-Id`, returns the existing generation.

#### 409 Conflict

A generation with the same ID already exists but with different properties.

### Example

#### cURL

```bash
curl -X PUT "https://westus.api.cognitive.microsoft.com/api/podcast/generations/my-generation-456" \
  -H "Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY" \
  -H "Operation-Id: operation-uuid-789" \
  -H "Content-Type: application/json" \
  -d '{
    "locale": "en-US",
    "host": "OneHost",
    "content": {
      "tempFileId": "my-temp-file-123",
      "fileFormat": "PlainText"
    },
    "tts": {
      "voiceName": "en-US-JennyNeural"
    },
    "scriptGeneration": {
      "length": "Medium",
      "style": "Professional",
      "additionalInstructions": "Make it engaging and informative"
    }
  }'
```

#### PowerShell

```powershell
$uri = "https://westus.api.cognitive.microsoft.com/api/podcast/generations/my-generation-456"
$headers = @{
    "Ocp-Apim-Subscription-Key" = "YOUR_SUBSCRIPTION_KEY"
    "Operation-Id" = "operation-uuid-789"
}

$body = @{
    locale = "en-US"
    host = "OneHost"
    content = @{
        tempFileId = "my-temp-file-123"
        fileFormat = "PlainText"
    }
    tts = @{
        voiceName = "en-US-JennyNeural"
    }
    scriptGeneration = @{
        length = "Medium"
        style = "Default"
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body $body -ContentType "application/json"
```

#### Two-Host Example

```json
{
  "locale": "en-US",
  "host": "TwoHosts",
  "content": {
    "text": "Article content about AI technology..."
  },
  "tts": {
    "voiceName": "en-US-AvaMultilingualNeural",
    "multiTalkerVoiceSpeakerNames": "TechHost,AIExpert"
  },
  "scriptGeneration": {
    "length": "Medium",
    "style": "Casual",
    "additionalInstructions": "Make it a debate between two experts with different viewpoints"
  }
}
```

---

## List Generations

Get a paginated list of podcast generations for the authenticated subscription.

**Operation ID:** `PodcastOperations_ListGeneration`

### Request

```http
GET /api/podcast/generations?top=10&skip=0 HTTP/1.1
Host: {region}.api.cognitive.microsoft.com
Ocp-Apim-Subscription-Key: {subscription-key}
```

### Parameters

#### Query Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `top` | integer | No | 100 | Maximum number of items to return |
| `skip` | integer | No | 0 | Number of items to skip (pagination offset) |
| `maxPageSize` | integer | No | 100 | Maximum page size for results |
| `orderby` | string | No | - | Sort order (e.g., `createdDateTime desc`) |
| `filter` | string | No | - | OData-style filter expression |

### Response

#### 200 OK

```json
{
  "value": [
    {
      "id": "my-generation-456",
      "status": "Succeeded",
      "locale": "en-US",
      "host": "OneHost",
      "createdDateTime": "2026-03-27T10:00:00Z",
      "lastActionDateTime": "2026-03-27T10:05:30Z",
      "content": {
        "tempFileId": "my-temp-file-123"
      },
      "tts": {
        "voiceName": "en-US-JennyNeural"
      }
    },
    {
      "id": "my-generation-789",
      "status": "Running",
      "locale": "en-US",
      "host": "TwoHosts",
      "createdDateTime": "2026-03-27T09:30:00Z",
      "lastActionDateTime": "2026-03-27T09:35:15Z",
      "content": {
        "text": "..."
      },
      "tts": {
        "voiceName": "en-US-AvaMultilingualNeural",
        "multiTalkerVoiceSpeakerNames": "Host1,Host2"
      }
    }
  ],
  "@nextLink": "https://westus.api.cognitive.microsoft.com/api/podcast/generations?skip=10&maxPageSize=10"
}
```

### Example

```bash
# List all generations
curl -X GET "https://westus.api.cognitive.microsoft.com/api/podcast/generations" \
  -H "Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY"

# List with pagination and sorting
curl -X GET "https://westus.api.cognitive.microsoft.com/api/podcast/generations?top=10&skip=0&orderby=createdDateTime desc" \
  -H "Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY"

# Filter by status
curl -X GET "https://westus.api.cognitive.microsoft.com/api/podcast/generations?filter=status eq 'Succeeded'" \
  -H "Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY"
```

---

## Get Generation

Get detailed information about a specific podcast generation, including download URLs for output files.

**Operation ID:** `PodcastOperations_GetGeneration`

### Request

```http
GET /api/podcast/generations/{generationId} HTTP/1.1
Host: {region}.api.cognitive.microsoft.com
Ocp-Apim-Subscription-Key: {subscription-key}
```

### Parameters

#### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `generationId` | string | Yes | The unique identifier of the generation |

### Response

#### 200 OK

```json
{
  "id": "my-generation-456",
  "status": "Succeeded",
  "locale": "en-US",
  "host": "OneHost",
  "createdDateTime": "2026-03-27T10:00:00Z",
  "lastActionDateTime": "2026-03-27T10:05:30Z",
  "content": {
    "tempFileId": "my-temp-file-123",
    "fileFormat": "PlainText"
  },
  "tts": {
    "voiceName": "en-US-JennyNeural"
  },
  "scriptGeneration": {
    "length": "Medium",
    "style": "Default"
  },
  "outputs": {
    "podcastAudio": {
      "url": "https://storage.blob.core.windows.net/artifacts/podcast-audio.mp3?sv=...",
      "duration": 180.5,
      "format": "audio/mpeg"
    },
    "script": {
      "url": "https://storage.blob.core.windows.net/artifacts/script.txt?sv=...",
      "format": "text/plain"
    },
    "ssml": {
      "url": "https://storage.blob.core.windows.net/artifacts/ssml.xml?sv=...",
      "format": "application/ssml+xml"
    },
    "intermediateFiles": {
      "url": "https://storage.blob.core.windows.net/artifacts/intermediate.zip?sv=...",
      "format": "application/zip"
    }
  }
}
```

#### 404 Not Found

The generation was not found.

### Output Files

When status is `Succeeded`, the response includes URLs for:

- **podcastAudio** - Final generated podcast audio file (MP3)
- **script** - Generated script text
- **ssml** - SSML markup used for speech synthesis
- **intermediateFiles** - Intermediate processing files (if `keepIntermediateZipFile` was enabled)

### Example

```bash
curl -X GET "https://westus.api.cognitive.microsoft.com/api/podcast/generations/my-generation-456" \
  -H "Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY"
```

---

## Delete Generation

Delete a podcast generation and its associated resources.

**Operation ID:** `PodcastOperations_DeleteGeneration`

### Request

```http
DELETE /api/podcast/generations/{generationId} HTTP/1.1
Host: {region}.api.cognitive.microsoft.com
Ocp-Apim-Subscription-Key: {subscription-key}
```

### Parameters

#### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `generationId` | string | Yes | The unique identifier of the generation to delete |

### Response

#### 204 No Content

The generation was successfully deleted (or did not exist). This operation is idempotent.

### Example

```bash
curl -X DELETE "https://westus.api.cognitive.microsoft.com/api/podcast/generations/my-generation-456" \
  -H "Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY"
```

---

## Status Values

| Status | Description |
|--------|-------------|
| `NotStarted` | Generation has been created but processing has not started |
| `Running` | Generation is currently being processed |
| `Succeeded` | Generation completed successfully; output files are available |
| `Failed` | Generation failed; check error details |

---

## Best Practices

1. **Always Use Operation-Based Polling**
   - Use the `Operation-Location` header from the creation response
   - Poll the Operations API instead of repeatedly calling Get Generation
   - Reduces API load and provides real-time status updates

2. **Provide Operation-Id for Idempotency**
   - Include `Operation-Id` header when creating generations
   - Prevents duplicate generation creation if network errors cause retries
   - Use UUIDs or other globally unique identifiers

3. **Choose Appropriate Host Mode**
   - **OneHost**: Single narrator, faster generation, simpler configuration
   - **TwoHosts**: Conversational dialog, more engaging, requires speaker names

4. **Optimize Content Input**
   - For files > 10KB, use TempFiles API instead of inline text
   - Use `tempFileId` for reusable content
   - Use `url` for publicly accessible content (no upload needed)

5. **Set Script Generation Parameters**
   - Specify `length` to control podcast duration
   - Choose `style` based on your audience and content type
   - Use `additionalInstructions` for custom requirements

6. **Monitor Quota**
   - Check subscription limits for concurrent generations
   - Implement queueing for high-volume scenarios
   - Clean up old generations to free quota

## Error Codes

| Status Code | Error | Cause | Solution |
|-------------|-------|-------|----------|
| 400 | Bad Request | Invalid request body or parameters | Validate JSON schema and required fields |
| 401 | Unauthorized | Missing or invalid subscription key | Check `Ocp-Apim-Subscription-Key` header |
| 404 | Not Found | Generation doesn't exist | Verify generationId |
| 409 | Conflict | Generation exists with different properties | Use different ID or match existing properties |
| 429 | Too Many Requests | Rate limit or quota exceeded | Implement exponential backoff |
| 500 | Internal Server Error | Processing error | Check operation status for details; retry if transient |

## See Also

- [Operations API](./operations.md) - Poll generation status
- [Temporary Files API](./temp-files.md) - Upload source content
- [API Overview](./README.md) - Complete workflow
