# Java & Kotlin best practices

## Java (17/21+)
- Records for immutable data carriers, sealed interfaces + pattern matching `switch` for closed hierarchies, `var` for obvious local types, text blocks for multi-line strings.
- `Optional` as a return type for "maybe absent" — never for fields or parameters; never return `null` collections (return empty).
- Immutable collections (`List.of`, `Map.of`, `Collectors.toUnmodifiableList`). Streams for transformations, loops when clearer.
- try-with-resources for every `AutoCloseable`. Checked exceptions for recoverable conditions; wrap low-level exceptions with context.
- Virtual threads (Java 21) for blocking I/O concurrency; `java.util.concurrent` over manual `synchronized` where possible.
- Spring Boot: constructor injection (no field `@Autowired`), `@ConfigurationProperties` for config, validation with `jakarta.validation`, slice tests (`@WebMvcTest`, `@DataJpaTest`). Avoid N+1 queries in JPA (fetch joins, projections).
- Build with Gradle or Maven as the project does; JUnit 5 + AssertJ + Mockito for tests.
- Equals/hashCode consistency; prefer composition over inheritance; minimize mutability and visibility.

## Kotlin
- `val` by default, data classes, sealed classes/interfaces, `when` expressions, extension functions for readability (not to hide logic).
- Null safety: avoid `!!`; use `?.`, `?:`, `requireNotNull` with a message.
- Coroutines with structured concurrency (`coroutineScope`, `viewModelScope`); `Dispatchers.IO` for blocking calls; `Flow` for streams.
- Android: Jetpack Compose with unidirectional data flow (state hoisting, `ViewModel` + `StateFlow`), Hilt for DI.
