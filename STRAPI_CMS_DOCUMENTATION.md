# Strapi CMS Backend Documentation

## Table of Contents

1. [Overview](#overview)
2. [Content Models](#content-models)
3. [Content Manager](#content-manager)
4. [Media Library](#media-library)
5. [API Documentation](#api-documentation)
6. [Administration Panel](#administration-panel)
7. [Settings & Configuration](#settings--configuration)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This Strapi CMS backend powers a news application with comprehensive content management capabilities. The system supports article publishing, newsletter management, user subscriptions, and media handling with role-based access control.

### Key Features

- Multi-role user management (Super Admin, Editor, Author)
- Rich text content with HTML support
- Newsletter subscription system
- Category-based content organization
- Tag-based content labeling
- Media library with optimized image handling
- API token management
- Google Analytics integration
- AI-powered writing assistance

---

## Content Models

### Article

**Purpose**: Main news articles displayed on the frontend

**Fields**:

- **Title** (Text, Required): Article headline (max 200 characters)
- **Slug** (UID, Auto-generated): URL-friendly identifier
- **Content** (Rich Text, Required): Main article body with HTML support
- **Excerpt** (Text): Brief summary (max 300 characters)
- **Featured Image** (Media, Required): Main article image 2000 (width) x 1400 (height) pixels
- **imageAlt** (Text): Alt text for featured image (max 50 characters)
- **Category** (Relation): Link to category model
- **Tags** (Relation): Multiple tag associations
- **Author** (Relation): Link to user model
- **Breaking News** (Boolean): Flag for "Just In" section
- **Published At** (DateTime): Publication timestamp
- **SEO Title** (Text): Custom title for search engines
- **SEO Description** (Text): Meta description for SEO

**Rich Text Support**: Use HTML tags for formatting:

```html
<h2>Subheading</h2>
<p>Paragraph text with <strong>bold</strong> and <em>italic</em></p>
<ul>
  <li>List item</li>
</ul>
<blockquote>Quote text</blockquote>
<a href="#">Link text</a>
```

### Newsletter

**Purpose**: Email newsletters sent to subscribers

**Fields**:

- **Title** (Text, Required): Newsletter title
- **Subject** (Text, Required): Email subject line
- **Content** (Rich Text, Required): Newsletter body with HTML support
- **docStatus** (Enumeration): draft, sent
- **Sent At** (DateTime): Actual send timestamp

### Subscriber

**Purpose**: Newsletter subscription management

**Fields**:

- **Email** (Email, Required, Unique): Subscriber email address
- **Full Name** (Text, Required): Subscriber's full name
- **Subscribed At** (DateTime): Subscription timestamp
- **Active** (Boolean): Subscription status

### Category

**Purpose**: Content organization sections

**Predefined Categories** (Do NOT create new ones):

1. **Politics** - Political news and analysis
2. **Economy** - Economic reports and business news
3. **World** - International news and global events
4. **Security** - Security and defense matters
5. **Law** - Legal news and judicial updates
6. **Science** - Scientific discoveries and research
7. **Society** - Social issues and community news
8. **Culture** - Arts, entertainment, and cultural events
9. **Sport** - Sports news and events

**Special Sections**:

- **Home**: Shows latest published articles (not a category)
- **Just In**: Breaking news (use Breaking News flag in articles)

**Fields**:

- **Name** (Text, Required): Category display name
- **Slug** (UID): URL identifier
- **Description** (Text): Category description
- **Articles** (Relation): Articles associated with this category

### Tags

**Purpose**: Content labeling and topic identification

**Fields**:

- **Name** (Text, Required, Unique): Tag name
- **Slug** (UID): URL-friendly identifier
- **Description** (Text): Tag description
- **Articles** (Relation): Articles associated with this tag

**Best Practices**:

- Search existing tags before creating new ones
- Use descriptive, specific tag names
- Limit to 5-7 tags per article
- Use consistent naming conventions

### User

**Purpose**: System user management (Strapi default model)

**Fields**:

- **Username** (Text, Required, Unique)
- **Email** (Email, Required, Unique)
- **Password** (Password, Required)
- **confirmPassword** (Password, Required): Confirm password for account creation
- **blocked** (Boolean): Account lock status
- **Role** (Relation): Link to role model

---

## Content Manager

### Creating Articles

1. **Basic Information**

   - Enter compelling title (under 200 characters)
   - Write engaging excerpt (under 300 characters)
   - Select appropriate category from predefined list

2. **Content Creation**

   - Use rich text editor with HTML support
   - Structure content with headings (H2, H3)
   - Add links, lists, and formatting as needed
   - Include quotes using blockquote tags

3. **Media & SEO**

   - Upload featured image (2000 (width) x 1400 (height) pixels, PNG/JPG/WebP)
   - Add relevant tags (search existing first)
   - Set SEO title and description
   - Enable "Breaking News" for Just In section

4. **Publishing**
   - Save as draft for review
   - Publish when ready

### Managing Newsletters

1. **Newsletter Creation**

   - Create compelling subject line
   - Design content with HTML formatting
   - Include unsubscribe links - https://www.migrantnews.com/unsubscribe
   - Preview before sending

---

## Media Library

### Image Requirements

- **Formats**: PNG, JPG, WebP only
- **Dimensions**: 2000 (width) x 1400 (height) pixels
- **File Size**: Under 2MB for optimal performance
- **Quality**: High-resolution, professional images

### Best Practices

- Use descriptive filenames with dates: `politics-election-2024-01-15.jpg`
- Organize by category or date folders
- Compress images before upload
- Use Canva template (2000 (width) x 1400 (height) pixels) for consistency
- Add alt text for accessibility

### Upload Process

1. Prepare images in Canva or similar tool
2. Resize to exact dimensions 2000 (width) x 1400 (height) pixels
3. Optimize file size while maintaining quality
4. Upload with descriptive filename
5. Add alt text and caption

---

## API Documentation

### Base URL

```
Production: https://luminous-unity-3c4ca772cb.strapiapp.com/api
Development: http://localhost:1337/api
```

### Authentication

Strapi uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### API Configuration

- **Default Limit**: 25 items per request
- **Maximum Limit**: 100 items per request
- **Count Included**: Response includes total count by default

### Core Endpoints

#### Articles

**Content Type**: `api::article.article`
**Collection**: `articles`

```
GET    /api/articles              # Get all articles
GET    /api/articles/:id          # Get single article
POST   /api/articles              # Create article (Admin only)
PUT    /api/articles/:id          # Update article (Admin only)
DELETE /api/articles/:id          # Delete article (Admin only)
```

**Article Fields:**

- `title` (string, max 200, required)
- `slug` (uid, auto-generated from title, required)
- `excerpt` (string, max 300, required)
- `featuredImage` (media, required - images/files/videos/audios)
- `imageAlt` (string, required)
- `isBreaking` (boolean, default: false, required)
- `content` (richtext, required)
- `readTime` (integer, 1-60 minutes, required)
- `location` (string, max 100, required)
- `seoTitle` (string, max 60, required)
- `seoDescription` (string, max 160, required)
- `publishedDate` (datetime)
- `author` (relation to Author)
- `category` (relation to Category)
- `tags` (many-to-many relation to Tags)
- `publishedAt` (datetime, draft/publish system)

**Query Parameters:**

- `populate`: Include related data (author, category, tags, featuredImage)
- `filters`: Filter results
- `sort`: Sort results
- `pagination[page]`: Page number
- `pagination[pageSize]`: Items per page (max 100)

**Example Requests:**

```
GET /api/articles?populate=*&filters[category][name][$eq]=Politics&sort=publishedDate:desc
GET /api/articles?populate[author]=*&populate[category]=*&populate[tags]=*&populate[featuredImage]=*
GET /api/articles?filters[isBreaking][$eq]=true&sort=publishedDate:desc
GET /api/articles?filters[publishedAt][$notNull]=true&pagination[page]=1&pagination[pageSize]=10
```

#### Categories

**Content Type**: `api::category.category`
**Collection**: `categories`

```
GET    /api/categories            # Get all categories
GET    /api/categories/:id        # Get single category
POST   /api/categories            # Create category (Admin only)
PUT    /api/categories/:id        # Update category (Admin only)
DELETE /api/categories/:id        # Delete category (Admin only)
```

**Category Fields:**

- `name` (string, max 50, required)
- `slug` (uid, auto-generated from name, required)
- `description` (string, max 200, optional)
- `articles` (one-to-many relation to Articles)
- `publishedAt` (datetime, draft/publish system)

#### Tags

**Content Type**: `api::tag.tag`
**Collection**: `tags`

```
GET    /api/tags                  # Get all tags
GET    /api/tags/:id              # Get single tag
POST   /api/tags                  # Create tag (Admin only)
PUT    /api/tags/:id              # Update tag (Admin only)
DELETE /api/tags/:id              # Delete tag (Admin only)
```

**Tag Fields:**

- `name` (string, max 50, required)
- `slug` (uid, auto-generated from name, required)
- `description` (string, max 50, optional)
- `articles` (many-to-many relation to Articles)
- `publishedAt` (datetime, draft/publish system)

#### Authors

**Content Type**: `api::author.author`
**Collection**: `authors`

```
GET    /api/authors               # Get all authors
GET    /api/authors/:id           # Get single author
POST   /api/authors               # Create author (Admin only)
PUT    /api/authors/:id           # Update author (Admin only)
DELETE /api/authors/:id           # Delete author (Admin only)
```

**Author Fields:**

- `name` (string, max 100, required)
- `slug` (uid, auto-generated from name, required)
- `email` (email, required, unique)
- `isActive` (boolean, default: true)
- `articles` (one-to-many relation to Articles)
- `publishedAt` (datetime, draft/publish system)

#### Newsletter

**Content Type**: `api::newsletter.newsletter`
**Collection**: `newsletters`

```
GET    /api/newsletters           # Get all newsletters (Admin only)
GET    /api/newsletters/:id       # Get single newsletter (Admin only)
POST   /api/newsletters           # Create newsletter (Admin only)
PUT    /api/newsletters/:id       # Update newsletter (Admin only)
DELETE /api/newsletters/:id       # Delete newsletter (Admin only)
```

**Newsletter Fields:**

- `title` (string, required)
- `subject` (string, required)
- `docStatus` (enumeration: "draft" | "sent", default: "draft")
- `sentAt` (datetime)
- `content` (richtext, required)
- `publishedAt` (datetime, draft/publish system)

**Custom Newsletter Endpoints:**

```
POST   /api/newsletter/subscribe   # Subscribe to newsletter (Public, no auth)
PUT    /api/newsletter/:id/status  # Update newsletter status (Public, no auth)
```

**Subscribe Request Body:**

```json
{
  "email": "user@example.com",
  "fullname": "John Doe" // optional
}
```

**Update Status Request Body:**

```json
{
  "status": "sent" // or "draft"
}
```

#### Subscribers

**Content Type**: `api::subscriber.subscriber`
**Collection**: `subscribers`

```
GET    /api/subscribers           # Get all subscribers (Admin only)
GET    /api/subscribers/:id       # Get single subscriber (Admin only)
POST   /api/subscribers           # Create subscriber (Admin only)
PUT    /api/subscribers/:id       # Update subscriber (Admin only)
DELETE /api/subscribers/:id       # Delete subscriber (Admin only)
```

**Subscriber Fields:**

- `email` (email, required, unique)
- `fullname` (string, required)
- `isActive` (boolean, default: true, required)
- `subscribedAt` (datetime, required)
- `publishedAt` (datetime, draft/publish system)

**Note**: Use the custom `/api/newsletter/subscribe` endpoint for public newsletter subscriptions.

### Common Query Parameters

All collection endpoints support these standard Strapi query parameters:

#### Populate

```
# Populate all relations
?populate=*

# Populate specific relations
?populate[author]=*&populate[category]=*

# Populate nested relations
?populate[author][populate][avatar]=*
```

#### Filters

```
# Exact match
?filters[title][$eq]=Breaking News

# Contains
?filters[title][$contains]=politics

# Date filters
?filters[publishedAt][$gte]=2024-01-01
?filters[publishedAt][$lte]=2024-12-31

# Boolean filters
?filters[isBreaking][$eq]=true

# Null/Not null
?filters[publishedAt][$null]=false
?filters[publishedAt][$notNull]=true

# Multiple conditions (AND)
?filters[category][name][$eq]=Politics&filters[isBreaking][$eq]=true

# OR conditions
?filters[$or][0][title][$contains]=news&filters[$or][1][title][$contains]=update
```

#### Sorting

```
# Single field
?sort=publishedAt:desc

# Multiple fields
?sort[0]=publishedAt:desc&sort[1]=title:asc

# Relation sorting
?sort=category.name:asc
```

#### Pagination

```
# Page-based pagination
?pagination[page]=1&pagination[pageSize]=10

# Offset-based pagination
?pagination[start]=0&pagination[limit]=10
```

#### Fields Selection

```
# Select specific fields
?fields[0]=title&fields[1]=slug&fields[2]=publishedAt

# Select relation fields
?fields=title,slug&populate[author][fields][0]=name
```

### Response Format

#### Collection Response (GET /api/articles)

```json
{
  "data": [
    {
      "id": 1,
      "attributes": {
        "title": "Breaking: Major Political Development",
        "slug": "breaking-major-political-development",
        "excerpt": "A significant political event has occurred...",
        "content": "<p>Full article content with HTML formatting...</p>",
        "isBreaking": true,
        "readTime": 5,
        "location": "Washington DC",
        "seoTitle": "Breaking Political News - Major Development",
        "seoDescription": "Latest breaking news on major political development affecting...",
        "publishedDate": "2024-01-15T10:30:00.000Z",
        "publishedAt": "2024-01-15T10:30:00.000Z",
        "createdAt": "2024-01-15T09:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "featuredImage": {
          "data": {
            "id": 1,
            "attributes": {
              "name": "political-news.jpg",
              "url": "/uploads/political_news_123.jpg",
              "width": 1200,
              "height": 800,
              "formats": {
                "thumbnail": {
                  "url": "/uploads/thumbnail_political_news_123.jpg",
                  "width": 245,
                  "height": 156
                },
                "medium": {
                  "url": "/uploads/medium_political_news_123.jpg",
                  "width": 750,
                  "height": 469
                }
              }
            }
          }
        },
        "author": {
          "data": {
            "id": 1,
            "attributes": {
              "name": "John Smith",
              "slug": "john-smith",
              "email": "john.smith@example.com",
              "isActive": true
            }
          }
        },
        "category": {
          "data": {
            "id": 1,
            "attributes": {
              "name": "Politics",
              "slug": "politics",
              "description": "Political news and analysis"
            }
          }
        },
        "tags": {
          "data": [
            {
              "id": 1,
              "attributes": {
                "name": "Breaking News",
                "slug": "breaking-news"
              }
            },
            {
              "id": 2,
              "attributes": {
                "name": "Government",
                "slug": "government"
              }
            }
          ]
        }
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 4,
      "total": 87
    }
  }
}
```

#### Single Entity Response (GET /api/articles/1)

```json
{
  "data": {
    "id": 1,
    "attributes": {
      // Same structure as collection item
    }
  },
  "meta": {}
}
```

#### Custom Newsletter Subscribe Response

```json
{
  "message": "Successfully subscribed to newsletter!",
  "data": {
    "email": "user@example.com",
    "isActive": true
  }
}
```

### Error Responses

#### 400 Bad Request

```json
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Email is required",
    "details": {
      "errors": [
        {
          "path": ["email"],
          "message": "Email is required",
          "name": "ValidationError"
        }
      ]
    }
  }
}
```

#### 401 Unauthorized

```json
{
  "error": {
    "status": 401,
    "name": "UnauthorizedError",
    "message": "Missing or invalid credentials"
  }
}
```

#### 403 Forbidden

```json
{
  "error": {
    "status": 403,
    "name": "ForbiddenError",
    "message": "Forbidden"
  }
}
```

#### 404 Not Found

```json
{
  "error": {
    "status": 404,
    "name": "NotFoundError",
    "message": "Not Found"
  }
}
```

#### 500 Internal Server Error

```json
{
  "error": {
    "status": 500,
    "name": "InternalServerError",
    "message": "An error occurred during request execution"
  }
}
```

### Error Handling

```json
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Title is required",
    "details": {}
  }
}
```

---

## Administration Panel

### User Roles & Permissions

#### Super Admin

- **Access**: Complete system control
- **Permissions**: All CRUD operations, user management, settings
- **Security**: Limit to 1-2 trusted individuals
- **Responsibilities**: System configuration, user management, security

#### Editor

- **Access**: Content and media management
- **Permissions**:
  - Create, read, update, delete articles
  - Manage media library
  - Manage newsletters
  - View analytics
- **Restrictions**: Cannot modify users or system settings

#### Author

- **Access**: Content creation only
- **Permissions**:
  - Create and edit own articles
  - Create newsletters
  - Upload media
- **Restrictions**: Cannot publish without approval, limited media access

### User Management

#### Inviting Users

1. Navigate to Administration Panel > Users
2. Click "Invite User"
3. Enter email address
4. Select appropriate role
5. Send invitation
6. User receives email with setup instructions

#### Role Assignment

- Assign minimal necessary permissions
- Review permissions regularly
- Document role assignments
- Use principle of least privilege

---

## Settings & Configuration

### API Tokens

#### Token Types

1. **Full Access**: Complete CRUD operations
2. **Read Only**: View content only (recommended for frontend)
3. **Custom**: Granular permission control

#### Frontend Token Setup

- Create "Read Only" token
- Add to frontend environment variables
- Regenerate periodically for security

### Email Configuration

- **Provider**: Brevo (SendinBlue)
- **Templates**: HTML email templates for newsletters
- **Settings**: SMTP configuration in Settings > Email

### Google Analytics

- **Integration**: GA4 tracking
- **Dashboard**: Real-time traffic analytics
- **Metrics**: Page views, user sessions, bounce rate
- **Setup**: Configure GA tracking ID in Settings

### Internationalization

- **Default**: English (en)
- **Additional**: Add languages in Settings > Internationalization
- **Content**: Create localized versions of content

---

## Best Practices

### Content Creation

1. **Headlines**: Clear, engaging, under 200 characters
2. **Structure**: Use H2/H3 headings for readability
3. **Images**: Always 2000 (width) x 1400 (height) pixels, high quality
4. **SEO**: Include meta title and description
5. **Tags**: Use existing tags, limit to 5-7 per article
6. **Categories**: Stick to predefined categories

### Security

1. **Passwords**: Strong, unique passwords for all users
2. **Tokens**: Regular rotation, minimal permissions
3. **Access**: Role-based permissions, regular audits

## Troubleshooting

### Common Issues

#### Image Upload Problems

- Check file size (under 2MB)
- Verify format (PNG/JPG/WebP only)
- Ensure proper dimensions 2000 (width) x 1400 (height) pixels

#### API Access Issues

- Verify token permissions
- Check token expiration
- Confirm endpoint URLs

#### Newsletter Delivery

- Verify email configuration
- Check subscriber list validity
- Monitor delivery rates

#### Performance Issues

- Optimize images before upload
- Use pagination for large datasets
- Monitor server resources

---

## Additional Resources

### Documentation Links

- [Strapi Documentation](https://docs.strapi.io/)
- [API Reference](http://localhost:1337/documentation)
- [Rich Text Editor Guide](https://docs.strapi.io/user-docs/content-manager/writing-content#rich-text)

### Tools & Integrations

- **Canva**: Image creation and resizing
- **Google Analytics**: Traffic monitoring
- **Brevo**: Email delivery service
- **AI Writing Tool**: Gemini 3.5 Flash model

---
