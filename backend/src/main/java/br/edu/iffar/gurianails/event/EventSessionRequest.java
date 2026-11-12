package br.edu.iffar.gurianails.event;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class EventSessionRequest {
    public static final String ATTRIBUTE = EventSessionRequest.class.getName() + ".session";

    private EventSessionRequest() {}

    public static EventSessionEntity require(HttpServletRequest request) {
        Object session = request.getAttribute(ATTRIBUTE);
        if (session instanceof EventSessionEntity entity) return entity;
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Entre com o código do evento para continuar.");
    }
}
