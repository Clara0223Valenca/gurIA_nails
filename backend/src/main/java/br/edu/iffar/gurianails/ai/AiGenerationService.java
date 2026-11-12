package br.edu.iffar.gurianails.ai;

import br.edu.iffar.gurianails.event.EventSessionService;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AiGenerationService {
    private static final String NEGATIVE_PROMPT = "3D, fotografia, mockup, mão, pessoa, pele, salão, cenário, texto, marca-d’água, moldura, perspectiva, objetos fora da unha";
    private final AiGenerationProvider provider;
    private final AiGenerationRepository generations;
    private final EventSessionService sessions;

    public AiGenerationService(AiGenerationProvider provider, AiGenerationRepository generations, EventSessionService sessions) {
        this.provider = provider;
        this.generations = generations;
        this.sessions = sessions;
    }

    public List<String> run(AiRequest request, boolean improve, String sessionId) {
        String operation = improve ? "IMPROVE" : "GENERATE";
        String prompt = request.prompt() == null ? "" : request.prompt().strip();
        if (!provider.available()) throw new AiUnavailableException("Provider de IA não configurado.");
        int requestedUnits = improve ? 1 : request.quantity() == null ? 1 : Math.min(4, request.quantity());
        sessions.reserveAiGenerations(sessionId, requestedUnits);
        try {
            List<String> images = provider.generate(request, improve, NEGATIVE_PROMPT);
            generations.save(new AiGenerationEntity(sessionId, operation, provider.providerName(), provider.modelName(), prompt, "SUCCEEDED", images.size(), null));
            return images;
        } catch (RuntimeException exception) {
            String errorCode = exception instanceof AiProviderException ? "PROVIDER_ERROR" : "GENERATION_ERROR";
            generations.save(new AiGenerationEntity(sessionId, operation, provider.providerName(), provider.modelName(), prompt, "FAILED", 0, errorCode));
            throw exception;
        }
    }
}
