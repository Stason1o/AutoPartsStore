package md.sacramento.common;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Простой in-memory rate-limit со скользящим окном (на один инстанс — нам хватает). */
@Component
public class RateLimiter {

    public static class TooManyRequestsException extends RuntimeException {
        public TooManyRequestsException() {
            super("Слишком много запросов, попробуйте через минуту");
        }
    }

    private record Window(long windowStartMillis, int count) {
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    /** Бросает 429, если по ключу больше limit запросов за window. */
    public void check(String key, int limit, Duration window) {
        long now = System.currentTimeMillis();
        long windowMillis = window.toMillis();
        Window result = windows.compute(key, (k, current) -> {
            if (current == null || now - current.windowStartMillis() >= windowMillis) {
                return new Window(now, 1);
            }
            return new Window(current.windowStartMillis(), current.count() + 1);
        });
        if (result.count() > limit) {
            throw new TooManyRequestsException();
        }
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(e -> now - e.getValue().windowStartMillis() >= windowMillis);
        }
    }
}
