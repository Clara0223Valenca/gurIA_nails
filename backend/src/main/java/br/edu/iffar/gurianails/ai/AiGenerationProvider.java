package br.edu.iffar.gurianails.ai;

import java.util.List;
import java.util.Map;

public interface AiGenerationProvider {
    boolean available();
    String providerName();
    String modelName();
    List<String> generate(AiRequest request, boolean improve, String systemNegativePrompt);
}
