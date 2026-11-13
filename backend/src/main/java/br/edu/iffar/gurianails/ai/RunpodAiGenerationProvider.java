package br.edu.iffar.gurianails.ai;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
@ConditionalOnProperty(prefix = "guria.ai", name = "provider", havingValue = "runpod")
public class RunpodAiGenerationProvider implements AiGenerationProvider {
    private static final int MAX_IMAGE_BASE64_LENGTH = 18_000_000;
    private static final int MAX_PROMPT_LENGTH = 1200;
    private static final String PRINTABLE_DECAL_PREFIX =
            "Primary subject or theme, possibly written in Brazilian Portuguese: ";
    private static final String PRINTABLE_DECAL_SUFFIX =
            ". Interpret the theme literally as a source of decorative motifs, colors, characters, symbols and objects. "
            + "Create exactly one isolated miniature printable decal graphic of that subject. Use a flat 2D vector-style "
            + "illustration, centered orthographic front view, simple clean silhouette, matte solid-color fills, crisp uniform "
            + "edges, even color, a uniform pure white background and zero visual depth. Show only the requested motif as "
            + "standalone artwork optimized for very small-format printing.";
    private final String baseUrl;
    private final String endpointId;
    private final String apiKey;
    private final String model;
    private final Duration pollInterval;
    private final Duration maxWait;
    private final RestClient client = RestClient.create();

    public RunpodAiGenerationProvider(
            @Value("${guria.ai.base-url:https://api.runpod.ai/v2}") String baseUrl,
            @Value("${guria.ai.endpoint-id:}") String endpointId,
            @Value("${guria.ai.api-key:}") String apiKey,
            @Value("${guria.ai.model:black-forest-labs/FLUX.2-klein-4B}") String model,
            @Value("${guria.ai.poll-interval-ms:2000}") long pollIntervalMs,
            @Value("${guria.ai.max-wait-seconds:900}") long maxWaitSeconds) {
        this.baseUrl = stripTrailingSlash(baseUrl);
        this.endpointId = endpointId == null ? "" : endpointId.strip();
        this.apiKey = apiKey == null ? "" : apiKey.strip();
        this.model = model;
        this.pollInterval = Duration.ofMillis(Math.max(500, pollIntervalMs));
        this.maxWait = Duration.ofSeconds(Math.max(30, maxWaitSeconds));
    }

    @Override
    public boolean available() {
        return !baseUrl.isBlank() && !endpointId.isBlank() && !apiKey.isBlank();
    }

    @Override
    public String providerName() {
        return available() ? "RunPod Serverless" : "RunPod Serverless (aguardando configuração)";
    }

    @Override
    public String modelName() {
        return model;
    }

    @Override
    public List<String> generate(AiRequest request, boolean improve, String systemNegativePrompt) {
        if (!available()) {
            throw new AiUnavailableException("Configure GURIA_AI_ENDPOINT_ID e GURIA_AI_API_KEY no Render.");
        }
        if (improve) {
            throw new AiProviderException("O aperfeiçoamento por imagem será habilitado depois do teste inicial do RunPod.");
        }

        int quantity = request.quantity() == null ? 1 : Math.min(4, request.quantity());
        String prompt = buildPrompt(request);
        List<String> images = new ArrayList<>(quantity);
        for (int index = 0; index < quantity; index++) {
            long seed = ThreadLocalRandom.current().nextLong(0, 4_294_967_296L);
            String jobId = submit(prompt, seed);
            images.add(awaitImage(jobId));
        }
        return List.copyOf(images);
    }

