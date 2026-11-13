package br.edu.iffar.gurianails.ai;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class RunpodAiGenerationProviderTest {
    @Test
    void alwaysAddsTheHiddenPrintableDecalContract() {
        AiRequest request = new AiRequest(
                "gato usando óculos",
                1,
                "Oval",
                "Anelar direito",
                10.0,
                14.0,
                "transparent",
                null);

        String prompt = RunpodAiGenerationProvider.buildPrompt(request);

        assertTrue(prompt.contains("print-ready nail sticker/decal artwork"));
        assertTrue(prompt.contains("flat 2D graphic"));
        assertTrue(prompt.contains("Never show hands, fingers, fingernails"));
        assertTrue(prompt.contains("glitter, highlights, surrounding shadows"));
        assertTrue(prompt.contains("reflections, depth or perspective"));
        assertTrue(prompt.endsWith("gato usando óculos"));
        assertTrue(prompt.length() <= 1200);
    }

    @Test
    void removesTheLoraTriggerUntilTheLoraIsEnabled() {
        AiRequest request = new AiRequest(
                "naildecalstyle flores azuis",
                1,
                null,
                null,
                null,
                null,
                null,
                null);

        String prompt = RunpodAiGenerationProvider.buildPrompt(request);

        assertFalse(prompt.toLowerCase().contains("naildecalstyle"));
        assertTrue(prompt.endsWith("flores azuis"));
    }
}
