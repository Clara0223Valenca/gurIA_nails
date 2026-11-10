package br.edu.iffar.gurianails.ai;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@Validated
@RestController
@RequestMapping("/api/ai")
public class AiController {
    private final AiGenerationProvider provider;
    private final AiGenerationService service;

    public AiController(AiGenerationProvider provider, AiGenerationService service) {
        this.provider = provider;
        this.service = service;
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of("available", provider.available(), "provider", provider.providerName(), "model", provider.modelName());
    }

    @PostMapping("/generate")
    public Map<String, Object> generate(@Valid @RequestBody AiRequest request) {
        if (request.prompt() == null || request.prompt().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Descreva a arte antes de gerar.");
        return response(service.run(request, false));
    }

    @PostMapping("/improve")
    public Map<String, Object> improve(@Valid @RequestBody AiRequest request) {
        if (request.referenceImage() == null || !request.referenceImage().matches("(?is)^data:image/(png|jpeg|webp);base64,[a-z0-9+/=]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie uma imagem de referência em PNG, JPG ou WEBP.");
        }
        return response(service.run(request, true));
    }

    private Map<String, Object> response(List<String> images) {
        return Map.of("images", images, "model", provider.modelName());
    }
}
