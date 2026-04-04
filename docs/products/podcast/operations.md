# Operations API Reference

The Operations API provides status information for long-running asynchronous operations like podcast generation. Use this API to monitor processing progress and determine when results are ready.

**Base Path:** `/api/podcast/operations`  
**API Version:** `2026-01-01-preview`

## Operations

| Operation | HTTP Method | Path | Description |
|-----------|-------------|------|-------------|
| [Get Operation](#get-operation) | GET | `/operations/{id}` | Get the status of a long-running operation |

---

## Get Operation

Get the current status and details of a long-running operation.

**Operation ID:** `OperationOperations_GetOperation`

### Request

```http
GET /api/podcast/operations/{id} HTTP/1.1
Host: {region}.api.cognitive.microsoft.com
Ocp-Apim-Subscription-Key: {subscription-key}
```

### Parameters

#### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | The unique identifier of the operation (from `Operation-Location` header or `Operation-Id` header used during creation) |

#### Header Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `Ocp-Apim-Subscription-Key` | string | Yes | Azure Cognitive Services subscription key |

### Response

#### 200 OK

```json
{
  "id": "operation-uuid-789",
  "status": "Running",
  "createdDateTime": "2026-03-27T10:00:00Z",
  "lastActionDateTime": "2026-03-27T10:02:15Z",
  "resourceType": "PodcastGeneration",
  "operationType": "CreatePodcastGeneration",
  "resourceId": "my-generation-456",
  "resourceLocation": "https://westus.api.cognitive.microsoft.com/api/podcast/generations/my-generation-456",
  "percentComplete": 45,
  "message": "Generating podcast script..."
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique operation identifier |
| `status` | enum | Current status: `NotStarted`, `Running`, `Succeeded`, `Failed` |
| `createdDateTime` | datetime | When the operation was created |
| `lastActionDateTime` | datetime | Last status update time |
| `resourceType` | string | Type of resource (e.g., `PodcastGeneration`) |
| `operationType` | string | Type of operation (e.g., `CreatePodcastGeneration`) |
| `resourceId` | string | ID of the resource being created/modified |
| `resourceLocation` | string | URL to the resource |
| `percentComplete` | integer | Estimated completion percentage (0-100) |
| `message` | string | Current processing message or error details |
| `error` | object | Error details if status is `Failed` |

#### 404 Not Found

The operation was not found or has expired.

### Status Values

| Status | Description | Action |
|--------|-------------|--------|
| `NotStarted` | Operation queued but not yet started | Continue polling |
| `Running` | Operation in progress | Continue polling; check `percentComplete` for progress |
| `Succeeded` | Operation completed successfully | Query resource endpoint for results |
| `Failed` | Operation failed | Check `error` object for details |

### Error Response (Failed Status)

When `status` is `Failed`, the response includes error details:

```json
{
  "id": "operation-uuid-789",
  "status": "Failed",
  "createdDateTime": "2026-03-27T10:00:00Z",
  "lastActionDateTime": "2026-03-27T10:03:45Z",
  "resourceType": "PodcastGeneration",
  "operationType": "CreatePodcastGeneration",
  "resourceId": "my-generation-456",
  "resourceLocation": "https://westus.api.cognitive.microsoft.com/api/podcast/generations/my-generation-456",
  "percentComplete": 0,
  "error": {
    "code": "InvalidContent",
    "message": "The provided content is too short for podcast generation. Minimum length is 100 words.",
    "target": "content.text",
    "details": []
  }
}
```

### Example

#### cURL

```bash
# Poll operation status
curl -X GET "https://westus.api.cognitive.microsoft.com/api/podcast/operations/operation-uuid-789" \
  -H "Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY"
```

#### PowerShell - Simple Poll

```powershell
$operationId = "operation-uuid-789"
$uri = "https://westus.api.cognitive.microsoft.com/api/podcast/operations/$operationId"
$headers = @{
    "Ocp-Apim-Subscription-Key" = "YOUR_SUBSCRIPTION_KEY"
}

$operation = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
Write-Host "Status: $($operation.status) - $($operation.message)"
```

#### PowerShell - Poll Until Complete

```powershell
function Wait-PodcastOperation {
    param(
        [string]$OperationId,
        [string]$SubscriptionKey,
        [string]$Region = "westus",
        [int]$PollIntervalSeconds = 10,
        [int]$MaxWaitSeconds = 1800  # 30 minutes
    )
    
    $uri = "https://$Region.api.cognitive.microsoft.com/api/podcast/operations/$OperationId"
    $headers = @{
        "Ocp-Apim-Subscription-Key" = $SubscriptionKey
    }
    
    $startTime = Get-Date
    $terminalStatuses = @("Succeeded", "Failed")
    
    do {
        $operation = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
        $elapsed = ((Get-Date) - $startTime).TotalSeconds
        
        Write-Host "[$elapsed s] Status: $($operation.status) ($($operation.percentComplete)%) - $($operation.message)"
        
        if ($terminalStatuses -contains $operation.status) {
            return $operation
        }
        
        if ($elapsed -ge $MaxWaitSeconds) {
            Write-Warning "Operation timeout after $MaxWaitSeconds seconds"
            return $operation
        }
        
        Start-Sleep -Seconds $PollIntervalSeconds
    } while ($true)
}

# Usage
$result = Wait-PodcastOperation -OperationId "operation-uuid-789" -SubscriptionKey "YOUR_KEY"

if ($result.status -eq "Succeeded") {
    Write-Host "✓ Operation completed successfully" -ForegroundColor Green
    Write-Host "Resource: $($result.resourceLocation)"
} else {
    Write-Host "✗ Operation failed: $($result.error.message)" -ForegroundColor Red
}
```

#### JavaScript/TypeScript

```typescript
async function pollOperationStatus(
    operationId: string,
    subscriptionKey: string,
    region: string = 'westus',
    pollIntervalMs: number = 10000,
    maxWaitMs: number = 1800000  // 30 minutes
): Promise<Operation> {
    const url = `https://${region}.api.cognitive.microsoft.com/api/podcast/operations/${operationId}`;
    const headers = {
        'Ocp-Apim-Subscription-Key': subscriptionKey
    };
    
    const startTime = Date.now();
    const terminalStatuses = ['Succeeded', 'Failed'];
    
    while (true) {
        const response = await fetch(url, { headers });
        const operation = await response.json();
        
        const elapsed = (Date.now() - startTime) / 1000;
        console.log(`[${elapsed.toFixed(1)}s] Status: ${operation.status} (${operation.percentComplete}%) - ${operation.message}`);
        
        if (terminalStatuses.includes(operation.status)) {
            return operation;
        }
        
        if (Date.now() - startTime >= maxWaitMs) {
            throw new Error(`Operation timeout after ${maxWaitMs / 1000} seconds`);
        }
        
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
}

// Usage
try {
    const operation = await pollOperationStatus('operation-uuid-789', 'YOUR_KEY');
    
    if (operation.status === 'Succeeded') {
        console.log('✓ Operation completed successfully');
        console.log(`Resource: ${operation.resourceLocation}`);
    } else {
        console.error('✗ Operation failed:', operation.error.message);
    }
} catch (error) {
    console.error('Error polling operation:', error);
}
```

---

## Polling Best Practices

1. **Use Appropriate Polling Intervals**
   - **Recommended**: 10 seconds
   - **Minimum**: 5 seconds (avoid more frequent polling)
   - **Initial delay**: Wait 5-10 seconds before first poll
   - **Exponential backoff**: Increase interval for long-running operations

2. **Implement Timeout**
   - Set maximum wait time (e.g., 30 minutes)
   - Stop polling after timeout and notify user
   - Allow manual status check or retry

3. **Handle All Status Values**
   - `NotStarted` / `Running` → Continue polling
   - `Succeeded` → Query resource endpoint for results
   - `Failed` → Parse error details and notify user

4. **Use Operation-Location Header**
   - The `Operation-Location` header from generation creation contains the full operation URL
   - Extract operation ID from the URL if needed
   - Store operation ID for resuming polling after interruptions

5. **Monitor Progress**
   - Display `percentComplete` and `message` to users
   - Provide feedback about current processing stage
   - Handle cases where `percentComplete` may not be available

6. **Error Handling**
   - Retry on transient network errors (exponential backoff)
   - Don't retry on 404 (operation not found or expired)
   - Parse `error.code` and `error.message` for user-friendly messages

## Workflow Integration

### Complete Workflow Example

```typescript
// 1. Create generation
const createResponse = await fetch(
    `https://${region}.api.cognitive.microsoft.com/api/podcast/generations/${generationId}`,
    {
        method: 'PUT',
        headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Operation-Id': operationId,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(generationRequest)
    }
);

// 2. Extract Operation-Location
const operationLocation = createResponse.headers.get('Operation-Location');
const operationId = extractOperationId(operationLocation);  // Parse URL

// 3. Poll operation status
const operation = await pollOperationStatus(operationId, subscriptionKey);

// 4. On success, get generation details
if (operation.status === 'Succeeded') {
    const generationResponse = await fetch(operation.resourceLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': subscriptionKey }
    });
    const generation = await generationResponse.json();
    
    // 5. Download results
    console.log('Podcast audio:', generation.outputs.podcastAudio.url);
}
```

## Common Scenarios

### Scenario 1: Basic Polling Loop

Poll every 10 seconds until operation completes.

### Scenario 2: UI Progress Display

Update UI with `percentComplete` and `message` during polling.

### Scenario 3: Background Processing

Store operation ID, allow user to continue, poll in background or resume later.

### Scenario 4: Batch Processing

Create multiple generations, poll all operations concurrently, aggregate results.

## Error Codes

| Status Code | Error | Cause | Solution |
|-------------|-------|-------|----------|
| 401 | Unauthorized | Missing or invalid subscription key | Check `Ocp-Apim-Subscription-Key` header |
| 404 | Not Found | Operation doesn't exist or expired | Verify operation ID; operations expire after completion |
| 429 | Too Many Requests | Polling too frequently | Increase polling interval to at least 5 seconds |

## Operation Expiration

- Operations remain queryable for a limited time after completion
- Typical retention: 24-48 hours after terminal status
- Store operation results when status becomes `Succeeded`
- Don't rely on operation history for long-term tracking

## See Also

- [Generations API](./generations.md) - Create podcast generations that return operations
- [API Overview](./README.md) - Complete workflow with operation polling
