# Temporary Files API Reference

The Temporary Files API allows you to upload source content files that will be used in podcast generation. Temporary files are automatically deleted after their expiration time.

**Base Path:** `/api/podcast/tempfiles`  
**API Version:** `2026-01-01-preview`

## Operations

| Operation | HTTP Method | Path | Description |
|-----------|-------------|------|-------------|
| [Upload Temporary File](#upload-temporary-file) | POST | `/tempfiles/{tempFileId}` | Upload a new temporary file |
| [List Temporary Files](#list-temporary-files) | GET | `/tempfiles` | Get a paginated list of temporary files |
| [Get Temporary File](#get-temporary-file) | GET | `/tempfiles/{tempFileId}` | Get details of a specific temporary file |
| [Delete Temporary File](#delete-temporary-file) | DELETE | `/tempfiles/{tempFileId}` | Delete a temporary file |

---

## Upload Temporary File

Upload a temporary file for use in podcast generation.

**Operation ID:** `TempFileOperations_UploadTempFile`

### Request

```http
POST /api/podcast/tempfiles/{tempFileId} HTTP/1.1
Host: {region}.api.cognitive.microsoft.com
Ocp-Apim-Subscription-Key: {subscription-key}
Operation-Id: {operation-id}
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="file"; filename="article.txt"
Content-Type: text/plain

[File content]
--boundary
Content-Disposition: form-data; name="ExpiresAfterInMins"

120
--boundary--
```

### Parameters

#### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tempFileId` | string | Yes | User-provided unique identifier for the temporary file. Must be a valid resource ID. |

#### Header Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `Ocp-Apim-Subscription-Key` | string | Yes | Azure Cognitive Services subscription key |
| `Operation-Id` | string | No | Optional operation ID for idempotent requests |

#### Form Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `file` | file | Yes | The file to upload (multipart form data) |
| `ExpiresAfterInMins` | long | No | Expiration time in minutes for this temp file (default: 120 minutes) |

### Response

#### 201 Created

The temporary file was successfully uploaded.

**Response Headers:**
- `Location` - URL to the created temporary file resource

**Response Body:**

```json
{
  "id": "my-temp-file-123",
  "status": "Succeeded",
  "createdDateTime": "2026-03-27T10:00:00Z",
  "lastActionDateTime": "2026-03-27T10:00:05Z",
  "expiresAt": "2026-03-27T12:00:00Z",
  "fileSize": 2048,
  "contentType": "text/plain",
  "fileName": "article.txt"
}
```

### Example

#### cURL

```bash
curl -X POST "https://westus.api.cognitive.microsoft.com/api/podcast/tempfiles/my-temp-file-123" \
  -H "Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY" \
  -H "Operation-Id: operation-uuid-789" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@article.txt" \
  -F "ExpiresAfterInMins=120"
```

#### PowerShell

```powershell
$uri = "https://westus.api.cognitive.microsoft.com/api/podcast/tempfiles/my-temp-file-123"
$headers = @{
    "Ocp-Apim-Subscription-Key" = "YOUR_SUBSCRIPTION_KEY"
    "Operation-Id" = "operation-uuid-789"
}

$form = @{
    file = Get-Item -Path "article.txt"
    ExpiresAfterInMins = 120
}

Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Form $form
```

---

## List Temporary Files

Get a paginated list of temporary files for the authenticated subscription.

**Operation ID:** `TempFileOperations_ListTempFile`

### Request

```http
GET /api/podcast/tempfiles?top=10&skip=0 HTTP/1.1
Host: {region}.api.cognitive.microsoft.com
Ocp-Apim-Subscription-Key: {subscription-key}
```

### Parameters

#### Query Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `top` | integer | No | 100 | Maximum number of items to return (pagination limit) |
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
      "id": "my-temp-file-123",
      "status": "Succeeded",
      "createdDateTime": "2026-03-27T10:00:00Z",
      "lastActionDateTime": "2026-03-27T10:00:05Z",
      "expiresAt": "2026-03-27T12:00:00Z",
      "fileSize": 2048,
      "contentType": "text/plain",
      "fileName": "article.txt"
    },
    {
      "id": "my-temp-file-456",
      "status": "Succeeded",
      "createdDateTime": "2026-03-27T09:00:00Z",
      "lastActionDateTime": "2026-03-27T09:00:03Z",
      "expiresAt": "2026-03-27T11:00:00Z",
      "fileSize": 4096,
      "contentType": "text/plain",
      "fileName": "content.txt"
    }
  ],
  "@nextLink": "https://westus.api.cognitive.microsoft.com/api/podcast/tempfiles?skip=10&maxPageSize=10"
}
```

### Example

```bash
curl -X GET "https://westus.api.cognitive.microsoft.com/api/podcast/tempfiles?top=10&skip=0" \
  -H "Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY"
```

---

## Get Temporary File

Get details of a specific temporary file.

**Operation ID:** `TempFileOperations_GetTempFile`

### Request

```http
GET /api/podcast/tempfiles/{tempFileId} HTTP/1.1
Host: {region}.api.cognitive.microsoft.com
Ocp-Apim-Subscription-Key: {subscription-key}
```

### Parameters

#### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tempFileId` | string | Yes | The unique identifier of the temporary file |

### Response

#### 200 OK

```json
{
  "id": "my-temp-file-123",
  "status": "Succeeded",
  "createdDateTime": "2026-03-27T10:00:00Z",
  "lastActionDateTime": "2026-03-27T10:00:05Z",
  "expiresAt": "2026-03-27T12:00:00Z",
  "fileSize": 2048,
  "contentType": "text/plain",
  "fileName": "article.txt",
  "downloadUrl": "https://storage.blob.core.windows.net/temp/my-temp-file-123?sv=2021-08-06&..."
}
```

#### 404 Not Found

The temporary file was not found.

### Example

```bash
curl -X GET "https://westus.api.cognitive.microsoft.com/api/podcast/tempfiles/my-temp-file-123" \
  -H "Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY"
```

---

## Delete Temporary File

Delete a temporary file. This operation is idempotent - deleting a non-existent file returns success.

**Operation ID:** `TempFileOperations_DeleteTempFile`

### Request

```http
DELETE /api/podcast/tempfiles/{tempFileId} HTTP/1.1
Host: {region}.api.cognitive.microsoft.com
Ocp-Apim-Subscription-Key: {subscription-key}
```

### Parameters

#### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tempFileId` | string | Yes | The unique identifier of the temporary file to delete |

### Response

#### 204 No Content

The temporary file was successfully deleted (or did not exist).

### Example

```bash
curl -X DELETE "https://westus.api.cognitive.microsoft.com/api/podcast/tempfiles/my-temp-file-123" \
  -H "Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY"
```

---

## Best Practices

1. **Set Appropriate Expiration Times**
   - Default expiration is 2 hours (120 minutes)
   - Set longer expiration if your generation workflow takes more time
   - Clean up temporary files after use to save storage

2. **Use Unique IDs**
   - Use UUIDs or other globally unique identifiers for `tempFileId`
   - Avoid reusing IDs across different files

3. **Check File Size Limits**
   - Maximum file size varies by subscription tier
   - Monitor the `fileSize` property in responses

4. **Handle Expiration**
   - Temporary files are automatically deleted after expiration
   - Download or reference files before `expiresAt` time
   - Implement retry logic if files expire during processing

## Error Codes

| Status Code | Error | Cause | Solution |
|-------------|-------|-------|----------|
| 400 | Bad Request | Invalid `tempFileId` or missing file | Check ID format and ensure file is included |
| 401 | Unauthorized | Missing or invalid subscription key | Verify `Ocp-Apim-Subscription-Key` header |
| 404 | Not Found | Temporary file doesn't exist or expired | Check ID and expiration time |
| 409 | Conflict | File already exists with different content | Use a different ID or delete existing file |
| 413 | Payload Too Large | File exceeds size limit | Reduce file size or upgrade subscription |
| 429 | Too Many Requests | Rate limit exceeded | Implement exponential backoff |

## See Also

- [Generations API](./generations.md) - Use temporary files in podcast generation
- [API Overview](./README.md) - Complete workflow and authentication
