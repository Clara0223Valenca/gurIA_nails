package br.edu.iffar.gurianails.ai;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
@ConditionalOnProperty(prefix = "guria.ai", name = "provider", havingValue = "http")
public class HttpAiGenerationProvider implements AiGenerationProvider {
    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final String generatePath;
    private final String improvePath;
    private final RestClient client = RestClient.create();

    public HttpAiGenerationProvider(
            @Value("${guria.ai.base-url:}") String baseUrl,
            @Value("${guria.ai.api-key:}") String apiKey,
            @Value("${guria.ai.model:flux.2-klein-4b}") String model,
            @Value("${guria.ai.generate-path:/generate}") String generatePath,
            @Value("${guria.ai.improve-path:/improve}") String improvePath) {
        this.baseUrl = baseUrl == null ? "" : baseUrl.strip().replaceAll("/+$", "");
        this.apiKey = apiKey == null ? "" : apiKey.strip();
        this.model = model;
        this.generatePath = normalizePath(generatePath);
        this.improvePath = normalizePath(improvePath);
    }

    @Override
    public boolean available() { return !baseUrl.isBlank(); }

    @Override
    public String providerName() { return available() ? "Provider HTTP configurado" : "Não configurado"; }

    @Override
    public String modelName() { return model; }

    @Override
    public List<String> generate(AiRequest request, boolean improve, String systemNegativePrompt) {
        if (!available()) throw new IllegalStateException("Provider de IA não configurado.");
        int quantity = improve ? 1 : request.quantity() == null ? 1 : Math.min(4, request.quantity());
        Map<String, Object> payload = new HashMap<>();
        payload.put("model", model);
        String userPrompt = improve && (request.prompt() == null || request.prompt().isBlank())
                ? "Aperfeiçoe esta arte mantendo o tema e uma composição limpa para decalque."
                : request.prompt();
        payload.put("prompt", "Gere somente uma ilustração 2D plana de nail art, isolada e apropriada para decalque de unha. Não crie fotografias, mãos, pessoas, pele, mockups, ambientes, perspectiva tridimensional, letras ou marcas-d’água. Preserve uma composição nítida e centralizada. Pedido da usuária: " + userPrompt);
        payload.put("systemPrompt", "A resposta precisa ser uma imagem 2D isolada de nail art, adequada para impressão como adesivo de unha. Rejeite qualquer pedido de fotografia, pessoa, mão, pele, mockup, ambiente, texto, logotipo ou marca-d’água.");
        payload.put("negativePrompt", systemNegativePrompt);
        payload.put("quantity", quantity);
        payload.put("format", request.format());
        payload.put("finger", request.finger());
        payload.put("widthMm", request.widthMm());
        payload.put("lengthMm", request.lengthMm());
        payload.put("background", request.background());
        if (improve) payload.put("referenceImage", request.referenceImage());
        String path = improve ? improvePath : generatePath;

        try {
            Map<String, Object> response = client.post()
                    .uri(baseUrl + path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(headers -> { if (!apiKey.isBlank()) headers.setBearerAuth(apiKey); })
                    .body(payload)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return extractDataUrls(response, quantity);
        } catch (RestClientException exception) {
            throw new AiProviderException("O provider de IA não respondeu corretamente.", exception);
        }
    }

    private List<String> extractDataUrls(Map<String, Object> response, int quantity) {
        if (response == null) throw new AiProviderException("O provider não retornou imagens.");
        Object rawImages = response.get("images");
        if (rawImages == null) rawImages = response.get("results");
        if (!(rawImages instanceof List<?> images)) throw new AiProviderException("Resposta do provider sem a lista de imagens esperada.");
        List<String> valid = new ArrayList<>();
        for (Object image : images) {
            Object raw = image instanceof Map<?, ?> map ? map.get("dataUrl") : image;
            if (!(raw instanceof String dataUrl) || !dataUrl.matches("(?is)^data:image/(png|jpeg|webp);base64,[a-z0-9+/=]+$")) continue;
            if (dataUrl.length() <= 18_000_000) valid.add(dataUrl);
            if (valid.size() >= quantity) break;
        }
        if (valid.isEmpty()) throw new AiProviderException("O provider não retornou imagens PNG, JPG ou WEBP válidas em base64.");
        return List.copyOf(valid);
    }

    private static String normalizePath(String path) {
        if (path == null || path.isBlank()) return "/generate";
        return path.startsWith("/") ? path : "/" + path;
    }
}
