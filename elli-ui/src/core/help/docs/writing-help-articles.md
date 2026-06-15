---
title: Writing Help Articles
description: How to create markdown files for the ElliHub Finance Help Center.
section: Authoring Docs
sectionOrder: 3
order: 1
tags: help, markdown, authoring, docs, images, videos, embeds
---

# Writing Help Articles

Help articles are markdown files stored in `src/core/help/docs`. Each file becomes one article in the Help Center, the right-side help panel, and the full `/help` page.

Use this guide when adding or editing help content.

## File naming

Use lowercase kebab-case file names:

```txt
create-project.md
change-project-stage.md
writing-help-articles.md
```

The file name becomes the article URL slug. For example, `create-project.md` opens at `/help/create-project`.

## Required structure

Start every article with frontmatter, then add the article content.

```md
---
title: Creating a Project
description: Create a project from the portfolio, complete project info, add contract details, and attach contract documents.
section: Projects Page
sectionOrder: 1
order: 2
tags: projects, create, new project, portfolio, contract
---

# Creating a Project

Use **New Project** when a job is ready to be tracked in ElliHub Finance.
```

## Frontmatter fields

| Field | Required | Purpose |
| --- | --- | --- |
| `title` | Yes | Article title shown in the panel, sidebar, and page header. |
| `description` | Recommended | Short summary shown in search results and article previews. |
| `section` | Recommended | Navigation group, such as `Projects Page` or `Authoring Docs`. |
| `sectionOrder` | Recommended | Sort order for the navigation group. Lower numbers appear first. |
| `order` | Recommended | Sort order inside the section. Lower numbers appear first. |
| `tags` | Recommended | Search keywords separated by commas. |

Keep descriptions short. One sentence is usually enough.

## Headings

Use one `#` heading that matches the article title, then use `##` and `###` for sections.

```md
# Creating a Project

## Start from the portfolio

## Project Info

### Required fields
```

The help renderer removes the duplicate first `# Title` in article views that already show the title above the content.

## Lists

Use numbered lists for ordered steps.

```md
1. Open **Projects** from the left sidebar.
2. Select **New Project**.
3. Complete the required fields.
```

Use bullets for unordered notes.

```md
- Project stage is selected.
- Project name is clear.
- TCO date is entered.
```

## Tables

Use tables for fields, settings, and comparison content.

```md
| Field | What to enter |
| --- | --- |
| **Project Name** | The official title users should see. |
| **Description / Scope** | A short scope of work. |
```

Keep table cells short enough to scan in the right-side help panel.

## Callouts

Start a paragraph with `>` for important notes.

```md
> The project is not created until you select **Create Project**.
```

Use callouts sparingly for warnings, reminders, or workflow rules.

## Images

Put help images in `public/help/screenshots` and reference them from markdown with `/help/screenshots/...`.

```md
![Project Portfolio screen with the New Project button](/help/screenshots/project-portfolio-new-project.png)
```

Image rules:

- Use clear alt text that describes the screen.
- Use `.png` for screenshots.
- Use lowercase kebab-case file names.
- Do not use local filesystem paths in markdown.

Recommended screenshot names:

```txt
project-portfolio-new-project.png
new-project-project-info.png
new-project-contract-financials.png
```

## Videos

Put help videos in `public/help` or `public/help/videos`, then use this link pattern:

```md
[video: Project creation walkthrough](/help/project-creation.mp4)
```

The label after `video:` becomes the video caption.

## Embeds

Use embeds only for trusted internal or approved external references.

```md
[embed: Fieldwire reference](https://example.com)
```

The label after `embed:` becomes the iframe title and caption.

## Links

Use normal markdown links for internal and external references.

```md
[Open the full Help Center](/help)
[React Markdown](https://github.com/remarkjs/react-markdown)
```

External links open in a new tab.

## Code and file paths

Use inline code for field values, file names, paths, or short examples.

```md
Use `NY` for the state code.
Save screenshots in `public/help/screenshots`.
```

Use fenced code blocks for longer examples.

````md
```txt
public/help/screenshots/project-portfolio-new-project.png
```
````

## Writing style

Write help articles as operational instructions, not product marketing.

- Start with what the user is trying to do.
- Put the most common path first.
- Use exact button and field names from the UI.
- Keep paragraphs short.
- Prefer steps, tables, and screenshots over long explanations.
- End with a checklist when the workflow has multiple required pieces.

## Complete template

Copy this template when creating a new article.

````md
---
title: Article Title
description: One short sentence explaining what this article helps users do.
section: Projects Page
sectionOrder: 1
order: 1
tags: keyword, another keyword
---

# Article Title

Start with one short paragraph that explains when to use this workflow.

## First Step

1. Open the relevant page.
2. Select the action button.
3. Complete the required fields.

![Helpful screenshot alt text](/help/screenshots/example-screenshot.png)

> Add a callout only when the note changes what the user should do.

## Field Reference

| Field | What to enter |
| --- | --- |
| **Field Name** | Clear instruction for the field. |

## Save

Select **Save** or the matching action button.

## Checklist

- Required field is complete.
- Supporting files are attached.
- The record is saved.
````
