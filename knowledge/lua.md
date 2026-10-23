# Lua & Roblox Luau best practices

## Luau language
- Add `--!strict` at the top of modules and type your functions: `local function damage(h: Humanoid, amount: number): ()`. Export types from ModuleScripts with `export type`.
- `local` everything; never create globals. Cache services at the top: `local Players = game:GetService("Players")` (always `GetService`, never `game.Players`).
- Use `task.wait`, `task.spawn`, `task.defer`, `task.delay` — never the deprecated `wait`, `spawn`, `delay`.
- String building in loops: collect into a table and `table.concat`. Use `string.format` for formatting.
- `table.find`, `table.clear`, `table.freeze` (for constants), generalized iteration `for k, v in t do`.
- Prefer `if x then … end` guard clauses and early returns over deep nesting.
- Use `:FindFirstChild(name)` (returns nil) vs `:WaitForChild(name, timeout)` (yields) deliberately; avoid `WaitForChild` without timeout on the server.

## Architecture
- Server is authoritative. Put game logic in `ServerScriptService`, shared modules in `ReplicatedStorage`, server-only assets in `ServerStorage`. Client scripts in `StarterPlayerScripts` / `StarterCharacterScripts`.
- Organize code as ModuleScripts with a single responsibility; one bootstrap Script/LocalScript requires them.
- Communicate with `RemoteEvent` / `RemoteFunction` (prefer events; never `InvokeClient`). Create remotes in a known folder in ReplicatedStorage.
- **Never trust the client.** Validate every remote argument on the server: types (`typeof(x) == "number"`), ranges, ownership, distance/line-of-sight, cooldowns and rate limits. The client only *requests*; the server decides and applies.
- Use `UnreliableRemoteEvent` for high-frequency cosmetic data.

## Data
- DataStores: wrap calls in `pcall` with retries + backoff, save on `PlayerRemoving` **and** `game:BindToClose`, use `UpdateAsync` for read-modify-write, and session-lock (or use ProfileStore) to prevent duplication. Keep data schemas versioned.
- Respect DataStore request budgets (`DataStoreService:GetRequestBudgetForRequestType`).

## Performance
- Disconnect connections you no longer need (store the `RBXScriptConnection`, call `:Disconnect()`; use a Maid/Trove/Janitor pattern for cleanup).
- Avoid per-frame work on the server; use `RunService.Heartbeat` sparingly and do visual effects on the client (`RenderStepped`/`PreRender` only for camera/character visuals).
- Use `CollectionService` tags instead of scanning `workspace:GetDescendants()` repeatedly.
- Pool frequently created parts/effects; set `CanTouch`/`CanQuery`/`CastShadow` false on decorative parts; anchor static geometry; use StreamingEnabled for large maps.
- Raycasts: reuse a `RaycastParams`; use `workspace:Raycast`, `Blockcast`, `Spherecast`.

## Physics & characters
- Set network ownership deliberately (`part:SetNetworkOwner(nil)` for server-controlled NPC physics).
- Move NPCs with `Humanoid:MoveTo` + `PathfindingService` (recompute on `Blocked`), or `AlignPosition`/`LinearVelocity` constraints instead of setting CFrame every frame.
- Use `TweenService` for UI and simple motion.

## UI
- Build UI with `ScreenGui` + `UIListLayout`/`UIGridLayout`, `UIScale`/`UIAspectRatioConstraint` for scaling; use Scale not Offset for responsiveness. Test on phone/tablet emulators.

## Tooling
- Rojo for file-based workflow + Git; Wally for packages; Selene for linting; StyLua for formatting; TestEZ/Jest-Lua for tests.

## Plain Lua (5.1–5.4, LÖVE, Neovim)
- `local` by default, `ipairs` for arrays and `pairs` for maps, 1-based indexing, `#` only on sequences without holes, metatables for classes, `pcall`/`error` for error handling.
