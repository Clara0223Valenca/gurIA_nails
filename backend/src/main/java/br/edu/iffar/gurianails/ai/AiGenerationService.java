package br.edu.iffar.gurianails.ai;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AiGenerationService {
    private static final String NEGATIVE_PROMPT = "3D, fotografia, mockup, mão, pessoa, pele, salão, cenário, texto, marca-d’água, moldura, perspectiva, objetos fora da unha";
    private final AiGenerationProvider provider;
    private final AiGenerationRepository generations;

    public AiGenerationService(AiGenerationProvider provider, AiGenerationRepository generations) {
        this.provider = provider;
        this.generations = generations;
    }

    public List<String> run(AiRequest request, boolean improve) {
        String operation = improve ? "IMPROVE" : "GENERATE";
        String prompt = request.prompt() == null ? "" : request.prompt().strip();
        if (!provider.available()) throw new AiUnavailableException("Provider de IA não configurado.");
        try {
            List<String> images = provider.generate(request, improve, NEGATIVE_PROMPT);
            generations.save(new AiGenerationEntity(operation, provider.providerName(), provider.modelName(), prompt, "SUCCEEDED", images.size(), null));
            return images;
        } catch (RuntimeException exception) {
            String errorCode = exception instanceof AiProviderException ? "PROVIDER_ERROR" : "GENERATION_ERROR";
            generations.save(new AiGenerationEntity(operation, provider.providerName(), provider.modelName(), prompt, "FAILED", 0, errorCode));
            throw exception;
        }
    }
}
