---
name: OpenAPI codegen quirks
description: Environment-specific Orval behavior that affects generated Zod and TypeScript exports.
---

In this workspace, path parameters can cause Orval's generated Zod parameter schema and generated parameter type to share the same exported name, which fails the library typecheck. Prefer query-based detail endpoints for demo APIs when a path parameter would create that collision.

**Why:** The generated Zod and type barrels both re-export parameter names, so the collision appears only after codegen when the libraries are typechecked.

**How to apply:** After changing the OpenAPI contract, run codegen and the library typecheck before wiring frontend hooks. If a parameter export collision appears, change the endpoint input shape rather than hand-editing generated files.