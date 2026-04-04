# Azure Voice Playground - Product Documentation

This directory contains API documentation and technical references for products available in the Azure Voice Playground.

## Available Products

### 🎙️ [Podcast API](./podcast/README.md)

Generate AI-powered podcast content from text using advanced speech synthesis.

**Features:**
- Single host or conversational two-host formats
- Multiple input formats: text, markdown, HTML, or file upload
- Customizable voice selection and gender preferences
- AI-powered script generation with style and length options
- Asynchronous operation-based processing
- Complete API workflow with status monitoring

**Quick Links:**
- [API Overview & Workflow](./podcast/README.md)
- [Temporary Files API](./podcast/temp-files.md)
- [Generations API](./podcast/generations.md)
- [Operations API](./podcast/operations.md)

**API Version:** `2026-01-01-preview`

---

## Getting Started

Each product has its own dedicated documentation section with:
- 📖 **Overview** - Introduction, authentication, and workflow
- 🔧 **API Reference** - Detailed endpoint documentation
- 💡 **Examples** - Code samples in multiple languages
- ⚠️ **Best Practices** - Recommendations and patterns
- 🐛 **Troubleshooting** - Common errors and solutions

## Authentication

All APIs use Azure Cognitive Services authentication:

```http
Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY
```

Get your subscription key from the Azure Portal:
1. Navigate to your Cognitive Services resource
2. Go to "Keys and Endpoint"
3. Copy either Key 1 or Key 2

## Base URLs

API endpoints are region-specific:

```
https://{region}.api.cognitive.microsoft.com/api/{product}/
```

**Podcast API supported regions:** `westeurope`, `centralus`, `eastus`, `eastus2`, `northcentralus`, `southcentralus`, `westcentralus`, `westus`, `westus2`, `westus3`

## Support

For technical support, questions, or feedback:
- Review the API documentation for your product
- Check the troubleshooting guides
- Contact Azure Cognitive Services support

## Contributing

Found an issue in the documentation?
- Open an issue in the repository
- Submit a pull request with corrections
- Contact the development team

---

*Last Updated: March 27, 2026*