    private String submit(String prompt, long seed) {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("prompt", prompt);
        input.put("seed", seed);
        input.put("width", 768);
        input.put("height", 768);
        try {
            Map<String, Object> response = client.post()
                    .uri(endpointUrl("/run"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .headers(headers -> headers.setBearerAuth(apiKey))
                    .body(Map.of("input", input))
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            Object rawId = response == null ? null : response.get("id");
            if (!(rawId instanceof String id) || id.isBlank()) {
                throw new AiProviderException("O RunPod não retornou o identificador da geração.");
            }
            return id;
        } catch (RestClientResponseException exception) {
            throw providerFailure(exception);
        } catch (RestClientException exception) {
            throw new AiProviderException("Não foi possível enviar a geração ao RunPod.", exception);
        }
    }

    private String awaitImage(String jobId) {
        long deadline = System.nanoTime() + maxWait.toNanos();
        while (System.nanoTime() < deadline) {
            Map<String, Object> response = status(jobId);
            String state = String.valueOf(response.getOrDefault("status", "UNKNOWN"));
            if ("COMPLETED".equals(state)) return extractImage(response);
            if (List.of("FAILED", "TIMED_OUT", "CANCELLED").contains(state)) {
                throw new AiProviderException("A geração RunPod terminou com status " + state + ".");
            }
            try {
                Thread.sleep(pollInterval.toMillis());
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                cancel(jobId);
                throw new AiProviderException("A espera pela geração RunPod foi interrompida.", exception);
            }
        }
        cancel(jobId);
        throw new AiProviderException("O RunPod excedeu o tempo máximo de espera e a geração foi cancelada.");
    }

    private Map<String, Object> status(String jobId) {
        try {
            Map<String, Object> response = client.get()
                    .uri(endpointUrl("/status/" + jobId))
                    .accept(MediaType.APPLICATION_JSON)
                    .headers(headers -> headers.setBearerAuth(apiKey))
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            if (response == null) throw new AiProviderException("O RunPod não retornou o estado da geração.");
            return response;
        } catch (RestClientResponseException exception) {
            throw providerFailure(exception);
        } catch (RestClientException exception) {
            throw new AiProviderException("Não foi possível consultar a geração no RunPod.", exception);
        }
    }

    private String extractImage(Map<String, Object> response) {
        Object rawOutput = response.get("output");
        if (!(rawOutput instanceof Map<?, ?> output)) {
            throw new AiProviderException("O RunPod concluiu sem retornar a imagem esperada.");
        }
        if (Boolean.FALSE.equals(output.get("ok"))) {
            throw new AiProviderException("O worker RunPod recusou os dados da geração.");
        }
        Object rawBase64 = output.get("imageBase64");
        Object rawMime = output.get("mimeType");
        if (!(rawBase64 instanceof String encoded) || encoded.isBlank() || encoded.length() > MAX_IMAGE_BASE64_LENGTH) {
            throw new AiProviderException("O RunPod retornou uma imagem vazia ou grande demais.");
        }
        String mimeType = rawMime instanceof String value ? value : "image/webp";
        if (!List.of("image/png", "image/jpeg", "image/webp").contains(mimeType)) {
            throw new AiProviderException("O RunPod retornou um formato de imagem não permitido.");
        }
        try {
            Base64.getDecoder().decode(encoded);
        } catch (IllegalArgumentException exception) {
            throw new AiProviderException("O RunPod retornou uma imagem base64 inválida.", exception);
        }
        return "data:" + mimeType + ";base64," + encoded;
    }

    private void cancel(String jobId) {
        try {
            client.post()
                    .uri(endpointUrl("/cancel/" + jobId))
                    .headers(headers -> headers.setBearerAuth(apiKey))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RuntimeException ignored) {
            // Best effort: preserve the original timeout/interruption error.
        }
    }

    private String endpointUrl(String path) {
        return baseUrl + "/" + endpointId + path;
    }

    static String buildPrompt(AiRequest request) {
        String userPrompt = request.prompt() == null ? "delicate decorative motif" : request.prompt().strip();
        userPrompt = userPrompt.replaceAll("(?i)(?<![a-z0-9_])naildecalstyle(?![a-z0-9_])", "").strip();
        if (userPrompt.isBlank()) userPrompt = "delicate decorative motif";
        int availableUserCharacters = MAX_PROMPT_LENGTH
                - PRINTABLE_DECAL_PREFIX.length()
                - PRINTABLE_DECAL_SUFFIX.length();
        if (userPrompt.length() > availableUserCharacters) {
            userPrompt = userPrompt.substring(0, availableUserCharacters);
        }
        return PRINTABLE_DECAL_PREFIX + userPrompt + PRINTABLE_DECAL_SUFFIX;
    }

    private static String stripTrailingSlash(String value) {
        return value == null ? "" : value.strip().replaceAll("/+$", "");
    }

    private static AiProviderException providerFailure(RestClientResponseException exception) {
        return switch (exception.getStatusCode().value()) {
            case 401, 403 -> new AiProviderException("A API Key do RunPod é inválida ou não tem permissão.", exception);
            case 404 -> new AiProviderException("O Endpoint ID do RunPod não foi encontrado.", exception);
            case 429 -> new AiProviderException("O RunPod limitou temporariamente as requisições.", exception);
            default -> new AiProviderException("O RunPod recusou a requisição (HTTP "
                    + exception.getStatusCode().value() + ").", exception);
        };
    }
}
