package br.edu.iffar.gurianails.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import br.edu.iffar.gurianails.event.EventSessionService;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class AiGenerationServiceTest {
    private static final String RESULT = "data:image/png;base64,aGVsbG8=";

    @Test
    void addsServerOwnedNailArtRestrictionsAndStoresActualProviderResult() {
        List<AiGenerationEntity> saved = new ArrayList<>();
        RecordingProvider provider = new RecordingProvider(true, List.of(RESULT));

        List<String> results = new AiGenerationService(provider, recordingRepository(saved), mock(EventSessionService.class))
                .run(new AiRequest("flores rosadas", 1, "Oval", "Anelar direito", 10.0, 14.0, "transparent", null), false, "session-test");

        assertEquals(List.of(RESULT), results);
        assertTrue(provider.called);
        assertEquals("flores rosadas", provider.request.prompt());
        assertTrue(provider.negativePrompt.contains("fotografia"));
        assertTrue(provider.negativePrompt.contains("perspectiva"));
        assertEquals(1, saved.size());
    }

    @Test
    void neverInventsAResultWhenProviderIsNotConfigured() {
        List<AiGenerationEntity> saved = new ArrayList<>();
        RecordingProvider provider = new RecordingProvider(false, List.of());

        AiUnavailableException error = assertThrows(AiUnavailableException.class, () ->
                new AiGenerationService(provider, recordingRepository(saved), mock(EventSessionService.class))
                        .run(new AiRequest("flores", 1, "Oval", "Anelar", 10.0, 14.0, "transparent", null), false, "session-test"));

        assertEquals("Provider de IA não configurado.", error.getMessage());
        assertFalse(provider.called);
        assertTrue(saved.isEmpty());
    }

    @Test
    void refundsTheReservedQuotaWhenTheProviderFails() {
        EventSessionService sessions = mock(EventSessionService.class);
        RecordingProvider provider = new RecordingProvider(true, List.of());
        provider.failure = new AiProviderException("falha no worker");

        assertThrows(AiProviderException.class, () ->
                new AiGenerationService(provider, recordingRepository(new ArrayList<>()), sessions)
                        .run(new AiRequest("flores", 2, "Oval", "Anelar", 10.0, 14.0, "transparent", null), false, "session-test"));

        verify(sessions).refundAiGenerations("session-test", 2);
    }

    private static AiGenerationRepository recordingRepository(List<AiGenerationEntity> saved) {
        return (AiGenerationRepository) Proxy.newProxyInstance(
                AiGenerationRepository.class.getClassLoader(),
                new Class<?>[] { AiGenerationRepository.class },
                (proxy, method, arguments) -> {
                    if (method.getName().equals("save") && arguments != null && arguments.length == 1) {
                        AiGenerationEntity entity = (AiGenerationEntity) arguments[0];
                        saved.add(entity);
                        return entity;
                    }
                    return null;
                });
    }

    private static final class RecordingProvider implements AiGenerationProvider {
        private final boolean available;
        private final List<String> results;
        private boolean called;
        private String negativePrompt;
        private AiRequest request;
        private RuntimeException failure;

        private RecordingProvider(boolean available, List<String> results) {
            this.available = available;
            this.results = results;
        }

        @Override public boolean available() { return available; }
        @Override public String providerName() { return "Provider de teste"; }
        @Override public String modelName() { return "model-test"; }

        @Override
        public List<String> generate(AiRequest request, boolean improve, String negativePrompt) {
            this.called = true;
            this.request = request;
            this.negativePrompt = negativePrompt;
            if (failure != null) throw failure;
            return results;
        }
    }
}
