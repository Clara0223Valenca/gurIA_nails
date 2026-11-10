package br.edu.iffar.gurianails.ai;

import java.util.ArrayList;
import java.util.Base64;
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
import org.springframework.web.client.RestClientResponseException;

@Component
@ConditionalOnProperty(prefix = "guria.ai", name = "provider", havingValue = "pollinations", matchIfMissing = true)
public class PollinationsAiGenerationProvider implements AiGenerationProvider {
    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final RestClient client = RestClient.create();

    public PollinationsAiGenerationProvider(
            @Value("${guria.ai.base-url:https://gen.pollinations.ai}") String baseUrl,
            @Value("${guria.ai.api-key:}") String apiKey,
            @Value("${guria.ai.model:black-forest-labs/flux.2-klein-4b}") String model) {
        this.baseUrl = baseUrl == null ? "https://gen.pollinations.ai" : baseUrl.strip().replaceAll("/+$", "");
        this.apiKey = apiKey == null ? "" : apiKey.strip();
        this.model = model;
    }

    @Override
    public boolean available() { return !apiKey.isBlank(); }

    @Override
    public String providerName() { return available() ? "Pollinations.ai" : "Pollinations.ai (aguardando chave)"; }

    @Override
    public String modelName() { return model; }

    @Override
    public List<String> generate(AiRequest request, boolean improve, String systemNegativePrompt) {
        if (!available()) throw new AiUnavailableException("Crie uma chave Pollinations e configure GURIA_AI_API_KEY no arquivo .env.xampp.");
        int quantity = improve ? 1 : request.quantity() == null ? 1 : Math.min(4, request.quantity());
        String userPrompt = improve && (request.prompt() == null || request.prompt().isBlank())
                ? "Aperfeiçoe esta arte mantendo o tema e uma composição limpa para decalque."
                : request.prompt();

        Map<String, Object> payload = new HashMap<>();
        payload.put("model", model);
        payload.put("prompt", "Crie somente uma ilustração 2D plana de nail art, isolada e apropriada para impressão como decalque ou adesivo de unha. Fundo simples, composição centralizada e linhas nítidas. Não crie fotografia, mãos, pessoas, pele, mockup, ambiente, perspectiva 3D, letras, logotipos ou marcas-d’água. Pedido da usuária: " + userPrompt);
        payload.put("negative_prompt", systemNegativePrompt);
        payload.put("size", "1024x1024");
        payload.put("n", quantity);
        payload.put("response_format", "b64_json");
        if (improve) {
            if (request.referenceImage() == null || !request.referenceImage().matches("(?is)^data:image/(png|jpeg|webp);base64,[a-z0-9+/=]+$")) {
                throw new AiProviderException("A imagem enviada para aperfeiçoamento está inválida.");
            }
            payload.put("image", request.referenceImage());
        }

        String path = improve ? "/v1/images/edits" : "/v1/images/generations";
        try {
            Map<String, Object> response = client.post()
                    .uri(baseUrl + path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .headers(headers -> headers.setBearerAuth(apiKey))
                    .body(payload)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return extractImages(response, quantity);
        } catch (RestClientResponseException exception) {
            throw providerFailure(exception);
        } catch (RestClientException exception) {
            throw new AiProviderException("Não foi possível conectar ao Pollinations. Verifique a internet e tente novamente.", exception);
        }
    }

    private List<String> extractImages(Map<String, Object> response, int quantity) {
        Object rawData = response == null ? null : response.get("data");
        if (!(rawData instanceof List<?> rows)) throw new AiProviderException("O Pollinations não retornou imagens no formato esperado.");
        List<String> images = new ArrayList<>();
        for (Object row : rows) {
            if (!(row instanceof Map<?, ?> imageRow)) continue;
            Object rawImage = imageRow.get("b64_json");
            if (!(rawImage instanceof String encoded) || encoded.length() > 18_000_000) continue;
            try {
                byte[] bytes = Base64.getDecoder().decode(encoded);
                String mimeType = detectMimeType(bytes);
                if (mimeType != null) images.add("data:" + mimeType + ";base64," + encoded);
            } catch (IllegalArgumentException ignored) {
                // Ignore invalid entries and report a useful error if no valid image remains.
            }
            if (images.size() >= quantity) break;
        }
        if (images.isEmpty()) throw new AiProviderException("O Pollinations não retornou uma imagem PNG, JPG ou WEBP válida.");
        return List.copyOf(images);
    }

    private static String detectMimeType(byte[] bytes) {
        if (bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G') return "image/png";
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff) return "image/jpeg";
        if (bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') return "image/webp";
        return null;
    }

    private static AiProviderException providerFailure(RestClientResponseException exception) {
        return switch (exception.getStatusCode().value()) {
            case 401, 403 -> new AiProviderException("A chave Pollinations é inválida ou não tem permissão para gerar imagens.", exception);
            case 402 -> new AiProviderException("A conta Pollinations está sem saldo/créditos para gerar imagens.", exception);
            case 429 -> new AiProviderException("O limite de gerações foi atingido. Aguarde um pouco e tente novamente.", exception);
            default -> new AiProviderException("O Pollinations recusou a geração. Confira o modelo selecionado e tente novamente.", exception);
        };
    }
}
