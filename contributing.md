# Contributing Guidelines for Next.js SaaS Starter

Welcome to the Next.js SaaS Starter project! We appreciate your interest in contributing. This document outlines the guidelines and best practices for contributing to this repository.

---

## 🧠 Developer Mindset

As a contributor, you are expected to:

- Act as a *Senior Full-Stack Developer*.
- Be proficient in:
  - *Frontend*: ReactJS, NextJS, JavaScript, TypeScript, TailwindCSS, HTML, CSS, Shadcn UI, Radix UI.
  - *Backend*: Node.js, TypeScript, PostgreSQL, Drizzle ORM.
- Write thoughtful, accurate, and well-reasoned code.
- Follow best practices and coding standards.

---

## 🚀 General Contribution Workflow

1. *Understand the Requirements*
   - Carefully read and comprehend the issue or feature request.
   - If unclear, seek clarification before proceeding.

2. *Plan Before Coding*
   - Outline your approach in detail.
   - Use pseudocode to map out the solution.

3. *Implement with Precision*
   - Write clean, DRY (Don't Repeat Yourself), and maintainable code.
   - Ensure full functionality with no placeholders or incomplete sections.
   - Include all necessary imports and properly name components and variables.

4. *Focus on Readability*
   - Prioritize code clarity over performance optimizations.
   - Use descriptive names and consistent formatting.

5. *Verify Thoroughly*
   - Test your code to ensure it works as intended.
   - Check for bugs and edge cases.

6. *Be Honest*
   - If you're uncertain about a solution, communicate openly.
   - Avoid guessing; seek assistance when needed.

---

## 🖥️ Frontend Guidelines

- *Styling*
  - Use TailwindCSS utility classes exclusively.
  - Avoid traditional CSS or inline styles.

- *Conditional Classes*
  - Prefer class: directive over ternary operators for conditional classes.

- *Naming Conventions*
  - Use descriptive names for variables and functions.
  - Prefix event handlers with handle, e.g., handleClick.

- *Accessibility*
  - Ensure interactive elements have:
    - tabIndex="0"
    - aria-label
    - onClick and onKeyDown handlers.

- *Function Declarations*
  - Use arrow functions assigned to constants:
    typescript
    const toggle = (): void => { ... };
    
  - Define types explicitly where possible.

---

## 🗄️ Backend Guidelines

- *API Routes*
  - Use TypeScript with precise typings for requests and responses.
  - Validate inputs using tools like Zod.
  - Return structured JSON responses:
    typescript
    return NextResponse.json({ success: true, data });
    
  - Avoid direct use of res.status() or res.json(); prefer NextResponse.

- *Database (PostgreSQL with Drizzle ORM)*
  - Use descriptive table and column names.
  - Interact with the database through Drizzle ORM.
  - Handle database errors gracefully and log them appropriately.

- *Authentication & Security*
  - Do not expose sensitive data to the frontend.
  - Protect private routes using session checks.
  - Store session tokens securely, avoiding localStorage.

- *Error Handling*
  - Implement try/catch blocks with meaningful error messages.
  - Return informative error responses with appropriate HTTP status codes.

- *Performance Best Practices*
  - Use async/await consistently; avoid mixing with .then().
  - Optimize database queries to prevent unnecessary calls.
  - Implement caching strategies where applicable.

---

## 🧪 Testing and Validation

Before submitting a pull request:

- Run type checks:
  ```bash
  pnpm typecheck