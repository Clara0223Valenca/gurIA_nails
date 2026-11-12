package br.edu.iffar.gurianails.event;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EventRateLimitService {
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public void check(String key, int limit, Duration duration) {
        long durationMillis = Math.max(1, duration.toMillis());
        long currentWindow = System.currentTimeMillis() / durationMillis;
        Window result = windows.compute(key, (ignored, previous) -> {
            if (previous == null || previous.number != currentWindow) return new Window(currentWindow, 1);
            return new Window(currentWindow, previous.count + 1);
        });
        if (windows.size() > 10_000) windows.entrySet().removeIf(entry -> entry.getValue().number < currentWindow - 1);
        if (result.count > limit) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Muitas tentativas. Aguarde um pouco e tente novamente.");
        }
    }

    private record Window(long number, int count) {}
}
