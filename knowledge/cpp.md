# C / C++ best practices (incl. Unreal Engine)

## Modern C++ (C++17/20/23)
- RAII for every resource. No raw `new`/`delete`: use `std::unique_ptr` (default) / `std::make_unique`, `std::shared_ptr` only for genuinely shared ownership.
- Pass by `const T&` for read-only non-trivial types, by value for cheap types or when you'll move/copy anyway; return by value (RVO/move).
- `std::string_view` and `std::span` for non-owning views (don't let them outlive the owner).
- `auto` when the type is obvious or noisy; `const` and `constexpr` by default; `[[nodiscard]]` on functions whose result must be used.
- Prefer `std::array`/`std::vector` over C arrays, `std::optional` over sentinel values, `std::variant` over unions, `enum class` over plain enums.
- Range-based `for`, `<algorithm>`/`<ranges>` over hand-written loops. Avoid `using namespace std;` in headers.
- Rule of zero: let members manage resources; if you write one special member, consider all five.
- Initialize everything (`int x{};`). Enable warnings (`-Wall -Wextra -Wpedantic` / `/W4`) and treat them as errors in CI. Run sanitizers (ASan, UBSan) and clang-tidy.
- Build with CMake (target-based: `target_link_libraries`, `target_include_directories`); format with clang-format.
- Concurrency: `std::jthread`, `std::mutex` + `std::scoped_lock`, `std::atomic`; never share mutable state without synchronization.

## C
- Check every return value (malloc, fopen, read). Bounds-check buffers; use `snprintf`, never `gets`/`sprintf`/`strcpy` on untrusted data. Free in reverse order of allocation; one clear owner per allocation.

## Unreal Engine 5
- Follow Unreal naming: `U` (UObject), `A` (Actor), `F` (struct), `E` (enum), `I` (interface), `T` (template), `b` prefix for bools.
- `UPROPERTY()` on every `UObject*` member so the GC tracks it; use `TObjectPtr<T>` for member pointers, `TWeakObjectPtr` for non-owning refs, `TSoftObjectPtr`/`TSoftClassPtr` for lazily loaded assets.
- Use engine containers (`TArray`, `TMap`, `TSet`, `FString`, `FName`, `FText` for user-facing text).
- Expose to Blueprints deliberately: `UFUNCTION(BlueprintCallable)`, `UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="…")`. Keep heavy logic in C++, tuning and content in Blueprints/Data Assets.
- Avoid Tick where possible: disable `PrimaryActorTick.bCanEverTick` and use timers (`GetWorldTimerManager().SetTimer`), events, or delegates.
- Gameplay: Gameplay Ability System for abilities/attributes; Enhanced Input for input; Gameplay Tags over string comparisons.
- Networking: server-authoritative; mark replicated props with `Replicated`/`ReplicatedUsing=OnRep_X` and implement `GetLifetimeReplicatedProps`; validate `Server` RPCs; use `HasAuthority()` checks.
- Use `check`/`ensure`/`verify` and `UE_LOG` with a custom log category. Profile with Unreal Insights before optimizing.
- Python editor scripting (`unreal` module) for batch asset operations.
